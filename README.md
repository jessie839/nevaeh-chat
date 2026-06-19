# ✨ Nevaeh Chat

A beautiful, modern AI assistant built with React + Groq API (free tier).

## Stack
- **Frontend**: React 18 + Vite
- **AI API**: Groq (free tier — llama3, gemma, mixtral)
- **Hosting**: Vercel (free)

---

## 🚀 Deploy in 3 steps

### 1. Get a free Groq API key
Go to → https://console.groq.com/keys  
Sign up and create a free API key (starts with `gsk_...`)

### 2. Deploy to Vercel
```bash
# Clone or download this folder, then:
npm install
npm run build

# Or push to GitHub and import into vercel.com
```

**Or one-click via Vercel CLI:**
```bash
npm i -g vercel
vercel --prod
```

### 3. Enter your API key in the app
Click the 🔑 icon in the top-right of the app.  
Paste your Groq key and click **Save** — it stays in your browser only (localStorage), never sent to any server.

---

## 🛠 Local development
```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## Features
- 🌈 Animated aurora orb AI avatar
- 💬 Multi-conversation sidebar with history
- 🤖 Model switcher (Llama 3.3 70B, Gemma 2, Mixtral, etc.)
- 📱 Mobile-responsive with slide-out sidebar
- 💾 Conversations stored in-memory per session
- 🔐 API key stored locally in browser

## Customization
Edit `src/App.jsx`:
- `SYSTEM_PROMPT` — change Nevaeh's personality
- `GROQ_MODELS` — add/remove available models
- Colors: search for `#7c3aed` (purple) and `#db2777` (rose) to retheme
