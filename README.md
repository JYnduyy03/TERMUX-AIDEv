# ⬡ AI Dev Studio — AIDEv1.0.0

**AI coding assistant chạy hoàn toàn offline trên Android / Termux**

Không cần cloud. Không cần API key. Không cần internet.
Chạy thẳng trên điện thoại Android với Ollama + LLM local.

> 🌐 [English](README.en.md)

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 💬 AI Chat | Trò chuyện với AI, AI tự tạo & ghi file vào project |
| 📁 File Manager | Duyệt, đọc, sửa, đổi tên, xóa file/folder |
| 🖥️ Terminal | Chạy lệnh bash trực tiếp từ trình duyệt |
| ▶️ Run Code | Chạy `.py`, `.sh`, `.js`, xem output realtime |
| 🔍 Tìm kiếm | Tìm text trong toàn bộ file của project |
| 🌿 Git UI | Xem branch, status, log, remote |
| 📦 Multi-project | Quản lý nhiều project, chuyển đổi không cần restart |
| 🎨 Dark / Light | Toggle theme, lưu preference |
| 📋 Templates | 8 prompt template sẵn có để khởi động nhanh |

### 📋 Prompt Templates có sẵn

- 🎮 Game 2D Pygame
- 📖 Text Adventure
- 🌐 REST API Flask
- 🖼️ HTML Page tĩnh
- 📊 Xử lý CSV/Data
- 🔧 Tiện ích File/Folder
- 🤖 Bot Telegram nhẹ
- 🐛 Debug & Fix Code

---

## 📱 Yêu cầu hệ thống

| Yêu cầu | Tối thiểu | Khuyến nghị |
|---------|-----------|-------------|
| Android | 10+ | 12+ |
| RAM | 4GB | 6GB+ |
| Dung lượng | 5GB | 10GB+ |
| App | Termux (F-Droid) | — |

> ⚠️ Dùng **Termux từ F-Droid**, không phải Play Store (phiên bản Play Store đã ngừng cập nhật).

---

## 🚀 Cài đặt

### Bước 1 — Cài Termux packages

```bash
pkg update && pkg upgrade -y
pkg install python git curl wget -y
```

### Bước 2 — Cài Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Bước 3 — Pull model AI (chọn 1)

```bash
# Nhẹ nhất (1.5GB) — cho máy ≤ 4GB RAM
ollama pull qwen2.5:1.5b

# Cân bằng (4.7GB) — khuyến nghị
ollama pull qwen2.5:7b

# Mạnh hơn (7.7GB) — cần ≥ 8GB RAM
ollama pull qwen2.5:14b
```

### Bước 4 — Clone và cài đặt

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDE.git ~/.aidev
cd ~/.aidev
pip install flask flask-cors requests --break-system-packages
echo 'alias AI="bash ~/.aidev/AI.sh"' >> ~/.bashrc && source ~/.bashrc
```

### Bước 5 — Khởi động

```bash
AI
```

Mở trình duyệt tại `http://localhost:5000`
Hoặc từ thiết bị khác cùng WiFi: `http://<IP-điện-thoại>:5000`

---

## ⚙️ Cấu hình

```bash
export OLLAMA_HOST="http://127.0.0.1:11434"  # Ollama URL
export AI_MODEL="qwen2.5:7b"                  # Model mặc định
export AI_THREADS="4"                          # Số CPU threads (2/4/6/8)
export BRIDGE_PORT="5000"                      # Port web server
export PROJECTS_DIR="/sdcard/AIProjects"       # Thư mục project
```

---

## 📂 Cấu trúc project

```
AIDEv1.0.0/
├── AI.sh                  # Launcher — menu quản lý
├── bridge.py              # Backend Flask + REST API
├── test_phase1.sh         # Test suite
├── README.md              # Tài liệu (Tiếng Việt)
├── README.en.md           # Tài liệu (English)
├── CONTRIBUTING.md        # Hướng dẫn đóng góp (VI)
├── CONTRIBUTING.en.md     # Contribution guide (EN)
├── LICENSE                # MIT License
└── ui/
    ├── index.html
    ├── app.js             # Core logic
    ├── style.css          # Giao diện
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

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/chat` | Chat với AI (SSE stream) |
| GET | `/api/chat/history` | Lịch sử chat |
| POST | `/api/chat/clear` | Xóa lịch sử |
| GET | `/api/files` | Danh sách file |
| GET | `/api/files/read` | Đọc file |
| POST | `/api/files/write` | Ghi file |
| POST | `/api/files/delete` | Xóa file |
| POST | `/api/files/rename` | Đổi tên |
| POST | `/api/files/mkdir` | Tạo thư mục |
| GET | `/api/search` | Tìm kiếm trong file |
| POST | `/api/terminal` | Chạy lệnh bash |
| POST | `/api/run` | Chạy file code |
| GET | `/api/run/output/<id>` | Output stream (SSE) |
| GET | `/api/git/info` | Thông tin git |
| GET | `/api/models` | Danh sách model |
| POST | `/api/models/set` | Đổi model |
| POST | `/api/models/pull` | Pull model mới |
| POST | `/api/config` | Cập nhật cấu hình |
| GET | `/api/status` | Trạng thái hệ thống |
| GET | `/api/storage` | Thông tin disk |
| GET | `/api/projects` | Danh sách project |
| POST | `/api/projects/switch` | Chuyển project |
| POST | `/api/projects/create` | Tạo project mới |

---

## 🧪 Chạy test

```bash
python3 bridge.py &   # Đảm bảo bridge đang chạy
bash test_phase1.sh
```

---

## 🤝 Đóng góp

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết cách tham gia.

**Hướng cần đóng góp:**
- [ ] Thêm prompt template mới
- [ ] Hỗ trợ thêm ngôn ngữ lập trình
- [ ] Cải thiện mobile UI/UX
- [ ] Diff viewer khi AI sửa file
- [ ] Hỗ trợ multimodal (gửi ảnh cho AI)
- [ ] Export/import project

---

## 🐛 Báo lỗi

[Tạo Issue](https://github.com/JYnduyy03/TERMUX-AIDE/issues) với thông tin:
- Mô tả lỗi + bước tái hiện
- Log từ `bridge.py`
- Android version, RAM, model AI đang dùng

---

## 📄 License

[MIT License](LICENSE) — tự do sử dụng, sửa đổi, phân phối.

---

## 🙏 Credits

- [Ollama](https://ollama.com) — Local LLM runtime
- [Qwen2.5](https://huggingface.co/Qwen) — AI model mặc định
- [Flask](https://flask.palletsprojects.com) — Python web framework
- [Termux](https://termux.dev) — Android terminal emulator

---

<div align="center">Made with ❤️ for the Android dev community</div>
