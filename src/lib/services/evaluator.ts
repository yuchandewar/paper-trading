import Order, { OrderStatus, TradeType } from '@/models/Order';
import Position from '@/models/Position';
import User from '@/models/User';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

const calcTriggerPrice = (pos: any, isSl: boolean) => {
  const config = isSl ? pos.stopLoss : pos.target;
  if (!config || !config.value) return null;
  const isBuy = pos.netQuantity > 0;
  const avg = pos.averagePrice;
  const val = config.value;
  
  if (config.type === 'VALUE') {
    return isBuy 
      ? (isSl ? avg - val : avg + val)
      : (isSl ? avg + val : avg - val);
  } else { // PERCENTAGE
    const offset = avg * (val / 100);
    return isBuy 
      ? (isSl ? avg - offset : avg + offset)
      : (isSl ? avg + offset : avg - offset);
  }
};

export async function evaluatePendingOrders(userId: string) {
  try {
    // 1. Evaluate pending limit orders
    const pendingOrders = await Order.find({ user: userId, status: OrderStatus.PENDING });
    for (const order of pendingOrders) {
      try {
        const quote = await yahooFinance.quote(order.ticker);
        const currentPrice = quote.regularMarketPrice;
        if (!currentPrice) continue;

        let execute = false;
        if (order.type === TradeType.BUY && currentPrice <= order.price!) {
          execute = true;
        } else if (order.type === TradeType.SELL && currentPrice >= order.price!) {
          execute = true;
        }

        if (execute) {
          const user = await User.findById(userId);
          if (!user) continue;

          let position = await Position.findOne({ user: userId, ticker: order.ticker, product: order.product });
          const isBuy = order.type === TradeType.BUY;
          
          if (!position) {
            position = new Position({
              user: userId,
              ticker: order.ticker,
              product: order.product,
              netQuantity: isBuy ? order.quantity : -order.quantity,
              averagePrice: order.price,
              realizedPnL: 0,
            });
          } else {
             const currentNetQty = position.netQuantity;
             let isClosingTrade = false;
             if ((isBuy && currentNetQty < 0) || (!isBuy && currentNetQty > 0)) {
                isClosingTrade = true;
             }

             if (isClosingTrade) {
                 const closedQty = Math.min(Math.abs(currentNetQty), order.quantity);
                 const pnlPerShare = isBuy ? (position.averagePrice - order.price!) : (order.price! - position.averagePrice);
                 const realizedPnL = closedQty * pnlPerShare;
                 position.realizedPnL += realizedPnL;
                 user.balance += realizedPnL;
             }

             if (!isClosingTrade) {
                const totalQty = Math.abs(currentNetQty) + order.quantity;
                const totalCost = (Math.abs(currentNetQty) * position.averagePrice) + (order.quantity * order.price!);
                position.averagePrice = totalCost / totalQty;
             }
             
             position.netQuantity += isBuy ? order.quantity : -order.quantity;
          }

          await position.save();
          await user.save();
          
          order.status = OrderStatus.EXECUTED;
          order.executionPrice = order.price;
          await order.save();
        }
      } catch (e) {
        console.error(`Error evaluating order ${order._id}:`, e);
      }
    }

    // 2. Evaluate active positions for SL/Target hits
    const activePositions = await Position.find({ user: userId, netQuantity: { $ne: 0 } });
    for (const pos of activePositions) {
      if (!pos.stopLoss && !pos.target && !pos.autoExitAt) continue;

      try {
        const quote = await yahooFinance.quote(pos.ticker);
        const currentPrice = quote.regularMarketPrice;
        if (!currentPrice) continue;

        const isBuy = pos.netQuantity > 0;
        let executePrice = null;
        let triggerReason = "";

        // Check SL
        const slPrice = calcTriggerPrice(pos, true);
        if (slPrice !== null) {
          if ((isBuy && currentPrice <= slPrice) || (!isBuy && currentPrice >= slPrice)) {
            executePrice = currentPrice; // Market exit
            triggerReason = "STOPLOSS";
          }
        }

        // Check Target
        if (executePrice === null) {
          const tgtPrice = calcTriggerPrice(pos, false);
          if (tgtPrice !== null) {
            if ((isBuy && currentPrice >= tgtPrice) || (!isBuy && currentPrice <= tgtPrice)) {
              executePrice = currentPrice;
              triggerReason = "TARGET";
            }
          }
        }

        // Check Time-based Auto Exit
        if (executePrice === null && pos.autoExitAt) {
          if (new Date() >= pos.autoExitAt) {
            executePrice = currentPrice;
            triggerReason = "TIME_LIMIT";
          }
        }

        if (executePrice !== null) {
          // Execute exit
          const user = await User.findById(userId);
          if (!user) continue;
          
          const exitQuantity = Math.abs(pos.netQuantity);
          const pnlPerShare = isBuy ? (executePrice - pos.averagePrice) : (pos.averagePrice - executePrice);
          const realizedPnL = exitQuantity * pnlPerShare;
          
          const leverage = pos.product === 'MIS' ? 5 : 1;
          const releasedMargin = (exitQuantity * pos.averagePrice) / leverage;
          
          let brokerageFee = 0;
          if (user.brokeragePlan === 'FLAT_20') brokerageFee = 20;

          pos.realizedPnL += realizedPnL;
          user.balance += (realizedPnL + releasedMargin - brokerageFee);
          pos.netQuantity = 0; // Completely exit
          pos.stopLoss = undefined; // Clear SL/TGT
          pos.target = undefined;
          
          await pos.save();
          await user.save();
          
          if (brokerageFee > 0) {
              const { default: Transaction, TransactionType } = await import('@/models/Transaction');
              await Transaction.create({
                  user: user._id,
                  type: TransactionType.BROKERAGE,
                  amount: brokerageFee,
                  description: `Brokerage fee for auto-exit of ${pos.ticker}`,
                  balanceAfter: user.balance,
              });
          }
          
          // Log an exit order for history
          const exitOrder = new Order({
            user: userId,
            ticker: pos.ticker,
            type: isBuy ? TradeType.SELL : TradeType.BUY,
            product: pos.product,
            orderType: "MARKET",
            quantity: exitQuantity,
            price: executePrice,
            executionPrice: executePrice,
            status: OrderStatus.EXECUTED,
            brokeragePaid: brokerageFee,
          });
          await exitOrder.save();
          
          console.log(`Closed position ${pos.ticker} due to ${triggerReason} hit at ${executePrice}`);
        }

      } catch (e) {
        console.error(`Error evaluating position SL/TGT for ${pos._id}:`, e);
      }
    }

  } catch (error) {
    console.error("Error in evaluator:", error);
  }
}
