import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  Filter,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMessage, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";

export default function SecurityAuditPanel({ artifact }) {
  const [activeTab, setActiveTab] = useState("vulnerabilities"); // 'vulnerabilities' | 'secure_patch' | 'advisory'
  const [severityFilter, setSeverityFilter] = useState("ALL"); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [selectedVulnId, setSelectedVulnId] = useState(null);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [refinePromptText, setRefinePromptText] = useState("");

  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);

  if (!artifact) return null;

  const score = artifact.score ?? 65;
  const riskLevel = artifact.riskLevel || "HIGH";
  const summary = artifact.summary || "";
  const vulnerabilities = artifact.vulnerabilities || [];
  const compliance = artifact.compliance || { owasp: "FAIL", secrets: "CLEAN", auth: "VULNERABLE", gdpr: "WARN" };
  const remediatedCode = artifact.remediatedCode || "";
  const advisory = artifact.advisory || "";

  // Filter vulnerabilities
  const filteredVulnerabilities = vulnerabilities.filter(v => {
    if (severityFilter === "ALL") return true;
    return (v.severity || "").toUpperCase() === severityFilter;
  });

  const selectedVuln = vulnerabilities.find(v => v.id === selectedVulnId) || vulnerabilities[0];

  // Counts
  const critCount = vulnerabilities.filter(v => (v.severity || "").toUpperCase() === "CRITICAL").length;
  const highCount = vulnerabilities.filter(v => (v.severity || "").toUpperCase() === "HIGH").length;
  const medCount  = vulnerabilities.filter(v => (v.severity || "").toUpperCase() === "MEDIUM").length;
  const lowCount  = vulnerabilities.filter(v => (v.severity || "").toUpperCase() === "LOW").length;

  const getScoreColor = (s) => {
    if (s >= 80) return "from-emerald-500 to-teal-400 text-emerald-400 border-emerald-500/30";
    if (s >= 50) return "from-amber-500 to-yellow-400 text-amber-400 border-amber-500/30";
    return "from-rose-600 to-red-500 text-rose-400 border-rose-500/30";
  };

  const getRiskBadge = (risk) => {
    switch (risk?.toUpperCase()) {
      case "CRITICAL":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1"><AlertTriangle size={11} /> Critical Risk</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertTriangle size={11} /> High Risk</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><AlertTriangle size={11} /> Medium Risk</span>;
      case "LOW":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1"><Shield size={11} /> Low Risk</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><ShieldCheck size={11} /> Secure</span>;
    }
  };

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(remediatedCode);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleDownloadAdvisory = () => {
    const blob = new Blob([advisory], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "security_advisory_report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefineSecurity = async (e) => {
    e?.preventDefault();
    if (!refinePromptText.trim() || isLoading) return;

    const userPrompt = `[Refine Security Audit] ${refinePromptText.trim()}`;
    setRefinePromptText("");

    dispatch(addMessage({ role: "user", content: userPrompt, conversationId: selectedConversation?._id }));
    dispatch(setIsLoading(true));

    try {
      await sendPrompt({
        prompt: userPrompt,
        conversationId: selectedConversation?._id,
        agent: "security_auditor",
        dispatch
      });
    } catch (err) {
      console.error("Failed to re-audit security:", err);
      dispatch(setIsLoading(false));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0d13] text-slate-200 overflow-hidden font-sans border-l border-white/[0.06]">
      {/* Top Bar Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#0d0f17] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-slate-100 truncate">{artifact.title}</h2>
              {getRiskBadge(riskLevel)}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">Cortex Sentinel — AI Security Auditor & Remediation Studio</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyPatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition cursor-pointer"
          >
            {copiedPatch ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedPatch ? "Copied Patch" : "Copy Secure Patch"}</span>
          </button>
          <button
            onClick={handleDownloadAdvisory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer"
          >
            <Download size={12} />
            <span>Export Advisory</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="p-4 bg-gradient-to-r from-[#121522] to-[#0e101a] border-b border-white/[0.06] grid grid-cols-12 gap-3 shrink-0">
        {/* Score Dial Card */}
        <div className="col-span-12 md:col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3.5">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getScoreColor(score)} border flex flex-col items-center justify-center shadow-lg shrink-0`}>
            <span className="text-[18px] font-extrabold leading-none">{score}</span>
            <span className="text-[8px] font-semibold tracking-wider opacity-80 uppercase">/ 100</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Security Score</span>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-2 leading-relaxed mt-0.5">{summary}</p>
          </div>
        </div>

        {/* Severity Count Card */}
        <div className="col-span-12 md:col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-around">
          <div className="text-center">
            <span className="block text-[16px] font-extrabold text-rose-400">{critCount}</span>
            <span className="text-[9px] font-semibold text-rose-300/70 uppercase tracking-wider">Critical</span>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.06]" />
          <div className="text-center">
            <span className="block text-[16px] font-extrabold text-amber-400">{highCount}</span>
            <span className="text-[9px] font-semibold text-amber-300/70 uppercase tracking-wider">High</span>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.06]" />
          <div className="text-center">
            <span className="block text-[16px] font-extrabold text-yellow-400">{medCount}</span>
            <span className="text-[9px] font-semibold text-yellow-300/70 uppercase tracking-wider">Medium</span>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.06]" />
          <div className="text-center">
            <span className="block text-[16px] font-extrabold text-blue-400">{lowCount}</span>
            <span className="text-[9px] font-semibold text-blue-300/70 uppercase tracking-wider">Low</span>
          </div>
        </div>

        {/* Compliance Status Card */}
        <div className="col-span-12 md:col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">Compliance Matrix</span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04]">
              <span className="text-slate-400">OWASP ASVS</span>
              <span className={`font-bold ${compliance.owasp === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>{compliance.owasp || "FAIL"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04]">
              <span className="text-slate-400">Secret Scanner</span>
              <span className={`font-bold ${compliance.secrets === "CLEAN" ? "text-emerald-400" : "text-amber-400"}`}>{compliance.secrets || "CLEAN"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04]">
              <span className="text-slate-400">Auth Control</span>
              <span className={`font-bold ${compliance.auth === "SECURE" ? "text-emerald-400" : "text-rose-400"}`}>{compliance.auth || "VULN"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04]">
              <span className="text-slate-400">GDPR Data</span>
              <span className={`font-bold ${compliance.gdpr === "COMPLIANT" ? "text-emerald-400" : "text-amber-400"}`}>{compliance.gdpr || "WARN"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="px-4 border-b border-white/[0.06] bg-[#0c0e16] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("vulnerabilities")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "vulnerabilities"
                ? "border-rose-500 text-rose-400 bg-rose-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert size={13} />
            <span>Vulnerability Matrix</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">{vulnerabilities.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("secure_patch")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "secure_patch"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 size={13} />
            <span>Secure Patch Code</span>
          </button>

          <button
            onClick={() => setActiveTab("advisory")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "advisory"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText size={13} />
            <span>Security Advisory</span>
          </button>
        </div>

        {/* Severity Filter Pills (Only in Vulnerabilities Tab) */}
        {activeTab === "vulnerabilities" && (
          <div className="flex items-center gap-1 py-1 text-[10px]">
            <Filter size={11} className="text-slate-500 mr-1" />
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  severityFilter === sev
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Workspace Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* TAB 1: VULNERABILITY MATRIX */}
          {activeTab === "vulnerabilities" && (
            <motion.div
              key="vulnerabilities"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full grid grid-cols-12 overflow-hidden"
            >
              {/* Left Column: Vulnerability List */}
              <div className="col-span-12 lg:col-span-5 border-r border-white/[0.06] overflow-y-auto p-3 space-y-2">
                {filteredVulnerabilities.map(v => {
                  const isSelected = (selectedVuln?.id === v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVulnId(v.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-500/10 border-rose-500/30 shadow-lg shadow-rose-950/20"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{v.id}</span>
                        {getRiskBadge(v.severity)}
                      </div>
                      <h4 className="text-[12px] font-bold text-slate-100 line-clamp-1">{v.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.06] font-mono text-slate-300">{v.cwe || "CWE-00"}</span>
                        <span className="truncate">{v.category}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredVulnerabilities.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-[12px]">
                    No vulnerabilities found for filter "{severityFilter}".
                  </div>
                )}
              </div>

              {/* Right Column: Selected Vulnerability Detail & Exploit Walkthrough */}
              <div className="col-span-12 lg:col-span-7 overflow-y-auto p-4 space-y-4 bg-[#090b10]">
                {selectedVuln ? (
                  <>
                    {/* Header */}
                    <div className="border-b border-white/[0.06] pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-rose-400">{selectedVuln.id} • {selectedVuln.cwe}</span>
                        {getRiskBadge(selectedVuln.severity)}
                      </div>
                      <h3 className="text-[15px] font-bold text-slate-100 mt-1">{selectedVuln.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">{selectedVuln.location || "Application Security Context"}</p>
                    </div>

                    {/* Description */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vulnerability Analysis</h5>
                      <p className="text-[12px] text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.05]">
                        {selectedVuln.description}
                      </p>
                    </div>

                    {/* Exploit Attack Scenario */}
                    <div>
                      <h5 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> Attack Vector Scenario
                      </h5>
                      <div className="text-[11px] text-slate-300 bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg leading-relaxed font-mono">
                        {selectedVuln.attackScenario || "Attack scenario detailing exploit conditions."}
                      </div>
                    </div>

                    {/* Target Fix Snippet */}
                    <div>
                      <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Target Remediation Fix
                      </h5>
                      <div className="bg-[#050608] border border-emerald-500/20 rounded-lg p-3 overflow-x-auto text-[11px] font-mono text-emerald-300">
                        <pre>{selectedVuln.patchCode}</pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[12px]">
                    <Eye size={28} className="text-slate-600 mb-2" />
                    <span>Select a vulnerability from the matrix to inspect exploit details</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: SECURE PATCH CODE */}
          {activeTab === "secure_patch" && (
            <motion.div
              key="secure_patch"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="p-2.5 bg-[#090b10] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 px-4">
                <span className="font-mono text-emerald-400">secure_patch.js — Production-Grade Hardened Output</span>
                <button
                  onClick={handleCopyPatch}
                  className="flex items-center gap-1 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {copiedPatch ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedPatch ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <div className="flex-1">
                <Editor
                  theme="vs-dark"
                  language="javascript"
                  value={remediatedCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 12 }
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* TAB 3: ADVISORY REPORT */}
          {activeTab === "advisory" && (
            <motion.div
              key="advisory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-5 overflow-y-auto bg-[#090b10] text-[12px] leading-relaxed text-slate-300 space-y-4"
            >
              <div className="max-w-3xl mx-auto bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 shadow-xl space-y-4 font-sans">
                <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold text-slate-100">Executive Security Audit Advisory</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Generated by Cortex Sentinel AI Engine</p>
                  </div>
                  <button
                    onClick={handleDownloadAdvisory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-medium hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Download Markdown</span>
                  </button>
                </div>

                <div className="prose prose-invert max-w-none text-[12px]">
                  <div className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
                    {advisory}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Refine Input Bar */}
      <form onSubmit={handleRefineSecurity} className="p-3 bg-[#0d0f17] border-t border-white/[0.08] flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={refinePromptText}
            onChange={(e) => setRefinePromptText(e.target.value)}
            placeholder="Refine audit (e.g. 'Harden JWT secret storage', 'Add CSRF token validation')..."
            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-rose-500/50 rounded-xl px-3.5 py-2 text-[12px] text-slate-100 placeholder-slate-500 focus:outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={!refinePromptText.trim() || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white text-[12px] font-semibold transition cursor-pointer shadow-md shrink-0"
        >
          <Sparkles size={13} />
          <span>Re-Audit</span>
        </button>
      </form>
    </div>
  );
}
