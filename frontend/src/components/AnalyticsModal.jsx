import { useState, useEffect } from "react";
import { X, BarChart3, Zap, Coins, TrendingUp, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { getAnalytics } from "../features/analytics.api";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalyticsModal({ isOpen, onClose }) {
  const { userData } = useSelector((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const res = await getAnalytics();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error("Fetch analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalyticsData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const agentConfig = [
    { key: "chat", label: "Chat Agent", icon: "💬", color: "from-blue-500 to-indigo-600" },
    { key: "coding", label: "Coding Agent", icon: "💻", color: "from-violet-500 to-purple-600" },
    { key: "search", label: "Web Search", icon: "🌐", color: "from-cyan-500 to-blue-600" },
    { key: "pdf", label: "PDF Generator", icon: "📄", color: "from-rose-500 to-pink-600" },
    { key: "ppt", label: "PPT Generator", icon: "📊", color: "from-amber-500 to-orange-600" },
    { key: "image", label: "Image Gen", icon: "🖼️", color: "from-emerald-500 to-teal-600" },
    { key: "vision", label: "Vision Agent", icon: "👁️", color: "from-fuchsia-500 to-pink-600" },
    { key: "pdf_rag", label: "PDF RAG", icon: "🔍", color: "from-sky-500 to-indigo-600" }
  ];

  const totalCredits = userData?.totalCredits || 100;
  const availableCredits = userData?.credits ?? 0;
  const usedCredits = Math.max(0, totalCredits - availableCredits);
  const usagePercentage = Math.min(100, Math.round((usedCredits / (totalCredits || 1)) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl max-h-[90vh] bg-[#0f1117] border border-white/[0.08] rounded-2xl flex flex-col text-slate-200 shadow-2xl overflow-hidden"
        >
          {/* Top Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">Usage & Token Analytics</h2>
                <p className="text-xs text-slate-400">Real-time credit consumption, agent usage & billing history</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Overview Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Available Credits */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Available Credits</span>
                  <Coins size={16} className="text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{availableCredits}</span>
                  <span className="text-xs text-slate-500">/ {totalCredits} total</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${100 - usagePercentage}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Plan Limit Status */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Active Subscription</span>
                  <Zap size={16} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white uppercase tracking-wide">
                    {userData?.plan || "Free Plan"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan resets monthly • Rate limit active
                </p>
              </div>

              {/* Card 3: Total Credits Spent */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Total Credits Used</span>
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {data?.totalCreditsSpent || usedCredits}
                  </span>
                  <span className="text-xs text-slate-500">credits</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Tracked across all agent invocations</p>
              </div>
            </div>

            {/* Agent Credit Consumption Breakdown Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Credit Usage Breakdown by Agent
                </h3>
                {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {agentConfig.map((agent) => {
                  const spent = data?.usageByAgent?.[agent.key] || 0;
                  const totalSpent = data?.totalCreditsSpent || 1;
                  const pct = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

                  return (
                    <div
                      key={agent.key}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{agent.icon}</span>
                        <span className="text-xs font-bold text-slate-200">{spent} CR</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-300 truncate">{agent.label}</p>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full bg-gradient-to-r ${agent.color} rounded-full`}
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Billing Transactions Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recent Billing Transactions
              </h3>

              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
                {loading ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                    Loading transaction records...
                  </div>
                ) : !data?.transactions || data.transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No billing transactions recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/[0.03] text-slate-400 font-medium border-b border-white/[0.08]">
                        <tr>
                          <th className="px-4 py-2.5">Order ID</th>
                          <th className="px-4 py-2.5">Plan</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Credits</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {data.transactions.map((tx) => (
                          <tr key={tx._id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                              {tx.orderId || tx._id}
                            </td>
                            <td className="px-4 py-3 font-semibold uppercase text-slate-200">
                              {tx.plan}
                            </td>
                            <td className="px-4 py-3 text-emerald-400 font-medium">
                              ₹{tx.amount}
                            </td>
                            <td className="px-4 py-3 font-medium text-indigo-300">
                              +{tx.credits} CR
                            </td>
                            <td className="px-4 py-3">
                              {tx.status === "paid" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  <CheckCircle size={10} /> Paid
                                </span>
                              ) : tx.status === "created" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                  <Clock size={10} /> Created
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                  <AlertCircle size={10} /> Failed
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
