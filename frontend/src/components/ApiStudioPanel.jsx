import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import {
  Globe,
  Play,
  FileCode,
  Download,
  Copy,
  Check,
  Code2,
  Layers,
  Send,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Terminal,
  FileJson
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMessage, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";
import api from "../utils/axios";

export default function ApiStudioPanel({ artifact }) {
  const [activeTab, setActiveTab] = useState("mock_studio"); // 'mock_studio' | 'openapi' | 'postman' | 'sdks'
  const [activeSdk, setActiveSdk] = useState("curl"); // 'curl' | 'typescript' | 'python' | 'go' | 'rust'
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");

  // Request & Mock Execution States
  const [requestTab, setRequestTab] = useState("body"); // 'headers' | 'params' | 'body'
  const [customPath, setCustomPath] = useState("");
  const [customHeaders, setCustomHeaders] = useState([
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer sample_token_123" }
  ]);
  const [requestBodyText, setRequestBodyText] = useState("{}");
  const [isExecutingMock, setIsExecutingMock] = useState(false);
  const [mockResponse, setMockResponse] = useState(null);

  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);

  // Extract artifact files & structures
  const openapiYaml = artifact?.files?.find(f => f.name === "openapi.yaml")?.content
    || artifact?.openapiYaml || "";
  const postmanCollection = artifact?.files?.find(f => f.name === "postman_collection.json")?.content
    || artifact?.postmanCollection || "{}";

  let clientSdks = {};
  try {
    const sdkContent = artifact?.files?.find(f => f.name === "client_sdks.json")?.content || artifact?.clientSdks;
    clientSdks = typeof sdkContent === "string" ? JSON.parse(sdkContent) : (sdkContent || {});
  } catch (e) {
    clientSdks = {};
  }

  let mockEndpoints = [];
  try {
    const mockContent = artifact?.files?.find(f => f.name === "mock_endpoints.json")?.content || artifact?.mockEndpoints;
    mockEndpoints = typeof mockContent === "string" ? JSON.parse(mockContent) : (mockContent || []);
  } catch (e) {
    mockEndpoints = [];
  }

  const selectedEndpoint = mockEndpoints?.[selectedEndpointIndex] || mockEndpoints?.[0];

  // Update selected endpoint parameters on selection change
  useEffect(() => {
    if (selectedEndpoint) {
      setCustomPath(selectedEndpoint.path || "");
      if (selectedEndpoint.sampleRequestBody) {
        setRequestBodyText(JSON.stringify(selectedEndpoint.sampleRequestBody, null, 2));
      } else {
        setRequestBodyText("{}");
      }
      setMockResponse({
        status: selectedEndpoint.status || 200,
        statusText: selectedEndpoint.status === 201 ? "Created" : "OK",
        executionTimeMs: 45,
        headers: selectedEndpoint.headers || { "content-type": "application/json" },
        data: selectedEndpoint.responseBody || {}
      });
    }
  }, [selectedEndpointIndex, artifact?.id]);

  // Execute Mock Request via API Controller
  const handleExecuteMock = async () => {
    if (!customPath || isExecutingMock) return;
    setIsExecutingMock(true);

    let parsedBody = null;
    try {
      if (requestBodyText && (selectedEndpoint?.method === "POST" || selectedEndpoint?.method === "PUT")) {
        parsedBody = JSON.parse(requestBodyText);
      }
    } catch (e) {
      console.warn("Invalid request body JSON format");
    }

    try {
      const headersObj = {};
      customHeaders.forEach(h => {
        if (h.key.trim()) headersObj[h.key.trim()] = h.value;
      });

      const { data } = await api.post("/api/agent/mock-api/execute", {
        path: customPath,
        method: selectedEndpoint?.method || "GET",
        headers: headersObj,
        body: parsedBody,
        mockEndpoints
      });

      setMockResponse(data);
    } catch (err) {
      setMockResponse({
        status: err.response?.status || 500,
        statusText: "Error",
        executionTimeMs: 120,
        headers: { "content-type": "application/json" },
        data: err.response?.data || { error: err.message }
      });
    } finally {
      setIsExecutingMock(false);
    }
  };

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

  // Handle refinement request
  const handleRefineSubmit = async (e) => {
    e.preventDefault();
    if (!refinePrompt.trim() || isLoading) return;

    const userText = `Refine REST API Spec & Endpoints: ${refinePrompt}`;
    setRefinePrompt("");
    dispatch(addMessage({ role: "user", content: userText }));
    dispatch(setIsLoading(true));

    try {
      await sendPrompt({
        prompt: userText,
        conversationId: selectedConversation?._id,
        agent: "api_designer"
      });
    } catch (err) {
      console.error("Failed to refine API spec:", err);
    } finally {
      dispatch(setIsLoading(false));
    }
  };

  const getMethodBadgeClass = (method = "GET") => {
    switch (method.toUpperCase()) {
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "GET":
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  return (
    <div className={`flex flex-col bg-[#0d0f14] text-slate-100 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden h-full ${isFullscreen ? "fixed inset-2 z-50 rounded-xl" : "relative"}`}>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#13151c] border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {artifact?.title || "REST API Spec & Mock Studio"}
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                OpenAPI 3.0 & Mock Runner
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              OpenAPI spec, Postman collection, client SDKs, and live mock API endpoint testing
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
            onClick={() => setActiveTab("mock_studio")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "mock_studio"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Play size={14} />
            Live Mock Studio
          </button>

          <button
            onClick={() => setActiveTab("openapi")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "openapi"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <FileCode size={14} />
            OpenAPI Spec
          </button>

          <button
            onClick={() => setActiveTab("postman")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "postman"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <FileJson size={14} />
            Postman Collection
          </button>

          <button
            onClick={() => setActiveTab("sdks")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "sdks"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Code2 size={14} />
            Client SDKs
          </button>
        </div>

        {/* Action Controls based on active tab */}
        <div className="flex items-center gap-2">
          {activeTab === "openapi" && (
            <>
              <button
                onClick={() => handleCopy(openapiYaml)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy YAML"}
              </button>
              <button
                onClick={() => handleDownload("openapi.yaml", openapiYaml)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
              >
                <Download size={13} />
                Download YAML
              </button>
            </>
          )}

          {activeTab === "postman" && (
            <>
              <button
                onClick={() => handleCopy(postmanCollection)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Collection"}
              </button>
              <button
                onClick={() => handleDownload("postman_collection.json", postmanCollection, "application/json")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
              >
                <Download size={13} />
                Download Postman JSON
              </button>
            </>
          )}

          {activeTab === "sdks" && (
            <button
              onClick={() => handleCopy(clientSdks[activeSdk] || "")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy Code"}
            </button>
          )}
        </div>
      </div>

      {/* ─── Content Body ─── */}
      <div className="flex-1 overflow-hidden relative bg-[#090b0e]">
        {/* Tab 1: Live Mock Studio */}
        {activeTab === "mock_studio" && (
          <div className="w-full h-full flex overflow-hidden">
            {/* Sidebar Endpoint List */}
            <div className="w-64 bg-[#0d0f14] border-r border-white/[0.06] flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Server size={14} className="text-indigo-400" />
                  Mock Endpoints ({mockEndpoints.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {mockEndpoints.map((ep, idx) => (
                  <button
                    key={ep.id || idx}
                    onClick={() => setSelectedEndpointIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 ${
                      selectedEndpointIndex === idx
                        ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                        : "bg-transparent border-transparent hover:bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${getMethodBadgeClass(ep.method)}`}>
                        {ep.method || "GET"}
                      </span>
                      <span className="text-xs font-medium font-mono text-slate-200 truncate">
                        {ep.path}
                      </span>
                    </div>
                    {ep.summary && (
                      <span className="text-[11px] text-slate-400 truncate pl-0.5">
                        {ep.summary}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Tester View */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#090b0e]">
              {/* Request URL Bar */}
              <div className="p-4 bg-[#12141c] border-b border-white/[0.06] flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase border ${getMethodBadgeClass(selectedEndpoint?.method)}`}>
                  {selectedEndpoint?.method || "GET"}
                </span>

                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-mono bg-[#090b0e] border border-white/[0.08] text-slate-100 focus:outline-none focus:border-indigo-500/50"
                />

                <button
                  onClick={handleExecuteMock}
                  disabled={isExecutingMock}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Play size={13} className={isExecutingMock ? "animate-spin" : "fill-current"} />
                  {isExecutingMock ? "Executing..." : "Execute Mock"}
                </button>
              </div>

              {/* Request Config & Response Split */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Request Config Pane */}
                <div className="w-full lg:w-1/2 border-r border-white/[0.06] flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#0f1118] border-b border-white/[0.06] text-xs">
                    <button
                      onClick={() => setRequestTab("body")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        requestTab === "body" ? "bg-white/[0.08] text-indigo-300" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Request Body
                    </button>
                    <button
                      onClick={() => setRequestTab("headers")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        requestTab === "headers" ? "bg-white/[0.08] text-indigo-300" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Headers ({customHeaders.length})
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden p-2">
                    {requestTab === "body" ? (
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme="vs-dark"
                        value={requestBodyText}
                        onChange={(val) => setRequestBodyText(val || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          wordWrap: "on",
                          scrollBeyondLastLine: false,
                          lineNumbers: "on"
                        }}
                      />
                    ) : (
                      <div className="p-3 space-y-2 text-xs font-mono">
                        {customHeaders.map((h, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={h.key}
                              onChange={(e) => {
                                const next = [...customHeaders];
                                next[i].key = e.target.value;
                                setCustomHeaders(next);
                              }}
                              className="w-1/3 px-2 py-1 rounded bg-[#090b0e] border border-white/[0.08] text-slate-200"
                            />
                            <input
                              type="text"
                              value={h.value}
                              onChange={(e) => {
                                const next = [...customHeaders];
                                next[i].value = e.target.value;
                                setCustomHeaders(next);
                              }}
                              className="flex-1 px-2 py-1 rounded bg-[#090b0e] border border-white/[0.08] text-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Response Pane */}
                <div className="w-full lg:w-1/2 flex flex-col bg-[#0b0d12]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#0f1118] border-b border-white/[0.06]">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal size={14} className="text-emerald-400" />
                      Live Mock Response
                    </span>

                    {mockResponse && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          mockResponse.status < 300
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {mockResponse.status} {mockResponse.statusText || "OK"}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                          <Clock size={12} />
                          {mockResponse.executionTimeMs || 45}ms
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={JSON.stringify(mockResponse?.data || {}, null, 2)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        lineNumbers: "on"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: OpenAPI Specification */}
        {activeTab === "openapi" && (
          <div className="w-full h-full">
            <Editor
              height="100%"
              defaultLanguage="yaml"
              theme="vs-dark"
              value={openapiYaml}
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

        {/* Tab 3: Postman Collection */}
        {activeTab === "postman" && (
          <div className="w-full h-full">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              value={postmanCollection}
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

        {/* Tab 4: Client SDKs */}
        {activeTab === "sdks" && (
          <div className="w-full h-full flex flex-col">
            {/* SDK Language Selector */}
            <div className="flex items-center gap-2 px-5 py-2 bg-[#12141c] border-b border-white/[0.06]">
              <span className="text-xs text-slate-400 font-medium">Target Language:</span>
              {["curl", "typescript", "python", "go", "rust"].map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveSdk(lang)}
                  className={`px-3 py-1 rounded-md text-xs font-medium uppercase transition-colors ${
                    activeSdk === lang
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage={activeSdk === "curl" ? "shell" : activeSdk}
                theme="vs-dark"
                value={clientSdks[activeSdk] || `// SDK code for ${activeSdk}`}
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

      {/* ─── Bottom Interactive Refinement Bar ─── */}
      <form onSubmit={handleRefineSubmit} className="flex items-center gap-2 p-3 bg-[#13151c] border-t border-white/[0.08]">
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Ask API Agent to add endpoints, auth headers, or modify schemas..."
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
