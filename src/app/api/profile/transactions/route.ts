import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Transaction, { TransactionType } from '@/models/Transaction';

// GET all transactions for the user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch transactions sorted by newest first
    const transactions = await Transaction.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 for performance

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST a new deposit or withdrawal
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, amount } = await request.json();

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid type or amount' }, { status: 400 });
    }

    if (type !== 'DEPOSIT' && type !== 'WITHDRAWAL') {
       return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    await connectToDatabase();
    
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (type === 'WITHDRAWAL' && user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Process transaction
    const newBalance = type === 'DEPOSIT' ? user.balance + amount : user.balance - amount;
    user.balance = newBalance;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      type: type as TransactionType,
      amount: amount,
      description: type === 'DEPOSIT' ? 'Added funds to wallet' : 'Withdrew funds from wallet',
      balanceAfter: newBalance,
    });

    return NextResponse.json({ success: true, balance: newBalance, transaction });
  } catch (error: any) {
    console.error('Error processing transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
