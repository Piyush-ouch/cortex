import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import {
  GitPullRequest,
  GitBranch,
  GitCommit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCode2,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Play,
  Sparkles,
  Layers,
  Code2,
  Clock,
  Zap,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMessage, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";

export default function DevOpsStudioPanel({ artifact }) {
  const [activeTab, setActiveTab] = useState("pr_overview"); // 'pr_overview' | 'file_diffs' | 'test_runner' | 'preview_deploy'
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedPr, setCopiedPr] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedSuccess, setMergedSuccess] = useState(false);
  const [refinePromptText, setRefinePromptText] = useState("");

  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);

  if (!artifact) return null;

  const config = artifact.config || {};
  const worktree = artifact.worktree || [];
  const testResults = artifact.testResults || {};
  const pullRequest = artifact.pullRequest || {};

  const currentFile = worktree[selectedFileIndex] || worktree[0];

  const handleCopyPr = () => {
    const prMd = `# ${pullRequest.title || "Pull Request"}\n\n${pullRequest.summary || ""}\n\n## Changes\n${pullRequest.changesSummary || ""}`;
    navigator.clipboard.writeText(prMd);
    setCopiedPr(true);
    setTimeout(() => setCopiedPr(false), 2000);
  };

  const handleSimulateMerge = () => {
    setIsMerging(true);
    setTimeout(() => {
      setIsMerging(false);
      setMergedSuccess(true);
    }, 1500);
  };

  const handleRefineDevOps = async (e) => {
    e?.preventDefault();
    if (!refinePromptText.trim() || isLoading) return;

    const userPrompt = `[Refine DevOps PR] ${refinePromptText.trim()}`;
    setRefinePromptText("");

    dispatch(addMessage({ role: "user", content: userPrompt, conversationId: selectedConversation?._id }));
    dispatch(setIsLoading(true));

    try {
      await sendPrompt({
        prompt: userPrompt,
        conversationId: selectedConversation?._id,
        agent: "devops_agent",
        dispatch
      });
    } catch (err) {
      console.error("Failed to re-simulate PR:", err);
      dispatch(setIsLoading(false));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0d14] text-slate-200 overflow-hidden font-sans border-l border-white/[0.06]">
      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#0d0f17] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <GitPullRequest size={18} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-slate-100 truncate">{pullRequest.title || artifact.title}</h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                PR #{pullRequest.prNumber || 42}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              <GitBranch size={10} className="inline mr-1 text-slate-500" />
              {config.branchName || "feat/auto-patch"} ➔ {config.targetBranch || "main"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyPr}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition cursor-pointer"
          >
            {copiedPr ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedPr ? "Copied" : "Copy PR"}</span>
          </button>
          <button
            onClick={handleSimulateMerge}
            disabled={isMerging || mergedSuccess}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
              mergedSuccess
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/30 shadow-md"
            }`}
          >
            <GitCommit size={12} />
            <span>{isMerging ? "Merging..." : mergedSuccess ? "Merged to Main" : "Merge PR"}</span>
          </button>
        </div>
      </div>

      {/* CI/CD Pipeline Progress Stepper */}
      <div className="px-5 py-2.5 bg-gradient-to-r from-[#0e101a] to-[#0b0d14] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 size={13} />
            <span>1. Clone & Scan</span>
          </div>
          <span className="text-slate-600">➔</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 size={13} />
            <span>2. Apply Multi-File Patch ({worktree.length})</span>
          </div>
          <span className="text-slate-600">➔</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 size={13} />
            <span>3. Unit Test Suite ({testResults.passed || 12}/{testResults.totalTests || 12})</span>
          </div>
          <span className="text-slate-600">➔</span>
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
            <Sparkles size={13} />
            <span>4. PR Assembled</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0">
          <Clock size={11} className="text-slate-500" />
          <span>CI Duration: {(testResults.durationMs || 1240) / 1000}s</span>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="px-4 border-b border-white/[0.06] bg-[#0c0e16] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("pr_overview")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pr_overview"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText size={13} />
            <span>PR Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("file_diffs")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "file_diffs"
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode2 size={13} />
            <span>Git Diffs ({worktree.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("test_runner")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "test_runner"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal size={13} />
            <span>CI Test Suite Log</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {testResults.passed || 12}/{testResults.totalTests || 12}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("preview_deploy")}
            className={`px-3.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "preview_deploy"
                ? "border-purple-500 text-purple-400 bg-purple-500/5 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ExternalLink size={13} />
            <span>Live Container Preview</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* TAB 1: PR OVERVIEW */}
          {activeTab === "pr_overview" && (
            <motion.div
              key="pr_overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-5 overflow-y-auto bg-[#090b10] text-[12px] text-slate-300 space-y-4"
            >
              <div className="max-w-3xl mx-auto space-y-4">
                {/* PR Banner Header */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-purple-400 font-bold">{config.issueTicket || "#104"} • {pullRequest.author || "Cortex DevOps Bot"}</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
                      Checks Passed
                    </span>
                  </div>
                  <h2 className="text-[16px] font-bold text-slate-100 leading-snug">{pullRequest.title}</h2>
                  <p className="text-[12px] text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                    {pullRequest.summary}
                  </p>
                </div>

                {/* Changes breakdown */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Key Modifications</h4>
                  <div className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {pullRequest.changesSummary}
                  </div>
                </div>

                {/* Regression & Benchmark Report */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={13} /> Regression & Performance Report
                  </h4>
                  <p className="text-[11px] text-slate-300 font-mono bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg">
                    {pullRequest.regressionReport || "0 performance regressions detected. All assertions passed cleanly."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: GIT FILE DIFFS */}
          {activeTab === "file_diffs" && (
            <motion.div
              key="file_diffs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full grid grid-cols-12 overflow-hidden"
            >
              {/* File Tree List */}
              <div className="col-span-12 lg:col-span-4 border-r border-white/[0.06] overflow-y-auto p-3 space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Modified Repository Files</span>
                {worktree.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-[11px] font-mono ${
                      selectedFileIndex === idx
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-bold"
                        : "bg-white/[0.02] border-white/[0.05] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="truncate">{file.path}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      file.status === "ADDED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {file.status}
                    </span>
                  </button>
                ))}
              </div>

              {/* Diff / Code Viewer */}
              <div className="col-span-12 lg:col-span-8 overflow-hidden flex flex-col bg-[#050608]">
                <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{currentFile?.path}</span>
                  <span className="text-emerald-400">{currentFile?.status}</span>
                </div>
                <div className="flex-1">
                  <Editor
                    theme="vs-dark"
                    language="diff"
                    value={currentFile?.diff || currentFile?.content || ""}
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
              </div>
            </motion.div>
          )}

          {/* TAB 3: CI TEST RUNNER LOG */}
          {activeTab === "test_runner" && (
            <motion.div
              key="test_runner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col bg-[#050608]"
            >
              <div className="p-3 bg-[#0d0f17] border-b border-white/[0.06] flex items-center justify-between px-4 text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> {testResults.passed || 12} Passed
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-rose-400 font-bold">{testResults.failed || 0} Failed</span>
                </div>
                <span>Framework: {config.testFramework || "Jest"}</span>
              </div>
              <div className="flex-1 p-4 font-mono text-[11px] text-emerald-300/90 overflow-y-auto leading-relaxed bg-[#040507]">
                <pre className="whitespace-pre-wrap">{testResults.testOutput || "Test output logs loaded."}</pre>
              </div>
            </motion.div>
          )}

          {/* TAB 4: LIVE CONTAINER PREVIEW */}
          {activeTab === "preview_deploy" && (
            <motion.div
              key="preview_deploy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col bg-[#090b10] items-center justify-center p-6 text-center"
            >
              <div className="max-w-md bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                  <ExternalLink size={24} />
                </div>
                <h3 className="text-[15px] font-bold text-slate-100">Live Preview Deployment</h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Containerized isolated preview sandbox deployed automatically for Pull Request #{pullRequest.prNumber || 42}.
                </p>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-purple-300 truncate">
                  {pullRequest.previewDeployUrl || "https://preview-pr-42.cortex.dev"}
                </div>
                <a
                  href={pullRequest.previewDeployUrl || "https://preview-pr-42.cortex.dev"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold transition cursor-pointer shadow-lg shadow-purple-500/20"
                >
                  <span>Open Preview Environment</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Refine / Re-Simulate Input Bar */}
      <form onSubmit={handleRefineDevOps} className="p-3 bg-[#0d0f17] border-t border-white/[0.08] flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={refinePromptText}
            onChange={(e) => setRefinePromptText(e.target.value)}
            placeholder="Refine PR (e.g. 'Add unit test for negative auth scenarios', 'Update README')..."
            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 rounded-xl px-3.5 py-2 text-[12px] text-slate-100 placeholder-slate-500 focus:outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={!refinePromptText.trim() || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-[12px] font-semibold transition cursor-pointer shadow-md shrink-0"
        >
          <Sparkles size={13} />
          <span>Re-Simulate PR</span>
        </button>
      </form>
    </div>
  );
}
