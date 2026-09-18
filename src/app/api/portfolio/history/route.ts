import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import Order from '@/models/Order';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch last 50 orders
    const orders = await Order.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching order history:', error);
    return NextResponse.json({ error: 'Failed to fetch order history', details: error.message }, { status: 500 });
  }
}
