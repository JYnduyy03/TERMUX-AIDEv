# 🤝 Contribution Guide — AIDEv1.0.0

> 🌐 [Tiếng Việt](CONTRIBUTING.md)

Thank you for your interest in contributing! All contributions are welcome — from fixing typos and reporting bugs to adding new features.

---

## 📋 Reporting Bugs (Issues)

Before opening a new Issue, please check if it has already been reported.

**Bug report template:**
```
**Description:**

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Log from bridge.py:**

**Environment:**
- Android version:
- RAM:
- Ollama version:
- AI model in use:
```

---

## 🔧 Submitting a Pull Request

### 1. Fork & Clone

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDE.git
cd AIDEv1.0.0
```

### 2. Create a new branch

```bash
git checkout -b fix/bug-name
git checkout -b feat/feature-name
git checkout -b docs/update-docs
```

### 3. Code guidelines

**Backend (`bridge.py`)**
- Always use `safe_path()` for file operations
- Use `_history_lock` when reading/writing `chat_history`
- Always return `jsonify({"error": "..."})` on errors
- Never use bare `except:` — use `except Exception`

**Frontend (`ui/app.js`)**
- Use `apiFetch()` instead of raw `fetch()`
- Use `toast()` to notify the user
- Use `escH()` when rendering text into HTML

**Adding a template** (`ui/templates.json`)
```json
{
  "id": "template-id",
  "icon": "🔥",
  "label": "Display Name",
  "tags": ["tag1", "tag2"],
  "prompt": "Your prompt template here..."
}
```

### 4. Test before submitting

```bash
# Syntax checks
python3 -c "import ast; ast.parse(open('bridge.py').read()); print('bridge.py OK')"
node --check ui/app.js && echo "app.js OK"

# Run test suite
bash test_phase1.sh
```

### 5. Commit convention

```
fix: fix numbered list rendering in renderMd
feat: add Ctrl+S keyboard shortcut
docs: update installation guide
refactor: optimize search_files to avoid OOM
perf: reduce chat stream latency
test: add terminal injection test
chore: update .gitignore
```

### 6. Push & open Pull Request

```bash
git push origin fix/bug-name
```

Your PR description should include:
- The problem being solved (link Issue if applicable)
- Your approach
- Tests you ran

---

## 💡 Contribution ideas by difficulty

| Difficulty | Task |
|------------|------|
| 🟢 Easy | Add prompt templates to `templates.json` |
| 🟢 Easy | Add icons for new file extensions in `app.js` |
| 🟡 Medium | Improve `renderMd()` to support more markdown syntax |
| 🟡 Medium | Add `/api/files/copy` endpoint |
| 🟡 Medium | Improve mobile UI (touch, swipe gestures) |
| 🔴 Hard | Diff viewer when AI edits files |
| 🔴 Hard | Multimodal support (send images to AI) |
| 🔴 Hard | Export/import project as zip |

---

## 📜 Code of Conduct

- Treat everyone with respect
- Give constructive feedback
- Beginner questions are always welcome
- Language: Vietnamese or English are both fine

---

Thank you for contributing! 🙌
