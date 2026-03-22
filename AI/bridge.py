#!/usr/bin/env python3
"""
bridge.py — AI Dev Studio Backend AIDEv1.0.0
Kết nối Web UI ↔ Ollama ↔ /sdcard/AIProjects
"""
import os, json, re, threading, time, subprocess, uuid, shutil, shlex
from pathlib import Path
from flask import Flask, request, jsonify, Response, send_from_directory
try:
    from flask_cors import CORS
    _has_cors = True
except ImportError:
    _has_cors = False
import requests

app = Flask(__name__)
UI_DIR = Path(__file__).parent / "ui"

if _has_cors:
    CORS(app)
else:
    @app.after_request
    def add_cors(r):
        r.headers["Access-Control-Allow-Origin"]  = "*"
        r.headers["Access-Control-Allow-Headers"] = "Content-Type"
        r.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return r

# ── Config ────────────────────────────────────────────────────────
def _default_projects() -> Path:
    for p in [Path("/sdcard/AIProjects"), Path.home() / "AIProjects"]:
        try:
            p.mkdir(parents=True, exist_ok=True)
            return p
        except OSError:
            continue
    return Path.home() / "AIProjects"

PROJECTS_ROOT = (
    Path(os.environ["PROJECTS_DIR"])
    if os.environ.get("PROJECTS_DIR")
    else _default_projects()
)
PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)

OLLAMA_URL  = os.environ.get("OLLAMA_HOST",   "http://127.0.0.1:11434")
MODEL       = os.environ.get("AI_MODEL",      "qwen2.5:7b")
try:
    MAX_THREADS = int(os.environ.get("AI_THREADS", "4"))
    if MAX_THREADS not in (2, 4, 6, 8): MAX_THREADS = 4
except (TypeError, ValueError):
    MAX_THREADS = 4
try:
    PORT = int(os.environ.get("BRIDGE_PORT", "5000"))
    if not (1024 <= PORT <= 65535): PORT = 5000
except (TypeError, ValueError):
    PORT = 5000


# ── System prompt ─────────────────────────────────────────────────
SYSTEM_PROMPT = f"""Bạn là AI lập trình viên chuyên Python và HTML, giúp phát triển trên Android/Termux.
Project root: {PROJECTS_ROOT}. Trả lời bằng Tiếng Việt trừ khi được yêu cầu khác.

KHI TẠO/SỬA FILE dùng format (bắt buộc):
<<<FILE: đường/dẫn/file.py>>>
[nội dung file]
<<<END>>>

- Đường dẫn tương đối từ project root
- Có thể xuất nhiều file
- Giải thích ngắn TRƯỚC code
- Ưu tiên Pygame, HTML/JS thuần — tránh thư viện nặng
"""

# ── State ─────────────────────────────────────────────────────────
chat_history:   list[dict] = []
_history_lock = threading.Lock()
_state_lock   = threading.Lock()   # bảo vệ PROJECTS_ROOT, MODEL, MAX_THREADS
run_jobs:     dict[str, dict] = {}
MAX_JOBS      = 50   # giới hạn số job đồng thời tránh memory leak

# ── Helpers ───────────────────────────────────────────────────────
def safe_path(rel: str) -> Path:
    root = PROJECTS_ROOT.resolve()
    p    = (root / rel).resolve()
    # Dùng is_relative_to logic thủ công để tránh startswith("/sdcard/AI" matches "/sdcard/AIEvil")
    try:
        p.relative_to(root)
    except ValueError:
        raise ValueError("Đường dẫn không hợp lệ")
    return p

def parse_files(text: str) -> list[dict]:
    files = []
    for m in re.finditer(r"<<<FILE:\s*(.+?)>>>\n([\s\S]+?)<<<END>>>", text):
        name    = m.group(1).strip()
        content = m.group(2)
        try:
            fp  = safe_path(name)
            old = fp.read_text("utf-8", errors="replace") if fp.exists() else None
        except ValueError:
            continue   # bỏ qua file path không hợp lệ / path traversal
        files.append({
            "filename": name,
            "content":  content,
            "is_new":   old is None,
            "lines":    len(content.splitlines()),
        })
    return files

def write_files(files: list[dict]):
    for f in files:
        p = safe_path(f["filename"])
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(f["content"], "utf-8")

def _hist_file() -> Path:
    return Path.home() / ".aidev" / "chat_history.json"

def load_chat_history():
    global chat_history
    hf = _hist_file()
    if hf.exists():
        try:
            data = json.loads(hf.read_text("utf-8"))
            if isinstance(data, list):
                with _history_lock:
                    chat_history = data
        except Exception as e:
            print(f"Warning: {e}")

def save_chat_history():
    hf = _hist_file()
    hf.parent.mkdir(parents=True, exist_ok=True)
    with _history_lock:
        data = json.dumps(chat_history, ensure_ascii=False, indent=2)
    hf.write_text(data, "utf-8")

# ── Job helpers ───────────────────────────────────────────────────
def _schedule_cleanup(job_id: str, delay: float = 60.0):
    def _do(): run_jobs.pop(job_id, None)
    threading.Timer(delay, _do).start()

def _spawn_job(cmd_list: list, cwd: str = None) -> str:
    # Xóa job cũ nhất nếu vượt giới hạn
    if len(run_jobs) >= MAX_JOBS:
        oldest = next(iter(run_jobs))
        run_jobs.pop(oldest, None)
    job_id = str(uuid.uuid4())[:8]
    run_jobs[job_id] = {"lines": [], "done": False, "rc": None}

    def _run():
        try:
            proc = subprocess.Popen(
                cmd_list, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                cwd=cwd or str(PROJECTS_ROOT), text=True
            )
            for line in proc.stdout:
                run_jobs[job_id]["lines"].append(line)
            proc.wait()
            run_jobs[job_id]["rc"] = proc.returncode
        except Exception as e:
            run_jobs[job_id]["lines"].append(f"Error: {e}\n")
            run_jobs[job_id]["rc"] = 1
        finally:
            run_jobs[job_id]["done"] = True
            _schedule_cleanup(job_id)

    threading.Thread(target=_run, daemon=True).start()
    return job_id

# ══════════════════════════════════════════════════════════════════
#  Chat
# ══════════════════════════════════════════════════════════════════
@app.route("/api/chat", methods=["POST"])
def api_chat():
    data     = request.json or {}
    user_msg = data.get("message", "").strip()
    attached = data.get("attached_file")

    if not user_msg:
        return jsonify({"error": "Tin nhắn trống"}), 400

    content = user_msg
    if attached:
        content += f"\n\n[File: {attached['name']}]\n```\n{attached['content'][:3000]}\n```"

    # Giới hạn context: giữ tối đa 40 lượt (80 messages) tránh OOM
    MAX_HISTORY = 80
    with _history_lock:
        chat_history.append({"role": "user", "content": content})
        if len(chat_history) > MAX_HISTORY:
            chat_history[:] = chat_history[-MAX_HISTORY:]
        messages_snapshot = list(chat_history)

    def generate():
        full = ""
        try:
            r = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages_snapshot,
                    "stream": True,
                    "options": {"num_thread": MAX_THREADS, "num_predict": 2048, "temperature": 0.7},
                },
                stream=True, timeout=180
            )
            for line in r.iter_lines():
                if not line: continue
                try:
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        full += token
                        yield f"data: {json.dumps({'token': token})}\n\n"
                    if chunk.get("done"): break
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        written = parse_files(full)
        if written:
            try:
                write_files(written)
            except Exception as e:
                yield f"data: {json.dumps({'write_error': str(e)})}\n\n"

        with _history_lock:
            chat_history.append({"role": "assistant", "content": full})
        save_chat_history()
        yield f"data: {json.dumps({'done': True, 'written_files': written})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.route("/api/chat/clear", methods=["POST"])
def clear_chat():
    with _history_lock:
        chat_history.clear()
    _hist_file().unlink(missing_ok=True)
    return jsonify({"ok": True})

@app.route("/api/chat/history")
def get_chat_history():
    with _history_lock:
        snapshot = list(chat_history)
    return jsonify({"history": snapshot})

@app.route("/api/chat/save", methods=["POST"])
def save_chat_api():
    save_chat_history()
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════
#  File Manager
# ══════════════════════════════════════════════════════════════════
@app.route("/api/files")
def list_files():
    rel = request.args.get("path", "")
    try:
        base = safe_path(rel) if rel else PROJECTS_ROOT
        if not base.exists():
            return jsonify({"items": []})
        items = []
        for p in sorted(base.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
            items.append({
                "name":     p.name,
                "path":     str(p.relative_to(PROJECTS_ROOT)),
                "is_dir":   p.is_dir(),
                "size":     p.stat().st_size if p.is_file() else 0,
                "modified": int(p.stat().st_mtime),
                "ext":      p.suffix.lstrip(".").lower() if p.is_file() else "",
            })
        return jsonify({"items": items, "current": rel})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/files/read")
def read_file():
    rel = request.args.get("path", "")
    if not rel:
        return jsonify({"error": "Thiếu path"}), 400
    try:
        p = safe_path(rel)
        content = p.read_text("utf-8", errors="replace")
        return jsonify({
            "content":  content,
            "path":     rel,
            "name":     p.name,
            "lines":    len(content.splitlines()),
            "size":     p.stat().st_size,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/files/write", methods=["POST"])
def write_file():
    data = request.json or {}
    rel, content = data.get("path", ""), data.get("content", "")
    if not rel:
        return jsonify({"error": "Thiếu path"}), 400
    try:
        p = safe_path(rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, "utf-8")
        return jsonify({"ok": True, "lines": len(content.splitlines())})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/files/delete", methods=["POST"])
def delete_file():
    rel = (request.json or {}).get("path", "")
    if not rel:
        return jsonify({"error": "Thiếu path"}), 400
    try:
        p = safe_path(rel)
        if p == PROJECTS_ROOT or p == PROJECTS_ROOT.resolve():
            return jsonify({"error": "Không thể xóa thư mục gốc project"}), 403
        shutil.rmtree(p) if p.is_dir() else p.unlink()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/files/rename", methods=["POST"])
def rename_file():
    """Đổi tên hoặc di chuyển file/folder"""
    data    = request.json or {}
    old_rel = data.get("old_path", "")
    new_rel = data.get("new_path", "")
    if not old_rel or not new_rel:
        return jsonify({"error": "Thiếu old_path hoặc new_path"}), 400
    try:
        old_p = safe_path(old_rel)
        new_p = safe_path(new_rel)
        if not old_p.exists():
            return jsonify({"error": "File/folder không tồn tại"}), 404
        if new_p.exists():
            return jsonify({"error": f"'{new_p.name}' đã tồn tại"}), 409
        new_p.parent.mkdir(parents=True, exist_ok=True)
        old_p.rename(new_p)
        return jsonify({"ok": True, "new_path": str(new_p.relative_to(PROJECTS_ROOT))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/files/mkdir", methods=["POST"])
def make_dir():
    rel = (request.json or {}).get("path", "")
    if not rel:
        return jsonify({"error": "Thiếu path"}), 400
    try:
        safe_path(rel).mkdir(parents=True, exist_ok=True)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ══════════════════════════════════════════════════════════════════
#  Search trong files
# ══════════════════════════════════════════════════════════════════
SEARCH_EXTS = {".py", ".js", ".html", ".htm", ".css", ".json", ".md", ".txt", ".sh"}

@app.route("/api/search")
def search_files():
    """Tìm kiếm text trong tất cả file của project"""
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"error": "Query quá ngắn (≥ 2 ký tự)"}), 400

    results = []
    q_lower = q.lower()

    try:
        for fp in PROJECTS_ROOT.rglob("*"):
            # Bỏ qua thư mục ẩn, node_modules, __pycache__
            parts = fp.parts
            if any(p.startswith(".") or p in ("node_modules", "__pycache__", ".git") for p in parts):
                continue
            if not fp.is_file() or fp.suffix.lower() not in SEARCH_EXTS:
                continue
            if fp.stat().st_size > 500_000:   # bỏ qua file > 500KB
                continue

            try:
                text = fp.read_text("utf-8", errors="replace")
            except Exception:
                continue

            matches = []
            for i, line in enumerate(text.splitlines(), 1):
                if q_lower in line.lower():
                    matches.append({
                        "line": i,
                        "text": line.strip()[:120],   # cắt dài
                    })
                    if len(matches) >= 5:   # tối đa 5 dòng/file
                        break

            if matches:
                results.append({
                    "path":    str(fp.relative_to(PROJECTS_ROOT)),
                    "name":    fp.name,
                    "matches": matches,
                })
                if len(results) >= 30:   # tối đa 30 file
                    break

        return jsonify({"results": results, "query": q, "count": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════
#  Terminal / Shell
# ══════════════════════════════════════════════════════════════════
ALLOWED_CMDS = {
    # Navigation & listing
    "ls", "pwd", "cd", "find", "tree",
    # File ops
    "cat", "head", "tail", "wc", "diff", "sort", "uniq",
    "cp", "mv", "mkdir", "touch", "rm", "chmod",
    # Editors (non-interactive)
    "echo", "grep", "sed", "awk",
    # Compress
    "tar", "zip", "unzip", "gzip",
    # Network
    "curl", "wget",
    # Python / Node
    "python", "python3", "pip", "pip3", "node", "npm", "npx",
    # Git (all git subcommands routed via "git")
    "git",
    # System info
    "df", "du", "free", "uname",
}

@app.route("/api/terminal", methods=["POST"])
def run_terminal():
    cmd = (request.json or {}).get("command", "").strip()
    if not cmd:
        return jsonify({"error": "Command trống"}), 400

    # Chặn shell chaining để ngăn injection
    for ch in (";", "&&", "||", "|", "`", "$(", "${"):
        if ch in cmd:
            return jsonify({"error": f"Ký tự không được phép: {ch}"}), 403

    try:
        cmd_parts = shlex.split(cmd)
    except ValueError as e:
        return jsonify({"error": f"Lệnh không hợp lệ: {e}"}), 400

    if not cmd_parts:
        return jsonify({"error": "Command trống"}), 400

    cmd_name = cmd_parts[0].lower()
    if cmd_name not in ALLOWED_CMDS:
        return jsonify({"error": f"Lệnh '{cmd_name}' không được phép"}), 403

    # Xóa job cũ nhất nếu vượt giới hạn
    if len(run_jobs) >= MAX_JOBS:
        oldest = next(iter(run_jobs))
        run_jobs.pop(oldest, None)
    job_id = str(uuid.uuid4())[:8]
    run_jobs[job_id] = {"lines": [], "done": False, "rc": None}

    def _run():
        try:
            proc = subprocess.Popen(
                cmd_parts, shell=False,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                cwd=str(PROJECTS_ROOT), text=True,
                env={**os.environ, "TERM": "dumb"},
            )
            for line in proc.stdout:
                run_jobs[job_id]["lines"].append(line)
            proc.wait()
            run_jobs[job_id]["rc"] = proc.returncode
        except Exception as e:
            run_jobs[job_id]["lines"].append(f"Error: {e}\n")
            run_jobs[job_id]["rc"] = 1
        finally:
            run_jobs[job_id]["done"] = True
            _schedule_cleanup(job_id)

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"ok": True, "job_id": job_id})

# ══════════════════════════════════════════════════════════════════
#  Run code (Python / HTML)
# ══════════════════════════════════════════════════════════════════
@app.route("/api/run", methods=["POST"])
def run_code():
    rel = (request.json or {}).get("path", "")
    try:
        p   = safe_path(rel)
        ext = p.suffix.lower()
        if ext == ".py":
            job_id = _spawn_job(["python3", str(p)], cwd=str(p.parent))
            return jsonify({"ok": True, "job_id": job_id, "type": "python"})
        elif ext in (".html", ".htm"):
            return jsonify({"ok": True, "type": "html", "path": rel})
        elif ext == ".sh":
            job_id = _spawn_job(["bash", str(p)], cwd=str(p.parent))
            return jsonify({"ok": True, "job_id": job_id, "type": "shell"})
        elif ext == ".js":
            job_id = _spawn_job(["node", str(p)], cwd=str(p.parent))
            return jsonify({"ok": True, "job_id": job_id, "type": "node"})
        else:
            return jsonify({"error": "Hỗ trợ: .py .html .sh .js"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/run/output/<job_id>")
def run_output(job_id):
    def stream():
        sent = 0
        while True:
            job = run_jobs.get(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'Job không tồn tại'})}\n\n"
                return
            new_lines = job["lines"][sent:]
            for line in new_lines:
                yield f"data: {json.dumps({'line': line})}\n\n"
                sent += 1
            if job["done"] and sent >= len(job["lines"]):
                yield f"data: {json.dumps({'done': True, 'rc': job['rc']})}\n\n"
                return
            time.sleep(0.12)

    return Response(stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache"})

# ══════════════════════════════════════════════════════════════════
#  Git — structured info
# ══════════════════════════════════════════════════════════════════
@app.route("/api/git/info")
def git_info():
    """Trả thông tin git cơ bản: branch, clean/dirty, remote"""
    try:
        def _run(args):
            r = subprocess.run(
                ["git"] + args, cwd=str(PROJECTS_ROOT),
                capture_output=True, text=True, timeout=5
            )
            return r.stdout.strip(), r.returncode

        branch, rc = _run(["rev-parse", "--abbrev-ref", "HEAD"])
        if rc != 0:
            return jsonify({"git": False, "reason": "Không phải git repo"})

        status, _  = _run(["status", "--short"])
        log, _     = _run(["log", "--oneline", "-5"])
        remote, _  = _run(["remote", "get-url", "origin"])

        return jsonify({
            "git":    True,
            "branch": branch,
            "clean":  status == "",
            "dirty_files": len(status.splitlines()) if status else 0,
            "log":    log.splitlines(),
            "remote": remote or None,
        })
    except Exception as e:
        return jsonify({"git": False, "reason": str(e)})

# ══════════════════════════════════════════════════════════════════
#  Models
# ══════════════════════════════════════════════════════════════════
@app.route("/api/models")
def get_models():
    try:
        r      = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        models = [m["name"] for m in r.json().get("models", [])]
        return jsonify({"models": models, "current": MODEL})
    except Exception:
        return jsonify({"models": [], "current": MODEL, "offline": True})

@app.route("/api/models/set", methods=["POST"])
def set_model():
    global MODEL
    m = (request.json or {}).get("model", MODEL)
    try:
        r      = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        models = [x["name"] for x in r.json().get("models", [])]
        if m not in models:
            return jsonify({"error": f"Model '{m}' không tìm thấy"}), 400
        MODEL = m
        return jsonify({"ok": True, "model": MODEL})
    except Exception:
        return jsonify({"error": "Ollama offline"}), 500

@app.route("/api/models/pull", methods=["POST"])
def pull_model():
    name = str((request.json or {}).get("model", "")).strip()
    if not name:
        return jsonify({"error": "Thiếu tên model"}), 400
    if not re.match(r'^[\w.:/\-]+$', name) or len(name) > 100:
        return jsonify({"error": "Tên model không hợp lệ"}), 400
    try:
        r = requests.post(f"{OLLAMA_URL}/api/pull", json={"name": name}, timeout=600)
        return jsonify({"ok": r.ok})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/config", methods=["POST"])
def set_config():
    global MODEL, MAX_THREADS
    data    = request.json or {}
    changed = []

    if "threads" in data:
        try:
            t = int(data["threads"])
        except (TypeError, ValueError):
            return jsonify({"error": "threads phải là số nguyên"}), 400
        if t in (2, 4, 6, 8):
            MAX_THREADS = t
            changed.append(f"threads={t}")

    if "model" in data:
        m = str(data["model"]).strip()
        if m and len(m) <= 100 and re.match(r'^[\w.:/\-]+$', m):
            MODEL = m
            changed.append(f"model={MODEL}")

    cfg = Path.home() / ".aidev" / "config.env"
    cfg.parent.mkdir(parents=True, exist_ok=True)
    lines = {}
    if cfg.exists():
        for line in cfg.read_text("utf-8").splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                lines[k.strip()] = v.strip()
    lines["AI_THREADS"] = str(MAX_THREADS)
    lines["AI_MODEL"]   = MODEL
    cfg.write_text("\n".join(f"{k}={v}" for k, v in lines.items()) + "\n")

    return jsonify({"ok": True, "changed": changed, "threads": MAX_THREADS, "model": MODEL})

# ══════════════════════════════════════════════════════════════════
#  System info
# ══════════════════════════════════════════════════════════════════
@app.route("/api/storage")
def get_storage():
    try:
        st = shutil.disk_usage(str(PROJECTS_ROOT))
        return jsonify({
            "total_gb": round(st.total / 1024**3, 1),
            "used_gb":  round(st.used  / 1024**3, 1),
            "free_gb":  round(st.free  / 1024**3, 1),
            "pct":      round(st.used  / st.total * 100, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Cache CPU reading trước để tính delta (1 lần đọc không có nghĩa)
_cpu_prev: dict = {}

def _read_cpu_ticks() -> tuple[int, int]:
    """Đọc (busy, total) ticks từ /proc/stat"""
    with open("/proc/stat") as f:
        parts = f.readline().split()
    user, nice, system, idle = int(parts[1]), int(parts[2]), int(parts[3]), int(parts[4])
    iowait = int(parts[5]) if len(parts) > 5 else 0
    total  = user + nice + system + idle + iowait
    busy   = user + nice + system
    return busy, total

def _sys_stats() -> dict:
    """Đọc RAM/CPU thật từ /proc — hoạt động trên Termux/Android"""
    global _cpu_prev
    # RAM
    try:
        mem = {}
        with open("/proc/meminfo") as f:
            for line in f:
                k, v = line.split(":", 1)
                mem[k.strip()] = int(v.strip().split()[0])
        total_kb = mem.get("MemTotal", 0)
        avail_kb = mem.get("MemAvailable", mem.get("MemFree", 0))
        used_kb  = total_kb - avail_kb
        ram_pct  = round(used_kb / total_kb * 100, 1) if total_kb else 0
        ram_used = round(used_kb  / 1024**2, 1)
        ram_total= round(total_kb / 1024**2, 1)
    except Exception:
        ram_pct = 0; ram_used = 0; ram_total = 0

    # CPU — dùng delta giữa 2 lần đọc để có % thật
    cpu_pct = 0
    try:
        busy2, total2 = _read_cpu_ticks()
        if _cpu_prev:
            d_busy  = busy2  - _cpu_prev["busy"]
            d_total = total2 - _cpu_prev["total"]
            cpu_pct = round(d_busy / d_total * 100, 1) if d_total > 0 else 0
        _cpu_prev = {"busy": busy2, "total": total2}
    except Exception:
        pass

    return {"ram_pct": ram_pct, "ram_used_gb": ram_used, "ram_total_gb": ram_total, "cpu_pct": cpu_pct}

@app.route("/api/status")
def status():
    try:
        requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        ollama_ok = True
    except Exception:
        ollama_ok = False
    stats = _sys_stats()
    return jsonify({
        "ollama":        ollama_ok,
        "model":         MODEL,
        "threads":       MAX_THREADS,
        "projects_root": str(PROJECTS_ROOT),
        "version":       "AIDEv1.0.0",
        **stats,
    })

# ══════════════════════════════════════════════════════════════════
#  Project Manager
# ══════════════════════════════════════════════════════════════════
def _projects_base() -> Path:
    """Thư mục cha chứa tất cả project (mặc định: parent của PROJECTS_ROOT)"""
    env = os.environ.get("PROJECTS_BASE", "")
    if env:
        return Path(env)
    # Nếu PROJECTS_ROOT = /sdcard/AIProjects → base = /sdcard
    # Nếu PROJECTS_ROOT = ~/AIProjects      → base = ~
    return PROJECTS_ROOT.parent

@app.route("/api/projects")
def list_projects():
    """Liệt kê tất cả thư mục project trong thư mục cha"""
    base = _projects_base()
    try:
        projects = []
        for p in sorted(base.iterdir()):
            if not p.is_dir() or p.name.startswith("."):
                continue
            # Đếm file nhanh (không đệ quy sâu)
            try:
                file_count = sum(1 for _ in p.glob("*") if _.is_file())
            except Exception:
                file_count = 0
            projects.append({
                "name":     p.name,
                "path":     str(p),
                "active":   str(p) == str(PROJECTS_ROOT),
                "files":    file_count,
                "modified": int(p.stat().st_mtime),
            })
        return jsonify({
            "projects": projects,
            "current":  str(PROJECTS_ROOT),
            "base":     str(base),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/projects/switch", methods=["POST"])
def switch_project():
    """Chuyển active project — không cần restart bridge"""
    global PROJECTS_ROOT, SYSTEM_PROMPT, chat_history
    path_str = (request.json or {}).get("path", "").strip()
    if not path_str:
        return jsonify({"error": "Thiếu path"}), 400

    new_root = Path(path_str).resolve()
    if not new_root.is_dir():
        return jsonify({"error": f"Thư mục không tồn tại: {path_str}"}), 404

    # An toàn: phải nằm trong projects_base hoặc là thư mục hợp lệ
    base = _projects_base()
    try:
        new_root.relative_to(base)
    except ValueError:
        return jsonify({"error": "Thư mục ngoài vùng cho phép"}), 403

    with _state_lock:
        old_root      = PROJECTS_ROOT
        PROJECTS_ROOT = new_root
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)

    # Cập nhật system prompt với project mới
    SYSTEM_PROMPT = f"""Bạn là AI lập trình viên chuyên Python và HTML, giúp phát triển trên Android/Termux.
Project root: {PROJECTS_ROOT}. Trả lời bằng Tiếng Việt trừ khi được yêu cầu khác.

KHI TẠO/SỬA FILE dùng format (bắt buộc):
<<<FILE: đường/dẫn/file.py>>>
[nội dung file]
<<<END>>>

- Đường dẫn tương đối từ project root
- Có thể xuất nhiều file
- Giải thích ngắn TRƯỚC code
- Ưu tiên Pygame, HTML/JS thuần — tránh thư viện nặng
"""
    # Xóa chat history khi đổi project (tránh context lẫn lộn)
    with _history_lock:
        chat_history.clear()

    return jsonify({
        "ok":      True,
        "old":     str(old_root),
        "current": str(PROJECTS_ROOT),
        "name":    PROJECTS_ROOT.name,
    })

@app.route("/api/projects/create", methods=["POST"])
def create_project():
    """Tạo project mới trong thư mục cha"""
    name = (request.json or {}).get("name", "").strip()
    if not name or "/" in name or ".." in name:
        return jsonify({"error": "Tên project không hợp lệ"}), 400
    base    = _projects_base()
    new_dir = base / name
    if new_dir.exists():
        return jsonify({"error": f"'{name}' đã tồn tại"}), 409
    try:
        new_dir.mkdir(parents=True)
        return jsonify({"ok": True, "path": str(new_dir), "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Serve UI ──────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(str(UI_DIR), "index.html")

@app.route("/<path:filename>")
def static_ui(filename):
    return send_from_directory(str(UI_DIR), filename)

# ── Entry ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_chat_history()
    print(f"\n🤖  AI Dev Studio AIDEv1.0.0  →  http://0.0.0.0:{PORT}")
    print(f"📁  Projects : {PROJECTS_ROOT}")
    print(f"🧠  Model    : {MODEL}  |  Threads: {MAX_THREADS}")

    app.run(host="0.0.0.0", port=PORT, threaded=True)
