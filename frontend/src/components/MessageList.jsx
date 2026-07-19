import MessageBubble from "./MessageBubble";
import { useDispatch, useSelector } from "react-redux";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages } from "../redux/message.slice";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Workflow, Globe, Code2, Presentation, Zap } from "lucide-react";

function NeuralPulse() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
      {[0, 0.45, 0.9].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-cyan-400/30"
          initial={{ scale: 0.3, opacity: 0.55 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.span
        className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400"
        style={{ boxShadow: "0 0 14px rgba(125,211,252,0.55)" }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function AgentStatusBadge({ status }) {
  if (!status) return null;
  const isTeam = status.agent === "team_workflow";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium max-w-fit mb-2 shadow-sm"
    >
      {isTeam ? (
        <div className="flex items-center gap-1.5">
          <Workflow size={14} className="text-cyan-400 animate-spin" />
          <span className="font-semibold text-cyan-300">Multi-Agent Team Workflow:</span>
          <span className="text-slate-300">{status.label || "Executing Search → Coding → PPT..."}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-indigo-400 animate-pulse" />
          <span className="capitalize font-semibold text-indigo-300">[{status.agent}]</span>
          <span className="text-slate-300">{status.label}</span>
        </div>
      )}
    </motion.div>
  );
}

const THINKING_LABELS = ["Thinking", "Analyzing", "Reasoning", "Generating"];

function GeneratingIndicator() {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % THINKING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const label = THINKING_LABELS[labelIndex];

  return (
    <div className="flex items-center gap-3 max-w-[72%] py-1">
      <NeuralPulse />
      <div className="flex overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            className="flex"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {label.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="text-[13px] font-medium tracking-wide text-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.06,
                }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MessageList() {
  const { messages, isLoading, streamingStatus } = useSelector((state) => state.message);
  const { selectedConversation } = useSelector((state) => state.conversation);
  const dispatch = useDispatch();
  const bottomRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
    });
  }, [messages.length, isLoading, streamingStatus]);

  useEffect(() => {
    if (selectedConversation?.title === "New Chat") return;
    const get = async () => {
      const data = await getMessages(selectedConversation?._id);
      dispatch(setMessages(data));
      const latestArtifactMessage = Array.isArray(data)
        ? [...data].reverse().find(msg => msg.artifacts && msg.artifacts.length > 0)
        : null;

      if (latestArtifactMessage) {
        dispatch(setArtifacts(latestArtifactMessage.artifacts));
      }
    };
    get();
  }, [selectedConversation?._id]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {messages.length === 0 && !isLoading ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[20px] font-semibold text-slate-200 tracking-tight">CortexAI</h1>
            <h3 className="text-[15px] font-semibold text-slate-400 tracking-tight">How can I help you?</h3>
            <p className="text-[13px] text-slate-600 max-w-[260px] leading-relaxed">Ask me anything — code, ideas, explanations, or multi-agent workflows.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {[
              "Research SaaS trends & build landing page",
              "Build a Netflix clone",
              "Design presentation deck"
            ].map((s) => (
              <button
                key={s}
                className="text-[12px] text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 transition-colors duration-150 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <MessageBubble role={msg.role} content={msg.content} images={msg?.images || []}/>
            </motion.div>
          ))}

          {streamingStatus && <AgentStatusBadge status={streamingStatus} />}

          {isLoading && !streamingStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <GeneratingIndicator />
            </motion.div>
          )}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}