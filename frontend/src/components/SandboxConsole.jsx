import { useState, useRef, useEffect } from "react";
import { Terminal, AlertCircle, AlertTriangle, Info, CheckCircle2, Trash2, Search, Zap, Loader2, Sparkles } from "lucide-react";

export default function SandboxConsole({ logs = [], errors = [], onAutoFix, isFixing = false, autoFixStatus = null }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const consoleEndRef = useRef(null);

  const allEntries = [...logs, ...errors].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const filteredEntries = allEntries.filter(entry => {
    if (filter === "error" && entry.type !== "error") return false;
    if (filter === "warn" && entry.type !== "warn") return false;
    if (filter === "log" && entry.type !== "log" && entry.type !== "info") return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const messageText = Array.isArray(entry.args) ? entry.args.join(" ") : String(entry.message || "");
      return messageText.toLowerCase().includes(query);
    }
    return true;
  });

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allEntries.length]);

  const hasErrors = errors.length > 0;
  const latestError = errors[errors.length - 1];

  return (
    <div className="flex flex-col h-full bg-[#090b0e] border-t border-white/[0.06] font-mono text-[12px]">
      {/* Console Toolbar */}
      <div className="h-10 px-3 bg-[#111319] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-sans font-medium text-[12px]">
            <Terminal size={14} className="text-indigo-400" />
            <span>Interactive Live Console</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] bg-white/[0.06] text-slate-400">
              {allEntries.length} entries
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 ml-3 bg-black/40 p-0.5 rounded-lg border border-white/[0.04]">
            {["all", "error", "warn", "log"].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors cursor-pointer capitalize ${
                  filter === type
                    ? type === "error"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {type} {type === "error" && errors.length > 0 && `(${errors.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Auto-Fix Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-32 sm:w-40 pl-6 pr-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 text-[11px]"
            />
          </div>

          {/* Auto-Fix CTA Button */}
          {hasErrors && (
            <button
              onClick={() => onAutoFix(latestError)}
              disabled={isFixing}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold transition-all duration-200 cursor-pointer ${
                isFixing
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 opacity-70 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-rose-500/20 border border-amber-400/30 animate-pulse"
              }`}
            >
              {isFixing ? (
                <>
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                  <span>AI Healing Code...</span>
                </>
              ) : (
                <>
                  <Zap size={12} className="text-amber-200 fill-amber-200" />
                  <span>⚡ Auto-Fix Error</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Auto-Fix Status Alert */}
      {autoFixStatus && (
        <div className={`px-3 py-1.5 flex items-center gap-2 text-[11px] font-sans border-b ${
          autoFixStatus.type === "success" 
            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
            : "bg-rose-950/40 border-rose-500/20 text-rose-300"
        }`}>
          {autoFixStatus.type === "success" ? (
            <Sparkles size={13} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={13} className="text-rose-400 shrink-0" />
          )}
          <span className="flex-1 truncate">{autoFixStatus.message}</span>
        </div>
      )}

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-sans gap-2 py-8">
            <Terminal size={24} className="opacity-30" />
            <p className="text-[12px]">No console logs captured yet</p>
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const timeStr = entry.timestamp 
              ? new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : "--:--:--";

            const isErr = entry.type === "error";
            const isWarn = entry.type === "warn";

            return (
              <div
                key={idx}
                className={`flex items-start gap-2 p-1.5 rounded border transition-colors ${
                  isErr
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                    : isWarn
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                    : "bg-white/[0.02] border-white/[0.04] text-slate-300"
                }`}
              >
                <span className="text-[10px] text-slate-500 shrink-0 select-none pt-0.5">{timeStr}</span>

                <div className="shrink-0 pt-0.5">
                  {isErr ? (
                    <AlertCircle size={13} className="text-rose-400" />
                  ) : isWarn ? (
                    <AlertTriangle size={13} className="text-amber-400" />
                  ) : (
                    <Info size={13} className="text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                  {Array.isArray(entry.args)
                    ? entry.args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")
                    : String(entry.message || "")}

                  {entry.stack && (
                    <details className="mt-1 text-[10px] text-rose-300/80 cursor-pointer">
                      <summary className="hover:underline text-rose-400 font-sans">View Stack Trace</summary>
                      <pre className="mt-1 p-2 rounded bg-black/60 border border-rose-500/20 overflow-x-auto text-rose-200/90 leading-normal font-mono">
                        {entry.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
