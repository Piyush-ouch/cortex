import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import mermaid from "mermaid";
import Editor from "@monaco-editor/react";
import {
  Database,
  Layers,
  FileCode,
  ArrowRightLeft,
  Copy,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMessage, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";

// Initialize mermaid once with dark theme configuration
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  themeVariables: {
    darkMode: true,
    background: "#0d0f14",
    primaryColor: "#6366f1",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#818cf8",
    lineColor: "#94a3b8",
    secondaryColor: "#1e1b4b",
    tertiaryColor: "#0f172a"
  },
  er: {
    useMaxWidth: false,
    layoutDirection: "TB"
  }
});

export default function DatabaseSchemaPanel({ artifact }) {
  const [activeTab, setActiveTab] = useState("erd"); // 'erd' | 'prisma' | 'migrations'
  const [activeDialect, setActiveDialect] = useState("postgresql"); // 'postgresql' | 'mysql' | 'mongodb'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagramSvg, setDiagramSvg] = useState("");
  const [renderError, setRenderError] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState("");

  const diagramContainerRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);

  // Extract artifact files & schema fields
  const prismaFile = artifact?.files?.find(f => f.name === "schema.prisma")?.content
    || artifact?.prismaSchema || "";
  const mermaidCode = artifact?.files?.find(f => f.name === "erd.mermaid")?.content
    || artifact?.mermaidErd || "erDiagram\n USER ||--o{ ORDER : places";
  const postgresSql = artifact?.files?.find(f => f.name === "migration_postgres.sql")?.content
    || artifact?.postgresMigration || "";
  const mysqlSql = artifact?.files?.find(f => f.name === "migration_mysql.sql")?.content
    || artifact?.mysqlMigration || "";
  const mongoJs = artifact?.files?.find(f => f.name === "migration_mongo.js")?.content
    || artifact?.mongoMigration || "";

  // Render Mermaid Diagram
  useEffect(() => {
    let isMounted = true;
    async function renderMermaid() {
      if (!mermaidCode) return;
      try {
        setRenderError(null);
        const uniqueId = `mermaid-erd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const cleanMermaid = mermaidCode.trim().startsWith("erDiagram")
          ? mermaidCode.trim()
          : `erDiagram\n${mermaidCode.trim()}`;

        const { svg } = await mermaid.render(uniqueId, cleanMermaid);
        if (isMounted) {
          setDiagramSvg(svg);
        }
      } catch (err) {
        console.warn("Mermaid ERD render error:", err);
        if (isMounted) {
          setRenderError("Could not render visual ERD diagram due to syntax formatting. Displaying raw Mermaid code.");
        }
      }
    }
    renderMermaid();
    return () => {
      isMounted = false;
    };
  }, [mermaidCode]);

  // Copy helper
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download helper
  const handleDownload = (filename, content, mimeType = "text/plain") => {
    if (!content) return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download SVG or PNG helper for diagram
  const handleDownloadDiagram = (format = "svg") => {
    if (format === "svg" && diagramSvg) {
      handleDownload("schema_erd.svg", diagramSvg, "image/svg+xml");
      return;
    }

    if (format === "png" && diagramContainerRef.current) {
      const svgElement = diagramContainerRef.current.querySelector("svg");
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width || 1200;
        canvas.height = img.height || 800;
        if (ctx) {
          ctx.fillStyle = "#0d0f14";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = "schema_erd.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  // Handle refinement request
  const handleRefineSubmit = async (e) => {
    e.preventDefault();
    if (!refinePrompt.trim() || isLoading) return;

    const userText = `Refine Database Schema: ${refinePrompt}`;
    setRefinePrompt("");
    dispatch(addMessage({ role: "user", content: userText }));
    dispatch(setIsLoading(true));

    try {
      await sendPrompt({
        prompt: userText,
        conversationId: selectedConversation?._id,
        agent: "database"
      });
    } catch (err) {
      console.error("Failed to refine schema:", err);
    } finally {
      dispatch(setIsLoading(false));
    }
  };

  // Get active migration code by dialect
  const getActiveMigrationCode = () => {
    switch (activeDialect) {
      case "mysql":
        return mysqlSql;
      case "mongodb":
        return mongoJs;
      case "postgresql":
      default:
        return postgresSql;
    }
  };

  return (
    <div className={`flex flex-col bg-[#0d0f14] text-slate-100 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden h-full ${isFullscreen ? "fixed inset-2 z-50 rounded-xl" : "relative"}`}>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#13151c] border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {artifact?.title || "Database Schema & Migration"}
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Prisma & ERD
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Generates Prisma ORM, Mermaid ERD, and SQL/MongoDB migrations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#10121a] border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 bg-[#0a0c10] p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab("erd")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "erd"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Layers size={14} />
            ERD Diagram
          </button>

          <button
            onClick={() => setActiveTab("prisma")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "prisma"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <FileCode size={14} />
            Prisma Schema
          </button>

          <button
            onClick={() => setActiveTab("migrations")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "migrations"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <ArrowRightLeft size={14} />
            Migrations
          </button>
        </div>

        {/* Action Controls based on Tab */}
        <div className="flex items-center gap-2">
          {activeTab === "erd" && (
            <>
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-colors"
                title="Reset Zoom"
              >
                <RefreshCw size={14} />
              </button>

              <div className="h-4 w-px bg-white/[0.08] mx-1" />

              <button
                onClick={() => handleDownloadDiagram("svg")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                <Download size={13} />
                SVG
              </button>
              <button
                onClick={() => handleDownloadDiagram("png")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                <Download size={13} />
                PNG
              </button>
            </>
          )}

          {activeTab === "prisma" && (
            <>
              <button
                onClick={() => handleCopy(prismaFile)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => handleDownload("schema.prisma", prismaFile)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
              >
                <Download size={13} />
                Download .prisma
              </button>
            </>
          )}

          {activeTab === "migrations" && (
            <>
              <button
                onClick={() => handleCopy(getActiveMigrationCode())}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Migration"}
              </button>
              <button
                onClick={() => handleDownload(`migration_${activeDialect}.${activeDialect === "mongodb" ? "js" : "sql"}`, getActiveMigrationCode())}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
              >
                <Download size={13} />
                Download Script
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Content Body ─── */}
      <div className="flex-1 overflow-hidden relative bg-[#090b0e]">
        {/* Tab 1: ERD Visualizer */}
        {activeTab === "erd" && (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-6 select-none relative">
            {renderError ? (
              <div className="flex flex-col items-center justify-center max-w-lg text-center gap-3 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <AlertCircle size={24} />
                <p className="text-xs">{renderError}</p>
                <pre className="text-left text-xs bg-black/40 p-4 rounded-xl border border-amber-500/20 w-full overflow-x-auto text-amber-200/80">
                  {mermaidCode}
                </pre>
              </div>
            ) : diagramSvg ? (
              <div
                ref={diagramContainerRef}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="transition-transform duration-150 ease-out flex items-center justify-center min-w-max min-h-max"
                dangerouslySetInnerHTML={{ __html: diagramSvg }}
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <RefreshCw size={14} className="animate-spin" />
                Rendering ERD diagram...
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Prisma Schema Editor */}
        {activeTab === "prisma" && (
          <div className="w-full h-full">
            <Editor
              height="100%"
              defaultLanguage="graphql"
              theme="vs-dark"
              value={prismaFile}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        )}

        {/* Tab 3: Migration Scripts Editor */}
        {activeTab === "migrations" && (
          <div className="w-full h-full flex flex-col">
            {/* Dialect Selector Bar */}
            <div className="flex items-center gap-2 px-5 py-2 bg-[#12141c] border-b border-white/[0.06]">
              <span className="text-xs text-slate-400 font-medium">Target Dialect:</span>
              <button
                onClick={() => setActiveDialect("postgresql")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeDialect === "postgresql"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                PostgreSQL (SQL)
              </button>

              <button
                onClick={() => setActiveDialect("mysql")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeDialect === "mysql"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                MySQL (SQL)
              </button>

              <button
                onClick={() => setActiveDialect("mongodb")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeDialect === "mongodb"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                MongoDB (Mongoose)
              </button>
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage={activeDialect === "mongodb" ? "javascript" : "sql"}
                theme="vs-dark"
                value={getActiveMigrationCode()}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  padding: { top: 12, bottom: 12 }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Interactive Schema Refinement Bar ─── */}
      <form onSubmit={handleRefineSubmit} className="flex items-center gap-2 p-3 bg-[#13151c] border-t border-white/[0.08]">
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Ask Database Agent to add tables, indexes, or modify constraints..."
            className="w-full pl-3.5 pr-10 py-2 rounded-xl text-xs bg-[#090b0e] border border-white/[0.08] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!refinePrompt.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
