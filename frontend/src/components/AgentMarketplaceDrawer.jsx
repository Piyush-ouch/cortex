import { useState, useEffect } from "react";
import { X, Sparkles, Plus, Trash2, Bot, Sliders, Check, Loader2 } from "lucide-react";
import { getCustomAgents, createCustomAgent, deleteCustomAgent } from "../features/customAgent.api";
import { motion, AnimatePresence } from "framer-motion";

export default function AgentMarketplaceDrawer({ isOpen, onClose, onSelectAgent }) {
  const [activeTab, setActiveTab] = useState("marketplace"); // marketplace | builder | my_agents
  const [marketplaceAgents, setMarketplaceAgents] = useState([]);
  const [userAgents, setUserAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [category, setCategory] = useState("Coding");
  const [temperature, setTemperature] = useState(0.7);
  const [creating, setCreating] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await getCustomAgents();
      if (res.success) {
        setUserAgents(res.userAgents || []);
        setMarketplaceAgents(res.marketplaceAgents || []);
      }
    } catch (err) {
      console.error("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !systemPrompt) return;

    try {
      setCreating(true);
      const res = await createCustomAgent({
        name,
        description,
        systemPrompt,
        avatar,
        category,
        temperature
      });

      if (res.success) {
        setName("");
        setDescription("");
        setSystemPrompt("");
        setAvatar("🤖");
        fetchAgents();
        setActiveTab("my_agents");
      }
    } catch (err) {
      console.error("Create agent error:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCustomAgent(id);
      fetchAgents();
    } catch (err) {
      console.error("Delete agent error:", err);
    }
  };

  if (!isOpen) return null;

  const categories = ["All", "Coding", "Writing", "Legal", "Business", "Productivity"];
  const emojiOptions = ["🤖", "⚛️", "⚖️", "✍️", "🐍", "📊", "🎨", "🚀", "🛡️", "💡"];

  const filteredMarketplace = selectedCategory === "All"
    ? marketplaceAgents
    : marketplaceAgents.filter(a => a.category === selectedCategory);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-xl h-full bg-[#0d0f14] border-l border-white/[0.08] flex flex-col text-slate-200 shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">Agent Marketplace & GPTs</h2>
                <p className="text-xs text-slate-400">Browse specialized agents or build custom personas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/[0.08] px-5 bg-white/[0.01]">
            {[
              { id: "marketplace", label: "Marketplace Gallery" },
              { id: "builder", label: "Agent Builder" },
              { id: "my_agents", label: `My Custom Agents (${userAgents.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-purple-400 text-purple-300 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* TAB 1: Marketplace Gallery */}
            {activeTab === "marketplace" && (
              <div className="space-y-4">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                        selectedCategory === cat
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium"
                          : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Loading agents...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredMarketplace.map((agent) => (
                      <div
                        key={agent._id || agent.name}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                              {agent.avatar}
                            </span>
                            <div>
                              <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                                {agent.category}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onSelectAgent?.(agent);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer"
                          >
                            Use Agent
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {agent.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Agent Builder Form */}
            {activeTab === "builder" && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Avatar Emoji</label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {emojiOptions.map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => setAvatar(e)}
                        className={`text-xl p-2 rounded-xl border transition cursor-pointer ${
                          avatar === e
                            ? "bg-purple-500/20 border-purple-400"
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior React Reviewer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141721] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      {categories.filter(c => c !== "All").map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Short Description</label>
                  <input
                    type="text"
                    placeholder="Briefly describe what this agent does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">System Instructions / Prompt</label>
                  <textarea
                    rows={4}
                    placeholder="You are an expert React reviewer. Audit code for hooks, performance memoization, and accessibility..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed resize-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Creativity / Temperature</span>
                    <span className="text-purple-300">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Precise (0.0)</span>
                    <span>Balanced (0.7)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Create Custom Agent</span>
                </button>
              </form>
            )}

            {/* TAB 3: My Custom Agents */}
            {activeTab === "my_agents" && (
              <div className="space-y-3">
                {userAgents.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    You haven't created any custom agents yet.
                    <br />
                    Use the <span className="text-purple-300 font-medium">Agent Builder</span> tab to create one!
                  </div>
                ) : (
                  userAgents.map((agent) => (
                    <div
                      key={agent._id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                          {agent.avatar}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1">{agent.description || agent.systemPrompt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectAgent?.(agent);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleDelete(agent._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
