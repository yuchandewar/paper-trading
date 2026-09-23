import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/shared/LogoutButton";
import User from "@/models/User";
import Position from "@/models/Position";
import connectToDatabase from "@/lib/mongoose";
import yahooFinanceStatic from 'yahoo-finance2';

const YahooFinanceClass = (yahooFinanceStatic as any).default || yahooFinanceStatic;
const yahooFinance = new (YahooFinanceClass as any)();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).select("balance");
  const availableMargin = user?.balance || 0;

  // Calculate invested margin and Live PnL
  const activePositions = await Position.find({ user: session.user.id, netQuantity: { $ne: 0 } });
  
  let investedMargin = 0;
  let liveUnrealizedPnL = 0;
  
  for (const pos of activePositions) {
    const margin = (pos.averagePrice * Math.abs(pos.netQuantity)) / (pos.product === 'MIS' ? 5 : 1);
    investedMargin += margin;
    
    try {
      const quote = await yahooFinance.quote(pos.ticker);
      const currentPrice = quote.regularMarketPrice;
      if (currentPrice) {
        const isBuy = pos.netQuantity > 0;
        const pnlPerShare = isBuy ? (currentPrice - pos.averagePrice) : (pos.averagePrice - currentPrice);
        liveUnrealizedPnL += (pnlPerShare * Math.abs(pos.netQuantity));
      }
    } catch (e) {
      console.error("Failed to fetch quote for", pos.ticker);
    }
  }
  
  // Calculate Today's Realized PnL (from positions modified today)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const updatedPositions = await Position.find({ 
    user: session.user.id, 
    updatedAt: { $gte: startOfDay } 
  });
  
  let todayRealizedPnL = 0;
  for (const pos of updatedPositions) {
    todayRealizedPnL += pos.realizedPnL;
  }
  
  const totalPnL = liveUnrealizedPnL + todayRealizedPnL;
  const totalBalance = availableMargin + investedMargin;

  return (
    <div className="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden font-sans">
      <nav className="bg-white border-b border-gray-200 flex-none sticky top-0 z-50">
        <div className="px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-0">
            {/* Top Row: Logo & Links */}
            <div className="flex items-center justify-between w-full sm:w-auto space-x-4 sm:space-x-8">
              <div className="text-xl sm:text-2xl font-extrabold text-[#00d09c] tracking-tight">
                TradeNow
              </div>
              <div className="flex space-x-4 sm:space-x-6 h-full items-center">
                <Link
                  href="/dashboard"
                  className="text-gray-800 hover:text-[#00d09c] inline-flex items-center py-1 sm:py-5 border-b-2 border-transparent hover:border-[#00d09c] text-xs sm:text-sm font-medium transition-colors"
                >
                  Explore
                </Link>
                <Link
                  href="/dashboard/heatmap"
                  className="text-gray-800 hover:text-[#00d09c] inline-flex items-center py-1 sm:py-5 border-b-2 border-transparent hover:border-[#00d09c] text-xs sm:text-sm font-medium transition-colors"
                >
                  Heatmap
                </Link>
                <Link
                  href="/dashboard/portfolio"
                  className="text-gray-800 hover:text-[#00d09c] inline-flex items-center py-1 sm:py-5 border-b-2 border-transparent hover:border-[#00d09c] text-xs sm:text-sm font-medium transition-colors"
                >
                  Investments
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="text-gray-800 hover:text-[#00d09c] inline-flex items-center py-1 sm:py-5 border-b-2 border-transparent hover:border-[#00d09c] text-xs sm:text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
              </div>
              <div className="sm:hidden block">
                <LogoutButton />
              </div>
            </div>
            
            {/* Bottom Row (Mobile) / Right Side (Desktop): Stats & Logout */}
            <div className="flex items-center space-x-2 sm:space-x-6 w-full sm:w-auto">
              <div className="flex flex-1 sm:flex-none overflow-x-auto hide-scrollbar space-x-3 sm:space-x-4 text-xs sm:text-sm font-medium items-center bg-gray-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-gray-100 whitespace-nowrap">
                <div>
                  <span className="text-gray-500 mr-1">Day PnL:</span>
                  <span className={`font-bold ${totalPnL > 0 ? 'text-[#00d09c]' : totalPnL < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                    {totalPnL > 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-gray-300">|</div>
                <div>
                  <span className="text-gray-500 mr-1">Bal:</span>
                  <span className="text-gray-900">₹{totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-gray-300">|</div>
                <div>
                  <span className="text-gray-500 mr-1">Margin:</span>
                  <span className="text-gray-900">₹{availableMargin.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 w-full flex flex-col overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
