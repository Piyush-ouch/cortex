import { useState, useRef } from "react";
import { X, Play, Plus, Trash2, Sparkles, Globe, Code, FileText, Presentation, Bot, Layers, ArrowRight, Loader2, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/axios";
import { addMessage, setArtifacts, setIsLoading } from "../redux/message.slice";

const NODE_TYPES = [
  { type: "search", label: "Web Search", icon: Globe, color: "text-blue-400 border-blue-500/30 bg-blue-500/10", desc: "Tavily Real-Time Web Search" },
  { type: "summarize", label: "AI Summarizer", icon: Bot, color: "text-violet-400 border-violet-500/30 bg-violet-500/10", desc: "Consolidate & Analyze Context" },
  { type: "coding", label: "Code Prototype", icon: Code, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", desc: "Single-Page Web Application" },
  { type: "pdf", label: "PDF Document", icon: FileText, color: "text-amber-400 border-amber-500/30 bg-amber-500/10", desc: "Formatted PDF Exporter" },
  { type: "ppt", label: "PowerPoint Deck", icon: Presentation, color: "text-rose-400 border-rose-500/30 bg-rose-500/10", desc: "Slide Presentation Deck" }
];

const PRESETS = [
  {
    name: "Full Team Pipeline (Search → Code → PPT)",
    nodes: [
      { id: "node-1", type: "search", label: "Web Search", x: 60, y: 120 },
      { id: "node-2", type: "coding", label: "Code Prototype", x: 300, y: 120 },
      { id: "node-3", type: "ppt", label: "PowerPoint Deck", x: 540, y: 120 }
    ],
    edges: [
      { source: "node-1", target: "node-2" },
      { source: "node-2", target: "node-3" }
    ]
  },
  {
    name: "Research & PDF Exporter (Search → Summarize → PDF)",
    nodes: [
      { id: "node-1", type: "search", label: "Web Search", x: 60, y: 120 },
      { id: "node-2", type: "summarize", label: "AI Summarizer", x: 300, y: 120 },
      { id: "node-3", type: "pdf", label: "PDF Document", x: 540, y: 120 }
    ],
    edges: [
      { source: "node-1", target: "node-2" },
      { source: "node-2", target: "node-3" }
    ]
  }
];

export default function CortexCanvasModal({ isOpen, onClose }) {
  const [nodes, setNodes] = useState(PRESETS[0].nodes);
  const [edges, setEdges] = useState(PRESETS[0].edges);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [completedNodeIds, setCompletedNodeIds] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);

  if (!isOpen) return null;

  const handleAddNode = (typeObj) => {
    const newId = `node-${Date.now()}`;
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? lastNode.x + 220 : 80;
    const newY = lastNode ? lastNode.y : 120;

    const newNode = {
      id: newId,
      type: typeObj.type,
      label: typeObj.label,
      x: newX,
      y: newY
    };

    setNodes(prev => [...prev, newNode]);

    if (lastNode) {
      setEdges(prev => [...prev, { source: lastNode.id, target: newId }]);
    }
  };

  const handleRemoveNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
  };

  const handleApplyPreset = (preset) => {
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setCompletedNodeIds([]);
    setActiveNodeId(null);
  };

  const handleRunWorkflow = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || running) return;

    setRunning(true);
    setErrorMsg(null);
    setCompletedNodeIds([]);

    const userMessage = {
      role: "user",
      content: `🎨 **Cortex Canvas Visual Flow Executed:**\nGoal: "${prompt}"\nPipeline: ${nodes.map(n => n.label).join(" → ")}`
    };

    dispatch(addMessage(userMessage));
    dispatch(setIsLoading(true));

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/agent/workflow/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          nodes,
          edges,
          conversationId: selectedConversation?._id,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Execution error: Status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch = block.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1].trim());

            if (eventType === "status") {
              if (data.nodeId) {
                if (data.nodeStatus === "running") {
                  setActiveNodeId(data.nodeId);
                } else if (data.nodeStatus === "completed") {
                  setCompletedNodeIds(prev => [...prev, data.nodeId]);
                }
              }
            } else if (eventType === "done") {
              const assistantMsg = {
                role: "assistant",
                content: data.answer,
                images: data.images || [],
                artifacts: data.artifacts || []
              };
              dispatch(addMessage(assistantMsg));
              if (data.artifacts && data.artifacts.length > 0) {
                dispatch(setArtifacts(data.artifacts));
              }
            }
          }
        }
      }

      onClose();
    } catch (err) {
      console.error("Workflow Execution Error:", err);
      setErrorMsg(err.message || "Failed to execute visual workflow");
    } finally {
      setRunning(false);
      dispatch(setIsLoading(false));
      setActiveNodeId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative w-full max-w-5xl h-[88vh] bg-[#0c0e14] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between bg-[#11131c] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-white tracking-tight flex items-center gap-2">
                  Cortex Canvas
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Visual Flow Builder
                  </span>
                </h2>
                <p className="text-[12px] text-slate-400">Design dynamic DAG multi-agent pipelines interactively</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Presets Bar */}
          <div className="px-6 py-2.5 bg-[#090b10] border-b border-white/[0.05] flex items-center gap-3 overflow-x-auto shrink-0">
            <span className="text-[11px] font-medium text-slate-500 shrink-0">Preset Pipelines:</span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                className="px-3 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Canvas Workspace Body */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Node Palette Sidebar */}
            <div className="w-64 bg-[#0e1017] border-r border-white/[0.06] p-4 space-y-3 shrink-0 overflow-y-auto">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Agent Nodes</h3>
              <div className="space-y-2">
                {NODE_TYPES.map(n => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.type}
                      onClick={() => handleAddNode(n)}
                      className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-all cursor-pointer flex items-start gap-3 group"
                    >
                      <div className={`p-2 rounded-lg border ${n.color} shrink-0`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-slate-200 group-hover:text-white">{n.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{n.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Interactive Board */}
            <div className="flex-1 bg-[#07080c] relative overflow-auto p-8 flex items-center justify-start [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:24px_24px]">
              {/* Dynamic Connecting Lines (SVG Edges) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {edges.map((edge, idx) => {
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);

                  if (!sourceNode || !targetNode) return null;

                  const x1 = sourceNode.x + 180;
                  const y1 = sourceNode.y + 40;
                  const x2 = targetNode.x;
                  const y2 = targetNode.y + 40;

                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                  );
                })}
              </svg>

              {/* Render Nodes */}
              <div className="relative z-10 flex items-center gap-12 min-w-max">
                {nodes.map((node, idx) => {
                  const typeObj = NODE_TYPES.find(t => t.type === node.type) || NODE_TYPES[0];
                  const Icon = typeObj.icon;
                  const isRunning = activeNodeId === node.id;
                  const isCompleted = completedNodeIds.includes(node.id);

                  return (
                    <div
                      key={node.id}
                      className={`relative w-48 p-4 rounded-2xl border transition-all shadow-xl bg-[#11131c] ${
                        isRunning
                          ? "border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/30"
                          : isCompleted
                          ? "border-emerald-500/50 bg-emerald-950/20"
                          : "border-white/[0.08] hover:border-white/[0.18]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg border ${typeObj.color}`}>
                          <Icon size={16} />
                        </div>
                        <button
                          onClick={() => handleRemoveNode(node.id)}
                          className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <h4 className="text-[13px] font-semibold text-white mb-1">{node.label}</h4>
                      <p className="text-[10px] text-slate-500">Step {idx + 1} in DAG Flow</p>

                      {/* Status indicator */}
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-mono">Status:</span>
                        {isRunning ? (
                          <span className="text-indigo-400 font-medium flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Running
                          </span>
                        ) : isCompleted ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={10} /> Done
                          </span>
                        ) : (
                          <span className="text-slate-500">Ready</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Execution Bar */}
          <form onSubmit={handleRunWorkflow} className="p-4 bg-[#11131c] border-t border-white/[0.06] flex items-center gap-3 shrink-0">
            <input
              type="text"
              placeholder="Enter task prompt goal (e.g. 'Build a crypto weather dashboard app')..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
            <button
              type="submit"
              disabled={running || !prompt.trim() || nodes.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 text-white font-medium text-[13px] shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              <span>{running ? "Executing Flow..." : "▶ Run Custom Flow"}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="px-4 py-2 bg-rose-500/10 text-rose-300 border-t border-rose-500/20 text-[12px] flex items-center gap-2">
              <Zap size={14} className="text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
