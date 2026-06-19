import { useState, useRef, useEffect } from "react";

const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

// ⬇️ Replace with your deployed Cloudflare Worker URL
const SEARCH_WORKER_URL = import.meta.env.VITE_SEARCH_WORKER_URL || "";

const SYSTEM_PROMPT = `You are Nevaeh, an intelligent, warm, and elegant AI assistant. You are thoughtful, articulate, and helpful. Your responses are clear and beautifully written. You adapt your tone to the user — friendly and casual when they are, precise and detailed when the task demands.

When you are given search results in the format [SEARCH RESULTS: ...], you MUST use that information to answer the user's question accurately. Always cite where information came from by mentioning the source naturally in your answer (e.g. "According to BBC News..."). If search results are provided, prioritize them over your training data, especially for recent events.

You never say "I don't have access to real-time data" when search results are provided to you — use them.`;

// Decides if a query needs a web search
const SEARCH_DECISION_PROMPT = `You are a search-decision engine. Given a user message, respond with ONLY "SEARCH: <query>" if it needs current/real-world information, or "NO_SEARCH" if it can be answered from general knowledge.

Search when the user asks about:
- News, current events, recent happenings
- Today's date, weather, sports scores, stock prices
- Anything that changes over time (prices, rankings, who won, latest version)
- People, companies, products released after 2023
- Specific recent facts you'd need to look up

Do NOT search for:
- General knowledge, history, science, math, coding help
- Creative writing, brainstorming, opinions
- Definitions, explanations of stable concepts

Reply ONLY with "SEARCH: <optimized search query>" or "NO_SEARCH". Nothing else.`;

function AuroraOrb({ size = 40, pulse = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #a78bfa, #f472b6, #60a5fa, #34d399)",
      backgroundSize: "300% 300%",
      animation: `aurora 6s ease infinite${pulse ? ", pulseGlow 3s ease infinite" : ""}`,
      flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 20px rgba(167,139,250,0.4)",
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L9 9H2L7.5 13.5L5.5 21L12 17L18.5 21L16.5 13.5L22 9H15L12 2Z" fill="white" opacity="0.9" />
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "linear-gradient(135deg, #a78bfa, #f472b6)",
          display: "block",
          animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

function SearchBadge({ query }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 20,
      background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(96,165,250,0.12))",
      border: "1px solid rgba(167,139,250,0.3)",
      fontSize: 12, color: "#7c3aed", fontWeight: 500,
      marginBottom: 8, animation: "fadeSlideIn 0.3s ease",
    }}>
      <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block" }}>🔍</span>
      Searching: <em style={{ color: "#6366f1" }}>{query}</em>
    </div>
  );
}

function SourcePills({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {sources.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 12,
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          fontSize: 11, color: "#6366f1", textDecoration: "none",
          fontWeight: 500, transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
        >
          🔗 {new URL(s.url).hostname.replace("www.", "")}
        </a>
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: 12,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end", marginBottom: 24,
      animation: "fadeSlideIn 0.3s ease",
    }}>
      {!isUser && <AuroraOrb size={36} />}
      {isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #e0e7ff, #fce7f3)",
          border: "2px solid #c4b5fd", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 600, color: "#7c3aed",
        }}>Y</div>
      )}
      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {msg.searchQuery && <SearchBadge query={msg.searchQuery} />}
        <div style={{
          padding: "14px 18px",
          borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
          background: isUser ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#ffffff",
          color: isUser ? "#ffffff" : "#1e1b2e",
          fontSize: 15, lineHeight: 1.65,
          boxShadow: isUser ? "0 4px 20px rgba(124,58,237,0.25)" : "0 2px 16px rgba(30,27,46,0.08)",
          border: isUser ? "none" : "1px solid rgba(196,181,253,0.3)",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.typing ? <TypingDots /> : msg.content}
        </div>
        {msg.sources && <SourcePills sources={msg.sources} />}
      </div>
    </div>
  );
}

function Sidebar({ conversations, activeId, onSelect, onNew, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(30,27,46,0.2)",
          zIndex: 40, display: window.innerWidth < 768 ? "block" : "none",
        }} />
      )}
      <aside style={{
        width: 260, minWidth: 260, height: "100%",
        background: "linear-gradient(180deg, #faf8ff 0%, #f5f0ff 100%)",
        borderRight: "1px solid rgba(196,181,253,0.3)",
        display: "flex", flexDirection: "column",
        position: window.innerWidth < 768 ? "fixed" : "relative",
        left: isOpen || window.innerWidth >= 768 ? 0 : -280,
        top: 0, zIndex: 50, transition: "left 0.3s ease",
        boxShadow: window.innerWidth < 768 ? "4px 0 24px rgba(124,58,237,0.1)" : "none",
      }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(196,181,253,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <AuroraOrb size={32} />
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, color: "#1e1b2e" }}>Nevaeh</div>
              <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 500, letterSpacing: "0.05em" }}>AI ASSISTANT</div>
            </div>
          </div>
          <button onClick={onNew} style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            border: "1.5px dashed rgba(167,139,250,0.5)",
            background: "rgba(167,139,250,0.06)", color: "#7c3aed",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.06)"; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {conversations.length === 0 && (
            <div style={{ textAlign: "center", color: "#c4b5fd", fontSize: 13, padding: "24px 8px" }}>
              No conversations yet.<br />Start a new chat!
            </div>
          )}
          {conversations.map((c) => (
            <button key={c.id} onClick={() => { onSelect(c.id); onClose(); }} style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
              border: "none",
              background: activeId === c.id ? "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(244,114,182,0.1))" : "transparent",
              color: activeId === c.id ? "#6d28d9" : "#4c4566",
              fontSize: 13, fontWeight: activeId === c.id ? 600 : 400,
              cursor: "pointer", marginBottom: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              transition: "all 0.15s",
              borderLeft: activeId === c.id ? "3px solid #a78bfa" : "3px solid transparent",
            }}
              onMouseEnter={(e) => { if (activeId !== c.id) e.currentTarget.style.background = "rgba(167,139,250,0.07)"; }}
              onMouseLeave={(e) => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
            >
              💬 {c.title}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(196,181,253,0.2)", fontSize: 12, color: "#c4b5fd", textAlign: "center" }}>
          Powered by Groq · Free tier
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("nevaeh_groq_key") || "");
  const [apiKeySaved, setApiKeySaved] = useState(!!localStorage.getItem("nevaeh_groq_key"));
  const [workerUrl, setWorkerUrl] = useState(localStorage.getItem("nevaeh_worker_url") || SEARCH_WORKER_URL);
  const [model, setModel] = useState(GROQ_MODELS[0].id);
  const [conversations, setConversations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nevaeh_conversations") || "[]"); } catch { return []; }
  });
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // null | "deciding" | "searching" | "done"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("nevaeh_conversations", JSON.stringify(conversations));
  }, [conversations]);

  function saveSettings() {
    localStorage.setItem("nevaeh_groq_key", apiKey);
    localStorage.setItem("nevaeh_worker_url", workerUrl);
    setApiKeySaved(true);
    setShowSettings(false);
  }

  function newChat() {
    const id = Date.now().toString();
    setConversations((c) => [{ id, title: "New Chat", messages: [] }, ...c]);
    setActiveId(id);
    setMessages([]);
  }

  function selectConversation(id) {
    const c = conversations.find((c) => c.id === id);
    if (c) { setActiveId(id); setMessages(c.messages); }
  }

  function updateConversation(id, msgs) {
    setConversations((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const firstUser = msgs.find((m) => m.role === "user");
      const title = firstUser ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "") : c.title;
      return { ...c, title, messages: msgs };
    }));
  }

  // Step 1: Ask Groq if we need to search
  async function decideSearch(userMessage) {
    if (!workerUrl) return null;
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // fast small model for this decision
          messages: [
            { role: "system", content: SEARCH_DECISION_PROMPT },
            { role: "user", content: userMessage },
          ],
          temperature: 0,
          max_tokens: 60,
        }),
      });
      const data = await resp.json();
      const decision = data.choices?.[0]?.message?.content?.trim() || "NO_SEARCH";
      if (decision.startsWith("SEARCH:")) {
        return decision.replace("SEARCH:", "").trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  // Step 2: Call Cloudflare Worker to search
  async function doSearch(query) {
    try {
      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    if (!apiKeySaved || !apiKey) { setShowSettings(true); return; }

    let currentId = activeId;
    let currentMsgs = messages;

    if (!currentId) {
      const id = Date.now().toString();
      setConversations((c) => [{ id, title: input.slice(0, 40), messages: [] }, ...c]);
      setActiveId(id);
      currentId = id;
      currentMsgs = [];
    }

    const userText = input;
    const userMsg = { role: "user", content: userText };
    const withUser = [...currentMsgs, userMsg];
    setMessages([...withUser, { role: "assistant", typing: true }]);
    setInput("");
    setLoading(true);

    let searchQuery = null;
    let searchResults = null;
    let sources = [];

    // --- Search decision ---
    if (workerUrl) {
      setSearchStatus("deciding");
      searchQuery = await decideSearch(userText);

      if (searchQuery) {
        setSearchStatus("searching");
        // Show the search badge immediately in the typing message
        setMessages([...withUser, { role: "assistant", typing: true, searchQuery }]);
        searchResults = await doSearch(searchQuery);
        if (searchResults?.results) {
          sources = searchResults.results.slice(0, 4);
        }
        setSearchStatus("done");
      }
    }

    setSearchStatus(null);

    // --- Build augmented message for the LLM ---
    let augmentedUserContent = userText;
    if (searchResults) {
      const resultsText = searchResults.results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
        .join("\n\n");
      const answerText = searchResults.answer ? `Quick answer: ${searchResults.answer}\n\n` : "";
      augmentedUserContent = `${userText}\n\n[SEARCH RESULTS for "${searchQuery}"]\n${answerText}${resultsText}\n[END SEARCH RESULTS]\n\nPlease answer using the search results above.`;
    }

    // Build messages for API — use original user text in history, augmented only for current turn
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...currentMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: augmentedUserContent },
    ];

    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: apiMessages, temperature: 0.7, max_tokens: 2048 }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const assistantContent = data.choices?.[0]?.message?.content || "No response.";

      // Store original user text (not augmented) in history
      const finalMsgs = [
        ...withUser,
        { role: "assistant", content: assistantContent, searchQuery: searchQuery || null, sources },
      ];
      setMessages(finalMsgs);
      updateConversation(currentId, finalMsgs);
    } catch (err) {
      const errMsgs = [...withUser, { role: "assistant", content: `⚠️ Error: ${err.message}` }];
      setMessages(errMsgs);
      updateConversation(currentId, errMsgs);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const showWelcome = messages.length === 0;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f6ff", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes aurora { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(167,139,250,0.4)} 50%{box-shadow:0 0 40px rgba(244,114,182,0.5)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(196,181,253,0.4);border-radius:99px}
        textarea:focus{outline:none} button{font-family:'Inter',sans-serif}
      `}</style>

      <Sidebar conversations={conversations} activeId={activeId} onSelect={selectConversation}
        onNew={newChat} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
        {/* Header */}
        <header style={{
          padding: "0 24px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(196,181,253,0.2)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen((o) => !o)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              borderRadius: 8, color: "#7c3aed", fontSize: 20, lineHeight: 1, display: "flex",
            }}>☰</button>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18,
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Nevaeh Chat</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {workerUrl && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                fontSize: 11, color: "#059669", fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Web Search ON
              </div>
            )}
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{
              padding: "6px 12px", borderRadius: 10,
              border: "1px solid rgba(196,181,253,0.4)",
              background: "rgba(250,248,255,0.9)", color: "#4c4566",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>
              {GROQ_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button onClick={() => setShowSettings((s) => !s)} style={{
              width: 36, height: 36, borderRadius: 10,
              border: "1px solid rgba(196,181,253,0.4)",
              background: apiKeySaved ? "rgba(167,139,250,0.1)" : "rgba(251,191,36,0.15)",
              color: apiKeySaved ? "#7c3aed" : "#d97706",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>⚙</button>
          </div>
        </header>

        {/* Settings panel */}
        {showSettings && (
          <div style={{
            background: "rgba(250,248,255,0.97)", borderBottom: "1px solid rgba(196,181,253,0.25)",
            padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6d28d9", fontWeight: 600, whiteSpace: "nowrap", minWidth: 120 }}>🔑 Groq API Key</span>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..." style={{
                  flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 10,
                  border: "1.5px solid rgba(167,139,250,0.4)", background: "#fff",
                  fontSize: 13, color: "#1e1b2e",
                }} />
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#a78bfa", textDecoration: "none", whiteSpace: "nowrap" }}>
                Get free key →
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6d28d9", fontWeight: 600, whiteSpace: "nowrap", minWidth: 120 }}>🔍 Worker URL</span>
              <input type="text" value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)}
                placeholder="https://nevaeh-search.your-name.workers.dev" style={{
                  flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 10,
                  border: "1.5px solid rgba(167,139,250,0.4)", background: "#fff",
                  fontSize: 13, color: "#1e1b2e",
                }} />
              <a href="https://tavily.com" target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#a78bfa", textDecoration: "none", whiteSpace: "nowrap" }}>
                Get Tavily key →
              </a>
            </div>
            <div>
              <button onClick={saveSettings} style={{
                padding: "8px 24px", borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Save Settings</button>
              {!workerUrl && <span style={{ marginLeft: 12, fontSize: 12, color: "#9ca3af" }}>Leave Worker URL empty to disable web search</span>}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
          {showWelcome ? (
            <div style={{ maxWidth: 560, margin: "60px auto 0", textAlign: "center", animation: "fadeSlideIn 0.5s ease" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <AuroraOrb size={72} pulse />
              </div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 32,
                background: "linear-gradient(135deg, #7c3aed, #db2777, #2563eb)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12,
              }}>Hello, I'm Nevaeh</h1>
              <p style={{ color: "#6b7280", fontSize: 16, lineHeight: 1.7, marginBottom: 8 }}>
                Your intelligent AI companion — now with live web search.
              </p>
              <p style={{ color: "#a78bfa", fontSize: 13, marginBottom: 32 }}>
                {workerUrl ? "🟢 Web search enabled — I can find current information" : "🔑 Add your Worker URL in settings to enable web search"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
                {[
                  { icon: "📰", title: "Latest News", desc: "Current events & breaking news" },
                  { icon: "🧠", title: "Think & Analyze", desc: "Brainstorm ideas, solve problems" },
                  { icon: "⚡", title: "Live Data", desc: "Prices, scores, recent releases" },
                  { icon: "✍️", title: "Write & Edit", desc: "Essays, emails, code, stories" },
                ].map((item) => (
                  <button key={item.title} onClick={() => setInput(`Tell me about: ${item.title.toLowerCase()}`)} style={{
                    padding: "14px 16px", borderRadius: 14,
                    border: "1px solid rgba(196,181,253,0.3)",
                    background: "rgba(255,255,255,0.8)", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1e1b2e", marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Search status bar */}
        {searchStatus && (
          <div style={{
            textAlign: "center", padding: "6px", fontSize: 12, color: "#7c3aed",
            background: "rgba(167,139,250,0.06)", borderTop: "1px solid rgba(196,181,253,0.2)",
            animation: "fadeSlideIn 0.3s ease",
          }}>
            {searchStatus === "deciding" && "🤔 Deciding if search is needed…"}
            {searchStatus === "searching" && "🔍 Searching the web for latest info…"}
            {searchStatus === "done" && "✅ Search complete, generating answer…"}
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: "16px 24px 24px", flexShrink: 0 }}>
          <div style={{
            maxWidth: 720, margin: "0 auto", background: "#ffffff", borderRadius: 20,
            border: "1.5px solid rgba(196,181,253,0.4)",
            boxShadow: "0 4px 32px rgba(124,58,237,0.08)",
            display: "flex", alignItems: "flex-end", gap: 8,
            padding: "12px 12px 12px 18px", transition: "border-color 0.2s, box-shadow 0.2s",
          }}
            onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 4px 32px rgba(124,58,237,0.15)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "rgba(196,181,253,0.4)"; e.currentTarget.style.boxShadow = "0 4px 32px rgba(124,58,237,0.08)"; }}
          >
            <textarea ref={inputRef} value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={workerUrl ? "Ask anything — I'll search the web if needed…" : "Message Nevaeh…"}
              rows={1} disabled={loading} style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", fontSize: 15, lineHeight: 1.6,
                color: "#1e1b2e", fontFamily: "'Inter', sans-serif",
                overflow: "hidden", maxHeight: 160,
              }} />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              width: 40, height: 40, borderRadius: 12, border: "none",
              background: input.trim() && !loading ? "linear-gradient(135deg, #7c3aed, #db2777)" : "rgba(196,181,253,0.2)",
              color: input.trim() && !loading ? "#fff" : "#c4b5fd",
              fontSize: 18, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}>
              {loading
                ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                : "↑"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#d1c4e9", marginTop: 10 }}>
            Nevaeh · Groq free tier · {workerUrl ? "Web search via Cloudflare + Tavily" : "No web search — add Worker URL in ⚙ settings"}
          </p>
        </div>
      </main>
    </div>
  );
}
