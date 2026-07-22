import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Editor from "@monaco-editor/react";
import { FiCode } from "react-icons/fi";
import { detectLanguage } from "../utils/detectLanguage";
import { Code2, Eye, PanelRightClose, PanelRightOpen, X, Copy, Check, Terminal, Zap, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SandboxConsole from "./SandboxConsole";
import DatabaseSchemaPanel from "./DatabaseSchemaPanel";
import ApiStudioPanel from "./ApiStudioPanel";
import { updateArtifactFiles } from "../redux/message.slice";
import api from "../utils/axios";

export default function ArtifactPanel() {
  const [tab, setTab]               = useState("code");
  const [activeFile, setActiveFile] = useState(0);
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied]         = useState(false);

  // Live Console & Auto-Healing States
  const [logs, setLogs]             = useState([]);
  const [errors, setErrors]         = useState([]);
  const [isFixing, setIsFixing]     = useState(false);
  const [autoFixStatus, setAutoFixStatus] = useState(null);

  const dispatch = useDispatch();
  const { artifacts } = useSelector(state => state.message);
  const artifact = artifacts?.[0];

  // Reset console output when artifact changes
  useEffect(() => {
    setLogs([]);
    setErrors([]);
    setAutoFixStatus(null);
  }, [artifact?.id]);

  // Capture postMessage console logs and exceptions from sandbox iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "SANDBOX_CONSOLE_LOG" && event.data?.log) {
        const log = event.data.log;
        if (log.type === "error") {
          setErrors(prev => [...prev, log]);
        } else {
          setLogs(prev => [...prev, log]);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!artifact) return null;

  const file       = artifact?.files?.[activeFile];
  const htmlFile   = artifact?.files?.find(f => f.name === "index.html");
  const cssFile    = artifact?.files?.find(f => f.name === "style.css");
  const jsFile     = artifact?.files?.find(f => f.name === "script.js");
  const canPreview = Boolean(htmlFile);

  const interceptorScript = `<script>
(function() {
  function sendLog(type, args, stack) {
    try {
      window.parent.postMessage({
        type: 'SANDBOX_CONSOLE_LOG',
        log: {
          type: type,
          args: Array.from(args).map(function(a) {
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
            catch(e) { return String(a); }
          }),
          message: Array.from(args).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '),
          stack: stack || null,
          timestamp: Date.now()
        }
      }, '*');
    } catch(e) {}
  }
  var origLog = console.log;
  var origWarn = console.warn;
  var origError = console.error;
  console.log = function() { sendLog('log', arguments); if(origLog) origLog.apply(console, arguments); };
  console.warn = function() { sendLog('warn', arguments); if(origWarn) origWarn.apply(console, arguments); };
  console.error = function() { sendLog('error', arguments); if(origError) origError.apply(console, arguments); };
  window.onerror = function(msg, url, line, col, err) {
    var stack = err && err.stack ? err.stack : ('Error at line ' + line + ':' + col);
    sendLog('error', [msg], stack);
    return false;
  };
  window.onunhandledrejection = function(e) {
    var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Promise Rejection';
    var stack = e.reason && e.reason.stack ? e.reason.stack : null;
    sendLog('error', [msg], stack);
  };
})();
</script>`;

  const previewDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${interceptorScript}
<style>${cssFile?.content || ""}</style>
</head>
<body>
${htmlFile?.content || ""}
<script>${jsFile?.content || ""}<\/script>
</body>
</html>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(file?.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoFix = async (targetError) => {
    const errToFix = targetError || errors[errors.length - 1];
    if (!errToFix || isFixing) return;

    setIsFixing(true);
    setAutoFixStatus({ type: "info", message: "⚡ AI Self-Healing Engine analyzing stack trace & repairing code..." });

    try {
      const { data } = await api.post("/api/agent/auto-fix", {
        artifactTitle: artifact.title,
        files: artifact.files,
        error: errToFix
      });

      if (data.success && Array.isArray(data.files)) {
        dispatch(updateArtifactFiles({ id: artifact.id, files: data.files }));
        setErrors([]);
        setAutoFixStatus({
          type: "success",
          message: "⚡ Runtime error resolved! Code repaired & hot-reloaded."
        });
      } else {
        setAutoFixStatus({
          type: "error",
          message: data.message || "Failed to auto-fix runtime error."
        });
      }
    } catch (err) {
      console.error("Auto-Fix Error:", err);
      setAutoFixStatus({
        type: "error",
        message: err.response?.data?.message || err.message || "Auto-fix execution failed."
      });
    } finally {
      setIsFixing(false);
    }
  };

  /* ── Shared code panel content ── */
  const PanelContent = ({ onClose }) => {
    if (artifact?.type === "database_schema") {
      return <DatabaseSchemaPanel artifact={artifact} />;
    }
    if (artifact?.type === "api_specification") {
      return <ApiStudioPanel artifact={artifact} />;
    }
    return (
    <div className="flex flex-col h-full bg-[#0d0f14]">

      {/* Header */}
      <div className="h-14 px-4 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
        <button
          onClick={onClose ?? (() => setCollapsed(true))}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer shrink-0"
        >
          {onClose ? <X size={15} /> : <PanelRightClose size={15} />}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 shrink-0">
            <FiCode className="text-indigo-400" size={12} />
          </div>
          <h2 className="text-[13px] font-medium text-slate-200 truncate">{artifact.title}</h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Copy button — only in code tab */}
          {tab === "code" && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-colors duration-150 bg-transparent border-none cursor-pointer"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}

          {canPreview && (
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] p-1 rounded-lg">
              <button
                onClick={() => setTab("code")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors duration-150 cursor-pointer
                  ${tab === "code" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
              >
                <Code2 size={11} /> Code
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors duration-150 cursor-pointer
                  ${tab === "preview" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
              >
                <Eye size={11} /> Preview
              </button>
              <button
                onClick={() => setTab("console")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors duration-150 cursor-pointer relative
                  ${tab === "console" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
              >
                <Terminal size={11} /> Console
                {errors.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center -ml-0.5 animate-pulse">
                    {errors.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Fix Trigger Header Banner if Errors Detected */}
      {errors.length > 0 && tab !== "console" && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-2 text-[12px]">
          <div className="flex items-center gap-2 text-rose-300">
            <Zap size={14} className="text-amber-400 fill-amber-400 animate-bounce" />
            <span className="font-medium">Runtime Error Intercepted in Sandbox!</span>
          </div>
          <button
            onClick={() => handleAutoFix()}
            disabled={isFixing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md cursor-pointer border border-amber-400/30 transition-all"
          >
            {isFixing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            <span>⚡ Auto-Fix Runtime Error</span>
          </button>
        </div>
      )}

      {/* File tabs */}
      <AnimatePresence>
        {tab === "code" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex border-b border-white/[0.06] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
          >
            {artifact.files?.map((f, index) => (
              <button
                key={f.name}
                onClick={() => setActiveFile(index)}
                className={`px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-150 border-r border-white/[0.05] relative cursor-pointer bg-transparent
                  ${activeFile === index ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                {f.name}
                {activeFile === index && (
                  <motion.div layoutId="filetab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-t-full" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor / Preview / Console */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === "preview" && canPreview ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <iframe title="preview" sandbox="allow-scripts" srcDoc={previewDoc} className="w-full h-full bg-white" />
            </motion.div>
          ) : tab === "console" ? (
            <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <SandboxConsole
                logs={logs}
                errors={errors}
                onAutoFix={handleAutoFix}
                isFixing={isFixing}
                autoFixStatus={autoFixStatus}
              />
            </motion.div>
          ) : (
            <motion.div key={`code-${activeFile}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <Editor
                theme="vs-dark"
                language={detectLanguage(file?.name || "")}
                value={file?.content || ""}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 16 }, lineNumbers: "on", renderLineHighlight: "none" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-24 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-medium shadow-lg shadow-indigo-500/20 border-none cursor-pointer transition-colors duration-150"
      >
        <FiCode size={13} />
        View Code
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="mob-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
            <motion.div key="mob-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.25, ease: "easeInOut" }} className="lg:hidden fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[420px] border-l border-white/[0.06] overflow-hidden">
              <PanelContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div key="open" initial={{ width: 0, opacity: 0 }} animate={{ width: "clamp(340px, 38%, 680px)", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="hidden lg:flex h-full border-l border-white/[0.06] flex-col overflow-hidden shrink-0">
            <PanelContent />
          </motion.div>
        ) : (
          <motion.div key="collapsed" initial={{ width: 0, opacity: 0 }} animate={{ width: 48, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="hidden lg:flex h-full border-l border-white/[0.06] bg-[#0d0f14] flex-col items-center py-4 gap-3 shrink-0">
            <button onClick={() => setCollapsed(false)} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer">
              <PanelRightOpen size={15} />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[10px] font-medium text-slate-600 tracking-widest uppercase whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                {artifact.title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}