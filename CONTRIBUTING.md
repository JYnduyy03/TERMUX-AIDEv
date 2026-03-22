# 🤝 Hướng dẫn đóng góp — AIDEv1.0.0

> 🌐 [English](CONTRIBUTING.en.md)

Cảm ơn bạn đã quan tâm đến dự án! Mọi đóng góp đều được chào đón — từ sửa typo, báo lỗi, đến thêm tính năng mới.

---

## 📋 Báo lỗi (Issue)

Trước khi tạo Issue mới, hãy kiểm tra xem lỗi đó đã được báo cáo chưa.

**Mẫu báo lỗi:**
```
**Mô tả lỗi:**

**Bước tái hiện:**
1.
2.
3.

**Kết quả mong đợi:**

**Kết quả thực tế:**

**Log từ bridge.py:**

**Môi trường:**
- Android version:
- RAM:
- Ollama version:
- Model đang dùng:
```

---

## 🔧 Gửi Pull Request

### 1. Fork & Clone

```bash
git clone https://github.com/JYnduyy03/TERMUX-AIDE.git
cd AIDEv1.0.0
```

### 2. Tạo branch mới

```bash
git checkout -b fix/ten-bug
git checkout -b feat/ten-tinh-nang
git checkout -b docs/cap-nhat-tai-lieu
```

### 3. Quy tắc code

**Backend (`bridge.py`)**
- Dùng `safe_path()` cho mọi thao tác file
- Dùng `_history_lock` khi đọc/ghi `chat_history`
- Luôn trả `jsonify({"error": "..."})` khi có lỗi
- Không dùng `bare except:` — dùng `except Exception`

**Frontend (`ui/app.js`)**
- Dùng `apiFetch()` thay vì `fetch()` trực tiếp
- Dùng `toast()` để thông báo cho người dùng
- Dùng `escH()` khi render text vào HTML

**Thêm template** (`ui/templates.json`)
```json
{
  "id": "ten-template",
  "icon": "🔥",
  "label": "Tên hiển thị",
  "tags": ["tag1", "tag2"],
  "prompt": "Nội dung prompt mẫu..."
}
```

### 4. Test trước khi submit

```bash
# Kiểm tra syntax
python3 -c "import ast; ast.parse(open('bridge.py').read()); print('bridge.py OK')"
node --check ui/app.js && echo "app.js OK"

# Chạy test suite
bash test_phase1.sh
```

### 5. Commit convention

```
fix: sửa lỗi numbered list trong renderMd
feat: thêm keyboard shortcut Ctrl+S
docs: cập nhật hướng dẫn cài đặt
refactor: tối ưu search_files tránh OOM
perf: giảm latency chat stream
test: thêm test terminal injection
chore: cập nhật .gitignore
```

### 6. Push & tạo Pull Request

```bash
git push origin fix/ten-bug
```

Mô tả PR cần có:
- Vấn đề đang giải quyết (link Issue nếu có)
- Cách tiếp cận
- Test đã chạy

---

## 💡 Gợi ý đóng góp theo độ khó

| Độ khó | Việc cần làm |
|--------|-------------|
| 🟢 Dễ | Thêm prompt template vào `templates.json` |
| 🟢 Dễ | Thêm icon cho extension file mới trong `app.js` |
| 🟡 Trung bình | Cải thiện `renderMd()` hỗ trợ thêm markdown |
| 🟡 Trung bình | Thêm endpoint `/api/files/copy` |
| 🟡 Trung bình | Cải thiện UI mobile (touch, swipe) |
| 🔴 Khó | Diff viewer khi AI sửa file |
| 🔴 Khó | Hỗ trợ multimodal (gửi ảnh cho AI) |
| 🔴 Khó | Export/import project dạng zip |

---

## 📜 Quy tắc ứng xử

- Tôn trọng lẫn nhau
- Feedback mang tính xây dựng
- Câu hỏi cơ bản cũng được hoan nghênh
- Ngôn ngữ: Tiếng Việt hoặc Tiếng Anh đều được

---

Cảm ơn bạn! 🙌
