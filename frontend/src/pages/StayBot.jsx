import React, { useState, useRef, useEffect } from "react";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./StayBot.css";
import "./StayBotHistory.css";

function StayBot() {
  const welcomeMessage = { role: "bot", content: "Hi! I'm StayBot. Tell me what kind of PG you're looking for — location, budget, room type, amenities. I'll search the real database for you." };
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const bottomRef = useRef(null);
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const { isTenant } = useAuth();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    let active = true;

    const loadLatestConversation = async () => {
      try {
        const res = await api.get("/ai/conversations");
        if (!active) return;
        const savedConversations = res.data.data.conversations || [];
        setConversations(savedConversations);
        if (savedConversations.length) {
          const latest = savedConversations[0];
          const detail = await api.get(`/ai/conversations/${latest.id}`);
          if (!active) return;
          setConversationId(latest.id);
          const savedMessages = detail.data.data.messages || [];
          setMessages(savedMessages.length ? savedMessages.map(saved => ({
            role: saved.role === "assistant" ? "bot" : "user",
            content: saved.content,
            pgs: saved.pgs || [],
          })) : [welcomeMessage]);
        }
      } catch (err) {
        if (active) showToast(err.message || "Couldn't load your saved chat history.", "error");
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    loadLatestConversation();

    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    if (!isTenant) return;
    api.get("/favorites")
      .then(res => setFavorites((res.data.data || []).map(favorite => favorite.pg_id)))
      .catch(err => showToast(err.message || "Couldn't load saved PGs.", "error"));
  }, [isTenant, showToast]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading || historyLoading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(item => item.role === "user" || item.role === "bot")
        .slice(-8)
        .map(item => ({
          role: item.role === "bot" ? "assistant" : "user",
          content: item.content,
          pgs: item.pgs || [],
        }));
      const res = await api.post("/ai/chat", { message: msg, conversationId, conversationHistory }, { timeout: 90000 });
      const { message: botMsg, pgs, conversation, conversationId: activeConversationId } = res.data.data;
      if (conversation?.id) {
        setConversationId(conversation.id);
        setConversations(prev => [conversation, ...prev.filter(item => item.id !== conversation.id)]);
      } else if (activeConversationId) {
        setConversationId(activeConversationId);
      } else {
        setConversationId(null);
      }
      setMessages(prev => [...prev, { role: "bot", content: botMsg, pgs: pgs || [] }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", content: err.message || "StayBot request failed. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  const handleFavorite = async pg => {
    try {
      if (favorites.includes(pg.id)) {
        await api.delete(`/favorites/${pg.id}`);
        setFavorites(prev => prev.filter(id => id !== pg.id));
        showToast("Removed from favorites.", "info");
      } else {
        await api.post("/favorites", { pg_id: pg.id });
        setFavorites(prev => [...prev, pg.id]);
        showToast("Saved to favorites.", "success");
      }
    } catch (err) {
      showToast(err.message || "Couldn't update favorites.", "error");
    }
  };

  const startNewChat = () => {
    if (loading || historyLoading) return;
    setConversationId(null);
    setMessages([welcomeMessage]);
    setInput("");
    setHistoryOpen(false);
  };

  const openConversation = async id => {
    if (id === conversationId) {
      setHistoryOpen(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await api.get(`/ai/conversations/${id}`);
      setConversationId(id);
      const savedMessages = res.data.data.messages || [];
      setMessages(savedMessages.length ? savedMessages.map(saved => ({
        role: saved.role === "assistant" ? "bot" : "user",
        content: saved.content,
        pgs: saved.pgs || [],
      })) : [welcomeMessage]);
      setHistoryOpen(false);
    } catch (err) {
      showToast(err.message || "Couldn't open that conversation.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteConversation = async (event, id) => {
    event.stopPropagation();
    if (loading || !window.confirm("Delete this conversation and its messages?")) return;
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations(prev => prev.filter(item => item.id !== id));
      if (conversationId === id) startNewChat();
      showToast("Conversation deleted.", "success");
    } catch (err) {
      showToast(err.message || "Couldn't delete that conversation.", "error");
    }
  };

  const suggestions = [
    "Single room under 7000 with WiFi and food",
    "2-sharing PG in Koramangala with AC",
    "PG under 5000 with food included",
    "Furnished single room with attached bathroom",
  ];

  return (
    <div className="staybot-page">
      <div className="staybot-layout">
        {historyOpen && <button className="history-backdrop" aria-label="Close chat history" onClick={() => setHistoryOpen(false)} />}
        <aside className={`staybot-history ${historyOpen ? "history-open" : ""}`} aria-label="Chat history">
          <div className="history-heading">
            <h2>Chats</h2>
            <button className="history-new-chat" onClick={startNewChat} disabled={loading || historyLoading}>+ New chat</button>
          </div>
          <div className="history-list">
            {conversations.map(item => (
              <div className={`history-item ${item.id === conversationId ? "history-item-active" : ""}`} key={item.id}>
                <button className="history-select" onClick={() => openConversation(item.id)} disabled={historyLoading || loading}>
                  <span>{item.title}</span>
                  <small>{new Date(item.updated_at).toLocaleDateString()}</small>
                </button>
                <button className="history-delete" onClick={event => deleteConversation(event, item.id)} disabled={loading} title="Delete conversation" aria-label={`Delete ${item.title}`}>×</button>
              </div>
            ))}
            {!conversations.length && <p className="history-empty">Your saved chats will appear here.</p>}
          </div>
        </aside>

        <main className="staybot-main">
          <div className="staybot-heading-row">
            <button className="history-toggle" onClick={() => setHistoryOpen(open => !open)} aria-expanded={historyOpen}>History</button>
            <div className="staybot-header">
              <h1>🤖 StayBot</h1>
              <p>Ask me about PGs in plain language. I search the real database for you.</p>
            </div>
          </div>

          <div className="staybot-chat">
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={"chat-message " + (msg.role === "user" ? "user-message" : "bot-message")}>
                  {msg.role === "bot" && <div className="bot-avatar">🤖</div>}
                  <div className="message-bubble">
                    <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                    {msg.pgs && msg.pgs.length > 0 && (
                      <div className="bot-pg-cards">
                        {msg.pgs.map(pg => (
                          <PGCard key={pg.id} pg={pg} isAuthenticated={true}
                            onFavorite={isTenant ? handleFavorite : undefined} isFavorited={favorites.includes(pg.id)}
                            onCompare={handleCompare} isCompared={isInCompare(pg.id)} canCompare={canAdd} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-message bot-message">
                  <div className="bot-avatar">🤖</div>
                  <div className="message-bubble typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length === 1 && (
              <div className="chat-suggestions">
                <p className="suggestions-label">Try asking:</p>
                <div className="suggestions-list">
                  {suggestions.map(s => <button key={s} className="suggestion-btn" onClick={() => setInput(s)}>{s}</button>)}
                </div>
              </div>
            )}

            <div className="chat-input-area">
              <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask about PGs... (e.g. single room under 7000 with food)" rows={2} disabled={loading || historyLoading} />
              <button className="btn btn-primary chat-send-btn" onClick={send} disabled={loading || historyLoading || !input.trim()}>
                {loading ? "..." : historyLoading ? "Loading..." : "Send"}
              </button>
            </div>
            <p className="chat-note">StayBot only shows real PGs from the database. Results may vary based on available listings.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default StayBot;
