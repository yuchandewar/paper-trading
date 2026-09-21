import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/shared/LogoutButton";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongoose";

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
  const balance = user?.balance || 0;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <nav className="bg-white border-b border-gray-200 flex-none">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12">
            <div className="flex items-center space-x-8">
              <div className="text-lg font-bold text-indigo-600">
                PaperTrade Pro
              </div>
              <div className="flex space-x-4 sm:space-x-8 h-full items-center">
                <Link
                  href="/dashboard"
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/portfolio"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 border-b-2 text-sm font-medium"
                >
                  Portfolio
                </Link>
              </div>
            </div>
            {/* Navbar Right */}
            <div className="flex items-center space-x-4 sm:space-x-6 h-full">
              <div className="text-xs sm:text-sm font-medium">
                <span className="hidden sm:inline text-gray-500 mr-2">Margin:</span>
                <span className="text-gray-900">₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <LogoutButton />
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
