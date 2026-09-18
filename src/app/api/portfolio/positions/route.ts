import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import Position from '@/models/Position';
import User from '@/models/User';

import { evaluatePendingOrders } from '@/lib/services/evaluator';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Evaluate pending limit orders lazily
    await evaluatePendingOrders(session.user.id);
    
    const user = await User.findById(session.user.id).select('balance name email');
    const positions = await Position.find({ user: session.user.id });

    return NextResponse.json({
        user: {
            balance: user?.balance,
            name: user?.name,
        },
        positions 
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Failed to fetch positions', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { positionId, stopLoss, target } = body;

    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find the position and ensure it belongs to the user
    const position = await Position.findOne({ _id: positionId, user: session.user.id });
    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    // Update SL/Target (allow null/undefined to clear them)
    if (stopLoss !== undefined) position.stopLoss = stopLoss;
    if (target !== undefined) position.target = target;
    
    await position.save();

    return NextResponse.json({ message: 'Position updated successfully', position });
  } catch (error: any) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: 'Failed to update position', details: error.message }, { status: 500 });
  }
}

