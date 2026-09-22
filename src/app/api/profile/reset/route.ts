import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Position from '@/models/Position';
import Order from '@/models/Order';
import Transaction, { TransactionType } from '@/models/Transaction';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required to reset account' }, { status: 400 });
    }

    await connectToDatabase();
    
    // 1. Verify user password
    // Need to explicitly select password since it might be unselected by default in some configurations
    const user = await User.findById(session.user.id).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
        // If OAuth user (no password), we might just allow it or require a different mechanism.
        // Assuming credentials user here.
        return NextResponse.json({ error: 'Password reset not available for this account type' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // 2. Perform Reset Operations
    const userId = user._id;

    // Delete all user data
    await Position.deleteMany({ user: userId });
    await Order.deleteMany({ user: userId });
    await Transaction.deleteMany({ user: userId });

    // Reset user balance to default (10 Lakhs)
    const DEFAULT_BALANCE = 1000000;
    user.balance = DEFAULT_BALANCE;
    await user.save();

    // Optionally log an initial transaction
    await Transaction.create({
      user: userId,
      type: TransactionType.DEPOSIT,
      amount: DEFAULT_BALANCE,
      description: 'Account Reset - Initial Virtual Funds',
      balanceAfter: DEFAULT_BALANCE,
    });

    return NextResponse.json({ success: true, message: 'Account successfully reset' });

  } catch (error: any) {
    console.error('Error resetting account:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
