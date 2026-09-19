import Order, { OrderStatus, TradeType } from '@/models/Order';
import Position from '@/models/Position';
import User from '@/models/User';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export async function evaluatePendingOrders(userId: string) {
  try {
    const pendingOrders = await Order.find({ user: userId, status: OrderStatus.PENDING });
    if (pendingOrders.length === 0) return;

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
          // Execute the order (similar logic to place/route.ts but simpler for this mock)
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
  } catch (error) {
    console.error("Error in evaluator:", error);
  }
}
