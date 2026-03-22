# ⬡ AI Dev Studio — AIDEv1.0.0

**A fully offline AI coding assistant for Android / Termux**

No cloud. No API key. No internet required.
Runs directly on your Android device using Ollama + local LLM.

> 🌐 [Tiếng Việt](README.md)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 AI Chat | Chat with AI; AI auto-creates & writes files into your project |
| 📁 File Manager | Browse, read, edit, rename, delete files/folders |
| 🖥️ Terminal | Run bash commands directly from the browser |
| ▶️ Run Code | Execute `.py`, `.sh`, `.js` files with realtime output |
| 🔍 Search | Full-text search across all project files |
| 🌿 Git UI | View branch, status, log, remote |
| 📦 Multi-project | Manage multiple projects, switch without restart |
| 🎨 Dark / Light | Theme toggle with persistent preference |
| 📋 Templates | 8 built-in prompt templates to get started fast |

### 📋 Built-in Prompt Templates

- 🎮 2D Pygame Game
- 📖 Text Adventure
- 🌐 REST API with Flask
- 🖼️ Static HTML Page
- 📊 CSV/Data Processing
- 🔧 File/Folder Utility
- 🤖 Lightweight Telegram Bot
- 🐛 Debug & Fix Code

---

## 📱 System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Android | 10+ | 12+ |
| RAM | 4GB | 6GB+ |
| Storage | 5GB | 10GB+ |
| App | Termux (F-Droid) | — |

> ⚠️ Use **Termux from F-Droid**, not Play Store (Play Store version is no longer updated).

---

## 🚀 Installation

### Step 1 — Install Termux packages

```bash
pkg update && pkg upgrade -y
pkg install python git curl wget -y
```

### Step 2 — Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 3 — Pull an AI model (choose one)

```bash
# Lightest (1.5GB) — for devices with ≤ 4GB RAM
ollama pull qwen2.5:1.5b

# Balanced (4.7GB) — recommended
ollama pull qwen2.5:7b

# Powerful (7.7GB) — requires ≥ 8GB RAM
ollama pull qwen2.5:14b
```

### Step 4 — Clone and install

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDE.git ~/.aidev
cd ~/.aidev
pip install flask flask-cors requests --break-system-packages
echo 'alias AI="bash ~/.aidev/AI.sh"' >> ~/.bashrc && source ~/.bashrc
```

### Step 5 — Launch

```bash
AI
```

Open your browser at `http://localhost:5000`
Or from another device on the same WiFi: `http://<phone-IP>:5000`

---

## ⚙️ Configuration

```bash
export OLLAMA_HOST="http://127.0.0.1:11434"  # Ollama URL
export AI_MODEL="qwen2.5:7b"                  # Default model
export AI_THREADS="4"                          # CPU threads (2/4/6/8)
export BRIDGE_PORT="5000"                      # Web server port
export PROJECTS_DIR="/sdcard/AIProjects"       # Projects directory
```

---

## 📂 Project Structure

```
AIDEv1.0.0/
├── AI.sh                  # Launcher — main menu
├── bridge.py              # Flask backend + REST API
├── test_phase1.sh         # Test suite
├── README.md              # Documentation (Vietnamese)
├── README.en.md           # Documentation (English)
├── CONTRIBUTING.md        # Contribution guide (VI)
├── CONTRIBUTING.en.md     # Contribution guide (EN)
├── LICENSE                # MIT License
└── ui/
    ├── index.html
    ├── app.js             # Core logic
    ├── style.css          # UI styles
    ├── templates.json     # Prompt templates
    ├── git.js
    ├── health.js
    ├── terminal.js
    ├── theme.js
    ├── model-filter.js
    ├── file-search.js
    ├── templates.js
    ├── particles.js
    └── syntax-highlight.js
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Chat with AI (SSE stream) |
| GET | `/api/chat/history` | Get chat history |
| POST | `/api/chat/clear` | Clear chat history |
| GET | `/api/files` | List files |
| GET | `/api/files/read` | Read file |
| POST | `/api/files/write` | Write file |
| POST | `/api/files/delete` | Delete file |
| POST | `/api/files/rename` | Rename file |
| POST | `/api/files/mkdir` | Create directory |
| GET | `/api/search` | Search in files |
| POST | `/api/terminal` | Run bash command |
| POST | `/api/run` | Run code file |
| GET | `/api/run/output/<id>` | Output stream (SSE) |
| GET | `/api/git/info` | Git information |
| GET | `/api/models` | List models |
| POST | `/api/models/set` | Set active model |
| POST | `/api/models/pull` | Pull new model |
| POST | `/api/config` | Update config |
| GET | `/api/status` | System status |
| GET | `/api/storage` | Disk usage |
| GET | `/api/projects` | List projects |
| POST | `/api/projects/switch` | Switch project |
| POST | `/api/projects/create` | Create project |

---

## 🧪 Running Tests

```bash
python3 bridge.py &   # Make sure bridge is running first
bash test_phase1.sh
```

---

## 🤝 Contributing

See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for how to contribute.

**Areas that need help:**
- [ ] Add more prompt templates
- [ ] Support more programming languages
- [ ] Improve mobile UI/UX
- [ ] Diff viewer when AI edits files
- [ ] Multimodal support (send images to AI)
- [ ] Export/import project

---

## 🐛 Bug Reports

[Open an Issue](https://github.com/JYnduyy03/TERMUX-AIDE/issues) with:
- Bug description + steps to reproduce
- Log output from `bridge.py`
- Android version, RAM, AI model in use

---

## 📄 License

[MIT License](LICENSE) — free to use, modify, and distribute.

---

## 🙏 Credits

- [Ollama](https://ollama.com) — Local LLM runtime
- [Qwen2.5](https://huggingface.co/Qwen) — Default AI model
- [Flask](https://flask.palletsprojects.com) — Python web framework
- [Termux](https://termux.dev) — Android terminal emulator

---

<div align="center">Made with ❤️ for the Android dev community</div>
