import { useEffect, useState } from "react";
import { Plus, MessageSquare, Settings, LogOut, User, PenSquare, Menu, X, Coins, ConeIcon, CoinsIcon, BookOpen } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { createConversation, getConversations } from "../features/conversation.api";
import { addConversation, setConversations, setSelectedConversation } from "../redux/conversation.slice";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages } from "../redux/message.slice";
import BillingDrawer from "./BillingDrawer";
import KnowledgeBaseDrawer from "./KnowledgeBaseDrawer";

export default function Sidebar() {
  const [hovered, setHovered]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { userData } = useSelector(state => state.user);
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();
  const [showBilling, setShowBilling] = useState(false);
  const [showKB, setShowKB] = useState(false);

  const logout = async () => {
    try {
      await api.get("/api/auth/logout");
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        dispatch(setConversations(data));
      } catch (error) {
        console.log(error);
      }
    };
    fetchConversations();
  }, [userData?._id]);

  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false);
  };

  const handleSelectConversation = async (conversation) => {
    setMobileOpen(false);
    dispatch(setSelectedConversation(conversation));
    const messages = await getMessages(conversation._id);
    dispatch(setMessages(messages));
    const latestArtifactMessage = Array.isArray(messages)
      ? [...messages].reverse().find(msg => msg.artifacts && msg.artifacts.length > 0)
      : null;
    dispatch(setArtifacts(latestArtifactMessage ? latestArtifactMessage.artifacts : []));
  };

  const PanelIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );

  /* ── Collapsed rail — desktop only ── */
  const CollapsedRail = () => (
    <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0d0f14] border-r border-white/[0.06] py-4 gap-1 shrink-0">
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
      >
        <PanelIcon />
      </button>

      <button
        onClick={handleCreateConversation}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
      >
        <Plus size={17} />
      </button>

      <button
        onClick={() => setShowKB(true)}
        title="Knowledge Base"
        className="flex items-center justify-center w-9 h-9 rounded-xl text-indigo-400 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mt-1"
      >
        <BookOpen size={16} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              title={chat.title}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}
            >
              <MessageSquare size={15} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        {userData && (
          <div className="relative">
            {userData.avatar && !imageError ? (
              <img
                src={userData.avatar}
                alt={userData.name}
                className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-indigo-500/30"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400">
                <User size={14} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Sidebar content ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full py-3">
      {/* Top Header */}
      <div className="px-3.5 flex items-center justify-between h-10 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
            C
          </div>
          <span className="text-[14px] font-semibold text-slate-100 tracking-tight">CortexAI</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <PanelIcon />
        </button>
      </div>

      {/* New Chat & KB Buttons */}
      <div className="px-3 space-y-1 mb-3">
        <button
          onClick={handleCreateConversation}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] transition-all duration-150 cursor-pointer shadow-sm"
        >
          <Plus size={16} className="text-indigo-400" />
          <span>New Chat</span>
        </button>
        <button
          onClick={() => setShowKB(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all duration-150 cursor-pointer"
        >
          <BookOpen size={15} className="text-indigo-400" />
          <span>Knowledge Base</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[11px] font-medium text-slate-500 px-2 py-1 block uppercase tracking-wider">Recent Chats</span>
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-150 border-none cursor-pointer text-left truncate
                ${isActive ? "bg-indigo-500/15 text-indigo-300 font-medium" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}
            >
              <MessageSquare size={14} className={isActive ? "text-indigo-400 shrink-0" : "text-slate-500 shrink-0"} />
              <span className="truncate">{chat.title || "Untitled Conversation"}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-2.5 h-px bg-white/[0.06] my-2" />

      {/* Footer User Info */}
      <div className="px-3 py-2">
        {userData ? (
          <div className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2.5 py-2 hover:bg-white/[0.05] transition-colors duration-150">
            <div className="relative shrink-0">
              {!userData?.avatar || imageError ? (
                <div className="w-8 h-8 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
                  <User size={14} className="text-slate-400" />
                </div>
              ) : (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-8 h-8 rounded-[10px] object-cover border border-indigo-500/25"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-100 truncate">{userData.name}</p>
              <p className="text-[10.5px] text-slate-500">{userData.plan || "Free Plan"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKB(true)}
                title="Knowledge Base"
                className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-indigo-400 cursor-pointer hover:bg-white/[0.08] transition-all duration-150"
              >
                <BookOpen size={15} />
              </button>
              <button
                onClick={() => setShowBilling(true)}
                title="Billing"
                className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-amber-500 cursor-pointer hover:bg-white/[0.08] transition-all duration-150"
              >
                <CoinsIcon size={15} />
              </button>
              <button
                onClick={logout}
                title="Logout"
                className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer hover:bg-white/[0.08] hover:text-slate-300 transition-all duration-150"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (collapsed) return <CollapsedRail />;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        bg-[#0d0f14] border-r border-white/[0.06]
        transition-transform duration-250
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <SidebarContent />
      </div>

      <BillingDrawer
        open={showBilling}
        onClose={() => setShowBilling(false)}
      />

      <KnowledgeBaseDrawer
        isOpen={showKB}
        onClose={() => setShowKB(false)}
      />
    </>
  );
}