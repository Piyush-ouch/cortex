import { useState, useEffect } from "react";
import { X, UploadCloud, FileText, Trash2, CheckCircle2, Loader2, Database, BookOpen } from "lucide-react";
import { uploadKBDocument, getKBDocuments, deleteKBDocument } from "../features/kb.api";
import { motion, AnimatePresence } from "framer-motion";

export default function KnowledgeBaseDrawer({ isOpen, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await getKBDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      console.error("Fetch KB error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
  }, [isOpen]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setNotification(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadKBDocument(formData);
      if (res.success) {
        setNotification({ type: "success", text: res.message || "File indexed successfully!" });
        fetchDocs();
      }
    } catch (err) {
      console.error("Upload KB Error:", err);
      setNotification({
        type: "error",
        text: err.response?.data?.message || "Failed to index file into Knowledge Base."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteKBDocument(id);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d._id !== id));
      }
    } catch (err) {
      console.error("Delete KB error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-[#0f1117] border-l border-white/[0.08] flex flex-col text-slate-200 shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Persistent Knowledge Base</h2>
                <p className="text-[12px] text-slate-400">Upload documents once, query across all chats</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="p-5 border-b border-white/[0.08]">
            <label
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 ${
                dragActive
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-white/[0.12] hover:border-indigo-500/50 bg-white/[0.02]"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
                disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="animate-spin text-indigo-400" size={24} />
                  <span className="text-xs text-indigo-300 font-medium">Extracting & Vectorizing Chunks...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <UploadCloud className="text-slate-400" size={26} />
                  <span className="text-xs font-medium text-slate-200">
                    Click or drag PDF / Text files here
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Indexed into your personal vector store
                  </span>
                </div>
              )}
            </label>

            {notification && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  notification.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {notification.type === "success" && <CheckCircle2 size={14} />}
                <span>{notification.text}</span>
              </div>
            )}
          </div>

          {/* Indexed Documents List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Indexed Documents ({documents.length})
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <Database size={24} className="mx-auto mb-2 opacity-50" />
                No documents in your Knowledge Base yet.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{doc.fileName}</p>
                      <p className="text-[11px] text-slate-500">
                        {doc.chunkCount} vector chunks • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
