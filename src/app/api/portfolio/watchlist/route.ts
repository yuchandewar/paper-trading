import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ watchlist: user.watchlist });
  } catch (error: any) {
    console.error("Watchlist GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!Array.isArray(body.watchlist)) {
      return NextResponse.json({ error: "Invalid watchlist format" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Optional: filter unique values and limit to e.g. 50 items to prevent abuse
    const uniqueWatchlist = Array.from(new Set(body.watchlist)).slice(0, 50);

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { watchlist: uniqueWatchlist } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ watchlist: user.watchlist });
  } catch (error: any) {
    console.error("Watchlist PUT Error:", error);
    return NextResponse.json({ error: "Failed to update watchlist" }, { status: 500 });
  }
}
