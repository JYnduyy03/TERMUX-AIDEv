# ⬡ AI Dev Studio — AIDEv1.0.0

<div align="center">

**🇻🇳 Tiếng Việt · 🇬🇧 English**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%2F%20Termux-green.svg)](https://termux.dev)
[![Offline](https://img.shields.io/badge/Mode-100%25%20Offline-blue.svg)](https://ollama.com)
[![Author](https://img.shields.io/badge/Author-nduyy0.0-purple.svg)](https://github.com/JYnduyy03)

</div>

---

> 🇻🇳 **AI coding assistant chạy hoàn toàn offline trên Android / Termux.**
> Không cần cloud · Không cần API key · Không cần internet.
> Chạy thẳng trên điện thoại Android với Ollama + LLM local.
>
> 🇬🇧 **A fully offline AI coding assistant for Android / Termux.**
> No cloud · No API key · No internet required.
> Runs directly on your Android device using Ollama + local LLM.

---

## 📖 Mục lục / Table of Contents

- [✨ Tính năng / Features](#-tính-năng--features)
- [📱 Yêu cầu hệ thống / System Requirements](#-yêu-cầu-hệ-thống--system-requirements)
- [🚀 Cài đặt / Installation](#-cài-đặt--installation)
- [⚙️ Cấu hình / Configuration](#️-cấu-hình--configuration)
- [📂 Cấu trúc / Structure](#-cấu-trúc--structure)
- [🔌 API Endpoints](#-api-endpoints)
- [🧪 Chạy test / Running Tests](#-chạy-test--running-tests)
- [🤝 Đóng góp / Contributing](#-đóng-góp--contributing)
- [🐛 Báo lỗi / Bug Reports](#-báo-lỗi--bug-reports)
- [📄 License](#-license)
- [🙏 Credits](#-credits)

---

## ✨ Tính năng / Features

| | Tính năng / Feature | 🇻🇳 Mô tả | 🇬🇧 Description |
|:---:|---|---|---|
| 💬 | AI Chat | Trò chuyện với AI, AI tự tạo & ghi file vào project | Chat with AI; AI auto-creates & writes files into your project |
| 📁 | File Manager | Duyệt, đọc, sửa, đổi tên, xóa file/folder | Browse, read, edit, rename, delete files/folders |
| 🖥️ | Terminal | Chạy lệnh bash trực tiếp từ trình duyệt | Run bash commands directly from the browser |
| ▶️ | Run Code | Chạy `.py` `.sh` `.js`, xem output realtime | Execute `.py` `.sh` `.js` files with realtime output |
| 🔍 | Search | Tìm text trong toàn bộ file của project | Full-text search across all project files |
| 🌿 | Git UI | Xem branch, status, log, remote | View branch, status, log, remote |
| 📦 | Multi-project | Quản lý nhiều project, chuyển đổi không cần restart | Manage multiple projects, switch without restart |
| 🎨 | Dark / Light | Toggle theme, lưu preference | Theme toggle with persistent preference |
| 📋 | Templates | 8 prompt template sẵn có để khởi động nhanh | 8 built-in prompt templates to get started fast |

### 📋 Prompt Templates

| Icon | 🇻🇳 Tên | 🇬🇧 Name |
|:---:|---|---|
| 🎮 | Game 2D Pygame | 2D Pygame Game |
| 📖 | Text Adventure | Text Adventure |
| 🌐 | REST API Flask | REST API with Flask |
| 🖼️ | HTML Page tĩnh | Static HTML Page |
| 📊 | Xử lý CSV/Data | CSV/Data Processing |
| 🔧 | Tiện ích File/Folder | File/Folder Utility |
| 🤖 | Bot Telegram nhẹ | Lightweight Telegram Bot |
| 🐛 | Debug & Fix Code | Debug & Fix Code |

---

## 📱 Yêu cầu hệ thống / System Requirements

| Yêu cầu / Requirement | Tối thiểu / Minimum | Khuyến nghị / Recommended |
|---|:---:|:---:|
| Android | 10+ | 12+ |
| RAM | 4 GB | 6 GB+ |
| Dung lượng / Storage | 5 GB | 10 GB+ |
| App | Termux (F-Droid) | Termux (F-Droid) |

> ⚠️ 🇻🇳 Dùng **Termux từ F-Droid**, không phải Play Store — phiên bản Play Store đã ngừng cập nhật.
>
> ⚠️ 🇬🇧 Use **Termux from F-Droid**, not the Play Store — the Play Store version is no longer maintained.

---

## 🚀 Cài đặt / Installation

### Bước 1 / Step 1 — Cài packages / Install packages

```bash
pkg update && pkg upgrade -y
pkg install python git curl wget -y
```

### Bước 2 / Step 2 — Cài Ollama / Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Bước 3 / Step 3 — Pull model AI

```bash
# 🇻🇳 Nhẹ nhất (1.5 GB) — cho máy ≤ 4 GB RAM
# 🇬🇧 Lightest (1.5 GB)  — for devices with ≤ 4 GB RAM
ollama pull qwen2.5:1.5b

# 🇻🇳 Cân bằng (4.7 GB) — khuyến nghị
# 🇬🇧 Balanced (4.7 GB)  — recommended
ollama pull qwen2.5:7b

# 🇻🇳 Mạnh hơn (7.7 GB) — cần ≥ 8 GB RAM
# 🇬🇧 Powerful (7.7 GB)  — requires ≥ 8 GB RAM
ollama pull qwen2.5:14b
```

### Bước 4 / Step 4 — Clone & cài đặt / Clone & install

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDEv.git ~/.aidev
cd ~/.aidev/AI
pip install flask flask-cors requests --break-system-packages
echo 'alias AI="bash ~/.aidev/AI/AI.sh"' >> ~/.bashrc && source ~/.bashrc
```

### Bước 5 / Step 5 — Khởi động / Launch

```bash
AI
```

> 🇻🇳 Mở trình duyệt tại `http://localhost:5000`
> Hoặc từ thiết bị khác cùng WiFi: `http://<IP-điện-thoại>:5000`
>
> 🇬🇧 Open your browser at `http://localhost:5000`
> Or from another device on the same WiFi: `http://<phone-IP>:5000`

---

## ⚙️ Cấu hình / Configuration

```bash
export OLLAMA_HOST="http://127.0.0.1:11434"  # Ollama URL
export AI_MODEL="qwen2.5:7b"                  # Model mặc định / Default model
export AI_THREADS="4"                          # CPU threads (2 / 4 / 6 / 8)
export BRIDGE_PORT="5000"                      # Port web server
export PROJECTS_DIR="/sdcard/AIProjects"       # Thư mục project / Projects directory
```

---

## 📂 Cấu trúc / Structure

```
TERMUX-AIDEv/
├── README.md              # Tài liệu song ngữ / Bilingual documentation (file này / this file)
├── LICENSE                # MIT License
└── AI/
    ├── AI.sh              # Launcher — menu quản lý / main menu
    ├── bridge.py          # Backend Flask + REST API
    ├── test_phase1.sh     # Test suite
    └── ui/
        ├── index.html
        ├── app.js         # Core logic
        ├── style.css      # Giao diện / UI styles
        ├── templates.json # Prompt templates
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

| Method | Endpoint | 🇻🇳 Mô tả | 🇬🇧 Description |
|:---:|---|---|---|
| `POST` | `/api/chat` | Chat với AI (SSE stream) | Chat with AI (SSE stream) |
| `GET` | `/api/chat/history` | Lịch sử chat | Get chat history |
| `POST` | `/api/chat/clear` | Xóa lịch sử | Clear chat history |
| `GET` | `/api/files` | Danh sách file | List files |
| `GET` | `/api/files/read` | Đọc file | Read file |
| `POST` | `/api/files/write` | Ghi file | Write file |
| `POST` | `/api/files/delete` | Xóa file | Delete file |
| `POST` | `/api/files/rename` | Đổi tên | Rename file |
| `POST` | `/api/files/mkdir` | Tạo thư mục | Create directory |
| `GET` | `/api/search` | Tìm kiếm trong file | Search in files |
| `POST` | `/api/terminal` | Chạy lệnh bash | Run bash command |
| `POST` | `/api/run` | Chạy file code | Run code file |
| `GET` | `/api/run/output/<id>` | Output stream (SSE) | Output stream (SSE) |
| `GET` | `/api/git/info` | Thông tin git | Git information |
| `GET` | `/api/models` | Danh sách model | List models |
| `POST` | `/api/models/set` | Đổi model | Set active model |
| `POST` | `/api/models/pull` | Pull model mới | Pull new model |
| `POST` | `/api/config` | Cập nhật cấu hình | Update config |
| `GET` | `/api/status` | Trạng thái hệ thống | System status |
| `GET` | `/api/storage` | Thông tin disk | Disk usage |
| `GET` | `/api/projects` | Danh sách project | List projects |
| `POST` | `/api/projects/switch` | Chuyển project | Switch project |
| `POST` | `/api/projects/create` | Tạo project mới | Create project |

---

## 🧪 Chạy test / Running Tests

```bash
# 🇻🇳 Đảm bảo bridge đang chạy trước
# 🇬🇧 Make sure bridge is running first
python3 AI/bridge.py &
bash AI/test_phase1.sh
```

---

## 🤝 Đóng góp / Contributing

> 🇻🇳 Cảm ơn bạn đã quan tâm đến dự án! Mọi đóng góp đều được chào đón — từ sửa typo, báo lỗi, đến thêm tính năng mới.
>
> 🇬🇧 Thank you for your interest! All contributions are welcome — from fixing typos and reporting bugs to adding new features.

### 🔧 Quy trình / Workflow

**1. Fork & Clone**

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDEv.git
cd TERMUX-AIDEv
```

**2. 🇻🇳 Tạo branch mới / 🇬🇧 Create a branch**

```bash
git checkout -b fix/ten-bug         # Sửa lỗi / Bug fix
git checkout -b feat/ten-tinh-nang  # Tính năng mới / New feature
git checkout -b docs/cap-nhat       # Tài liệu / Docs update
```

**3. 🇻🇳 Quy tắc code / 🇬🇧 Code guidelines**

*Backend (`AI/bridge.py`)*

| 🇻🇳 | 🇬🇧 |
|---|---|
| Dùng `safe_path()` cho mọi thao tác file | Always use `safe_path()` for file operations |
| Dùng `_history_lock` khi đọc/ghi `chat_history` | Use `_history_lock` when reading/writing `chat_history` |
| Luôn trả `jsonify({"error": "..."})` khi lỗi | Always return `jsonify({"error": "..."})` on errors |
| Không dùng `bare except:` — dùng `except Exception` | Never use bare `except:` — use `except Exception` |

*Frontend (`AI/ui/app.js`)*

| 🇻🇳 | 🇬🇧 |
|---|---|
| Dùng `apiFetch()` thay vì `fetch()` trực tiếp | Use `apiFetch()` instead of raw `fetch()` |
| Dùng `toast()` để thông báo người dùng | Use `toast()` to notify the user |
| Dùng `escH()` khi render text vào HTML | Use `escH()` when rendering text into HTML |

*🇻🇳 Thêm template / 🇬🇧 Adding a template* (`AI/ui/templates.json`)

```json
{
  "id": "ten-template",
  "icon": "🔥",
  "label": "Tên hiển thị / Display Name",
  "tags": ["tag1", "tag2"],
  "prompt": "Nội dung prompt / Your prompt here..."
}
```

**4. 🇻🇳 Kiểm tra trước khi submit / 🇬🇧 Test before submitting**

```bash
# Syntax check
python3 -c "import ast; ast.parse(open('AI/bridge.py').read()); print('bridge.py ✓')"
node --check AI/ui/app.js && echo "app.js ✓"

# Test suite
bash AI/test_phase1.sh
```

**5. Commit convention**

```
fix:      sửa lỗi / bug fix
feat:     tính năng mới / new feature
docs:     tài liệu / documentation
refactor: tái cấu trúc / refactor
perf:     tối ưu / performance
test:     thêm test / add tests
chore:    bảo trì / maintenance
```

**6. Push & Pull Request**

```bash
git push origin fix/ten-bug
```

> 🇻🇳 PR cần mô tả: vấn đề đang giải quyết · cách tiếp cận · test đã chạy.
>
> 🇬🇧 PR should include: problem being solved · approach · tests run.

### 💡 Gợi ý đóng góp / Contribution Ideas

| 🟢 🟡 🔴 | 🇻🇳 Việc cần làm | 🇬🇧 Task |
|:---:|---|---|
| 🟢 | Thêm prompt template vào `templates.json` | Add prompt templates to `templates.json` |
| 🟢 | Thêm icon extension file mới trong `app.js` | Add icons for new file extensions in `app.js` |
| 🟡 | Cải thiện `renderMd()` hỗ trợ thêm markdown | Improve `renderMd()` for more markdown syntax |
| 🟡 | Thêm endpoint `/api/files/copy` | Add `/api/files/copy` endpoint |
| 🟡 | Cải thiện UI mobile (touch, swipe) | Improve mobile UI (touch, swipe gestures) |
| 🔴 | Diff viewer khi AI sửa file | Diff viewer when AI edits files |
| 🔴 | Hỗ trợ multimodal (gửi ảnh cho AI) | Multimodal support (send images to AI) |
| 🔴 | Export/import project dạng zip | Export/import project as zip |

### 📜 Quy tắc ứng xử / Code of Conduct

🇻🇳 Tôn trọng lẫn nhau · Feedback xây dựng · Câu hỏi cơ bản cũng được hoan nghênh · Tiếng Việt hoặc Tiếng Anh đều OK.

🇬🇧 Treat everyone with respect · Give constructive feedback · Beginner questions are always welcome · Vietnamese or English are both fine.

---

## 🐛 Báo lỗi / Bug Reports

🇻🇳 [Tạo Issue](https://github.com/JYnduyy03/TERMUX-AIDEv/issues) và điền thông tin:

🇬🇧 [Open an Issue](https://github.com/JYnduyy03/TERMUX-AIDEv/issues) and fill in:

```
Mô tả lỗi / Description:

Bước tái hiện / Steps to reproduce:
1.
2.
3.

Kết quả mong đợi / Expected behavior:

Kết quả thực tế / Actual behavior:

Log từ bridge.py / Log from bridge.py:

Môi trường / Environment:
- Android version:
- RAM:
- Ollama version:
- Model đang dùng / AI model in use:
```

---

## 📄 License

[MIT License](./LICENSE) — 🇻🇳 Tự do sử dụng, sửa đổi, phân phối / 🇬🇧 Free to use, modify, and distribute.

---

## 🙏 Credits

| | |
|---|---|
| 🧑‍💻 **Author** | **[nduyy0.0](https://github.com/JYnduyy03)** |
| 🤖 **LLM Runtime** | [Ollama](https://ollama.com) |
| 🧠 **Default AI Model** | [Qwen2.5](https://huggingface.co/Qwen) |
| 🌐 **Web Framework** | [Flask](https://flask.palletsprojects.com) |
| 📱 **Terminal Emulator** | [Termux](https://termux.dev) |

---

<div align="center">

Made with ❤️ by **nduyy0.0** · for the Android dev community

</div>
