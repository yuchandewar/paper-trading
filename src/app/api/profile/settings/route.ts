import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

// GET user settings
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const user = await User.findById(session.user.id).select('name email avatar brokeragePlan createdAt');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT to update user settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, avatar, brokeragePlan } = await request.json();

    await connectToDatabase();
    
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (brokeragePlan && ['ZERO_FEE', 'FLAT_20'].includes(brokeragePlan)) {
      user.brokeragePlan = brokeragePlan;
    }

    await user.save();

    return NextResponse.json({ success: true, user: { name: user.name, avatar: user.avatar, brokeragePlan: user.brokeragePlan } });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
