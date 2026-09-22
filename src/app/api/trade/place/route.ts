import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Order, { OrderStatus, OrderType, ProductType, TradeType } from '@/models/Order';
import Position from '@/models/Position';
import Transaction, { TransactionType } from '@/models/Transaction';
import yahooFinanceStatic from 'yahoo-finance2';
const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

const LEVERAGE_MIS = 5; // 5x leverage for Intraday
const LEVERAGE_CNC = 1; // 1x leverage for Delivery

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticker, type, product, orderType, quantity, price, stopLoss, target, autoExitMinutes } = body;

    let autoExitAt: Date | undefined = undefined;
    if (autoExitMinutes && typeof autoExitMinutes === 'number' && autoExitMinutes > 0) {
      autoExitAt = new Date(Date.now() + autoExitMinutes * 60000);
    }

    if (!ticker || !type || !product || !orderType || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid order parameters' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate Brokerage
    let brokerageFee = 0;
    if (user.brokeragePlan === 'FLAT_20') {
        brokerageFee = 20;
    }

    // 1. Fetch real-time price
    let currentPrice = price;
    if (orderType === OrderType.MARKET) {
      const quote = await yahooFinance.quote(ticker);
      currentPrice = quote.regularMarketPrice;
      if (!currentPrice) {
        return NextResponse.json({ error: 'Could not fetch current market price' }, { status: 500 });
      }
    }

    const totalValue = currentPrice * quantity;
    const leverage = product === ProductType.MIS ? LEVERAGE_MIS : LEVERAGE_CNC;
    const requiredMargin = totalValue / leverage;

    // Find existing position for this ticker & product
    let position = await Position.findOne({ user: user._id, ticker, product });
    
    const isBuy = type === TradeType.BUY;
    let realizedPnL = 0;
    
    // 2. Check if this is a closing trade or an opening trade
    const currentNetQty = position ? position.netQuantity : 0;
    
    let isClosingTrade = false;
    if ((isBuy && currentNetQty < 0) || (!isBuy && currentNetQty > 0)) {
       isClosingTrade = true;
    }

    // If it's a new position or adding to existing, check margin
    if (!isClosingTrade || Math.abs(quantity) > Math.abs(currentNetQty)) {
       const qtyToOpen = isClosingTrade ? quantity - Math.abs(currentNetQty) : quantity;
       const marginNeeded = (qtyToOpen * currentPrice) / leverage + brokerageFee;
       if (user.balance < marginNeeded) {
           return NextResponse.json({ error: 'Insufficient margin including brokerage' }, { status: 400 });
       }
    }

    // 3. Handle Limit Orders
    if (orderType === OrderType.LIMIT) {
       // ... existing limit logic ...
       // (Not modifying limit logic right now for SL/target, keeping it simple for market)
       if (!isClosingTrade || Math.abs(quantity) > Math.abs(currentNetQty)) {
           const qtyToOpen = isClosingTrade ? quantity - Math.abs(currentNetQty) : quantity;
           const marginNeeded = (qtyToOpen * price) / leverage;
           if (user.balance < marginNeeded) {
               return NextResponse.json({ error: 'Insufficient margin for limit order' }, { status: 400 });
           }
           user.balance -= marginNeeded;
       }
       
       await user.save();
       
       const order = new Order({
           user: user._id,
           ticker,
           type,
           product,
           orderType,
           quantity,
           price: price,
           status: OrderStatus.PENDING,
           marginBlocked: !isClosingTrade ? requiredMargin : 0,
       });
       await order.save();

       return NextResponse.json({ message: 'Limit order placed successfully', order, userBalance: user.balance });
    }

    // 4. Update or Create Position (for MARKET orders)
    let originalAveragePrice = 0;
    if (position) {
       originalAveragePrice = position.averagePrice;
       
       if (isClosingTrade) {
           const closedQty = Math.min(Math.abs(currentNetQty), quantity);
           const pnlPerShare = isBuy ? (originalAveragePrice - currentPrice) : (currentPrice - originalAveragePrice);
           realizedPnL = closedQty * pnlPerShare;
           position.realizedPnL += realizedPnL;
           user.balance += realizedPnL;
       }
       
       if (!isClosingTrade) {
          const totalQty = Math.abs(currentNetQty) + quantity;
          const totalCost = (Math.abs(currentNetQty) * originalAveragePrice) + (quantity * currentPrice);
          position.averagePrice = totalCost / totalQty;
       } else if (Math.abs(quantity) > Math.abs(currentNetQty)) {
          position.averagePrice = currentPrice;
       } else if (Math.abs(quantity) === Math.abs(currentNetQty)) {
          position.averagePrice = 0;
       }

       position.netQuantity += isBuy ? quantity : -quantity;
       
       // Update SL and Target if provided
       if (stopLoss) position.stopLoss = stopLoss;
       if (target) position.target = target;
       if (autoExitAt) position.autoExitAt = autoExitAt;
       
       await position.save();
    } else {
       position = new Position({
           user: user._id,
           ticker,
           product,
           netQuantity: isBuy ? quantity : -quantity,
           averagePrice: currentPrice,
           realizedPnL: 0,
           stopLoss,
           target,
           autoExitAt
       });
       await position.save();
    }

    // 4. Update Margin (Balance)
    if (!isClosingTrade) {
        user.balance -= (requiredMargin + brokerageFee);
    } else {
        // Release margin for closed portion
        const closedQty = Math.min(Math.abs(currentNetQty), quantity);
        const marginReleased = (closedQty * originalAveragePrice) / leverage;
        user.balance += marginReleased;
        
        // If they reversed and went the other way (e.g. had 10, sold 15 -> -5)
        if (Math.abs(quantity) > Math.abs(currentNetQty)) {
            const newQty = Math.abs(quantity) - Math.abs(currentNetQty);
            const marginNeeded = (newQty * currentPrice) / leverage;
            user.balance -= marginNeeded;
        }
        
        // Deduct brokerage even if closing
        user.balance -= brokerageFee;
    }

    await user.save();

    if (brokerageFee > 0) {
        await Transaction.create({
            user: user._id,
            type: TransactionType.BROKERAGE,
            amount: brokerageFee,
            description: `Brokerage fee for ${type} ${quantity} ${ticker}`,
            balanceAfter: user.balance,
        });
    }

    // 5. Create Order Record
    const order = new Order({
        user: user._id,
        ticker,
        type,
        product,
        orderType,
        quantity,
        price: currentPrice,
        executionPrice: currentPrice,
        status: OrderStatus.EXECUTED,
        marginBlocked: requiredMargin,
        brokeragePaid: brokerageFee,
    });
    await order.save();

    return NextResponse.json({ message: 'Order executed successfully', order, position, userBalance: user.balance });
  } catch (error: any) {
    console.error('Order Execution Error:', error);
    return NextResponse.json({ error: 'Order execution failed', details: error.message }, { status: 500 });
  }
}

