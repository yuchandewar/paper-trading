"use client";

import { useState, useEffect } from "react";
import { User, Wallet, History, Settings, TrendingDown, TrendingUp, Plus, Minus } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wallet modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletAction, setWalletAction] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [userRes, txRes] = await Promise.all([
        fetch("/api/profile/settings"),
        fetch("/api/profile/transactions")
      ]);
      const userData = await userRes.json();
      const txData = await txRes.json();
      if (userData.user) setUser(userData.user);
      if (txData.transactions) setTransactions(txData.transactions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWalletAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProcessing(true);
    try {
      const res = await fetch("/api/profile/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: walletAction, amount: parseFloat(amount) })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setShowWalletModal(false);
      setAmount("");
      fetchData(); // refresh all data
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateBrokerage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value;
    try {
      await fetch("/api/profile/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokeragePlan: newPlan })
      });
      setUser({ ...user, brokeragePlan: newPlan });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 space-y-6 pb-20">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-teal-50 border-4 border-teal-100 flex items-center justify-center text-teal-600">
           {/* Simple initials avatar */}
           <span className="text-3xl font-bold">{user?.name?.substring(0, 2).toUpperCase() || 'TR'}</span>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-gray-500">{user?.email}</p>
          <div className="mt-4 inline-flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs font-medium text-gray-600">Active TradeNow Account</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Settings & Wallet) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Wallet Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center gap-2">
               <Wallet className="w-5 h-5 text-gray-500" />
               <h2 className="font-bold text-gray-800">Wallet Management</h2>
            </div>
            <div className="p-6 text-center">
               <div className="text-sm text-gray-500 mb-1">Available Margin</div>
               <div className="text-3xl font-bold text-gray-900 mb-6">
                  {/* Balance is fetched globally in layout, but we can show it here if we fetched it, or just use transaction history. Wait, we didn't fetch balance in /settings. Let's just say "Manage Funds" */}
                  Manage Funds
               </div>
               <div className="flex gap-3">
                 <button 
                   onClick={() => { setWalletAction("DEPOSIT"); setShowWalletModal(true); }}
                   className="flex-1 flex items-center justify-center gap-1 bg-[#00d09c] hover:bg-teal-500 text-white py-2 rounded-lg font-semibold transition-colors"
                 >
                   <Plus className="w-4 h-4" /> Add
                 </button>
                 <button 
                   onClick={() => { setWalletAction("WITHDRAWAL"); setShowWalletModal(true); }}
                   className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2 rounded-lg font-semibold transition-colors"
                 >
                   <Minus className="w-4 h-4" /> Withdraw
                 </button>
               </div>
            </div>
          </div>

          {/* Brokerage Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center gap-2">
               <Settings className="w-5 h-5 text-gray-500" />
               <h2 className="font-bold text-gray-800">Account Settings</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Brokerage Plan</label>
              <select 
                value={user?.brokeragePlan || "FLAT_20"}
                onChange={handleUpdateBrokerage}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#00d09c]"
              >
                <option value="FLAT_20">TradeNow Pro (₹20/trade)</option>
                <option value="ZERO_FEE">TradeNow Free (Zero Brokerage)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Simulate different broker environments. Flat ₹20 deducts virtual fees per executed order.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Transactions) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="p-4 border-b border-gray-50 flex items-center gap-2">
               <History className="w-5 h-5 text-gray-500" />
               <h2 className="font-bold text-gray-800">Passbook & Ledger</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx: any) => (
                      <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                            tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-700' :
                            tx.type === 'WITHDRAWAL' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${
                          tx.type === 'DEPOSIT' ? 'text-[#00d09c]' : 'text-gray-900'
                        }`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">
                {walletAction === "DEPOSIT" ? "Add Funds" : "Withdraw Funds"}
              </h3>
            </div>
            <form onSubmit={handleWalletAction} className="p-4 space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#00d09c]"
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processing}
                  className={`flex-1 text-white py-2 rounded-lg font-semibold transition-colors ${processing ? 'bg-teal-300' : 'bg-[#00d09c] hover:bg-teal-500'}`}
                >
                  {processing ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
