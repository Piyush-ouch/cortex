import { useState, useEffect } from "react";
import { X, Brain, Plus, Trash2, Sparkles, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import api from "../utils/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function UserMemoryDrawer({ isOpen, onClose }) {
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/agent/user-memory");
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Fetch User Memories Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newMemory.trim() || saving) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const { data } = await api.post("/api/agent/user-memory", {
        content: newMemory.trim()
      });
      if (data.success && data.memory) {
        setMemories(prev => [data.memory, ...prev]);
        setNewMemory("");
        setStatusMsg({ type: "success", text: "New preference saved to AI Memory Bank!" });
      }
    } catch (err) {
      console.error("Add Memory Error:", err);
      setStatusMsg({ type: "error", text: err.response?.data?.message || "Failed to save memory preference." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-[90vw] max-w-[460px] h-full bg-[#0f1117] border-l border-white/[0.08] flex flex-col z-10 shadow-2xl overflow-hidden font-sans text-slate-200"
        >
          {/* Header */}
          <div className="h-16 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#13151d]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Brain size={18} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-white tracking-tight">AI Memory Bank</h2>
                <p className="text-[11px] text-slate-400">Personalized long-term memory & context graph</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
            {/* Context Notice Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-violet-950/40 border border-indigo-500/20 flex items-start gap-3">
              <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-300 leading-relaxed">
                Cortex AI automatically extracts your preferred coding styles, framework choices, and project guidelines across chat sessions to tailor future answers.
              </p>
            </div>

            {/* Manual Memory Form */}
            <form onSubmit={handleAddMemory} className="space-y-2">
              <label className="text-[12px] font-medium text-slate-300 flex items-center justify-between">
                <span>Add Custom Rule or Preference</span>
                <span className="text-[10px] text-slate-500 font-mono">Semantic RAG Vectorized</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Always use Tailwind CSS v4 and TypeScript"
                  value={newMemory}
                  onChange={e => setNewMemory(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-[12px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
                <button
                  type="submit"
                  disabled={saving || !newMemory.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[12px] font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Save</span>
                </button>
              </div>

              {statusMsg && (
                <div className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                  statusMsg.type === "success" ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20" : "bg-rose-950/50 text-rose-300 border border-rose-500/20"
                }`}>
                  {statusMsg.type === "success" ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                  <span>{statusMsg.text}</span>
                </div>
              )}
            </form>

            {/* Memory List */}
            <div className="space-y-2 pt-2">
              <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Stored Memories ({memories.length})
              </h3>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                  <p className="text-[12px]">Loading vector memory embeddings...</p>
                </div>
              ) : memories.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/[0.08] rounded-xl text-slate-500 text-[12px]">
                  No memory preferences saved yet. Add one above or chat with Cortex AI!
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((mem, idx) => (
                    <div
                      key={mem.id || idx}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <p className="text-[12px] text-slate-200 leading-relaxed font-sans break-words">
                          {mem.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
