/* ═══════════════════════════════════════════════════════════════
   FILE SEARCH MODULE — file-search.js
   Tìm kiếm file real-time trong project sidebar
   - Không cần API mới — filter DOM tree đã render
   - Fail-safe: lỗi không ảnh hưởng app chính
   ═══════════════════════════════════════════════════════════════ */

;(function() {
'use strict';

const FS_ID       = 'fs-input';
const FS_WRAP_ID  = 'fs-wrap';
const FS_COUNT_ID = 'fs-count';
const FS_KEY      = 'aidev_fs_q';   // nhớ query qua reload

let _debounceTimer = null;
let _lastQuery = '';

// ── Inject UI vào sidebar ────────────────────────────────────
function _inject() {
  if (document.getElementById(FS_WRAP_ID)) return;

  // Tìm vị trí chèn: trước #sb-tree
  const sbTree = document.getElementById('sb-tree');
  if (!sbTree) { console.warn('[FileSearch] #sb-tree not found'); return; }

  const wrap = document.createElement('div');
  wrap.id = FS_WRAP_ID;
  wrap.style.cssText = `
    padding: 6px 8px 4px;
    flex-shrink: 0;
  `;

  wrap.innerHTML = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
    ">
      <!-- Icon search -->
      <span style="
        position: absolute;
        left: 7px;
        font-size: 10px;
        opacity: .45;
        pointer-events: none;
        user-select: none;
      ">🔍</span>

      <!-- Input -->
      <input
        id="${FS_ID}"
        type="text"
        placeholder="Tìm file..."
        autocomplete="off"
        spellcheck="false"
        style="
          width: 100%;
          background: var(--bg1);
          border: 1px solid var(--b1);
          border-radius: 5px;
          padding: 4px 28px 4px 24px;
          color: var(--t1);
          font-size: 10px;
          font-family: var(--mono);
          outline: none;
          box-sizing: border-box;
          transition: border-color .15s;
        "
        oninput="window._fsOnInput(this.value)"
        onkeydown="window._fsOnKey(event)"
        onfocus="this.style.borderColor='var(--acc)'"
        onblur="this.style.borderColor='var(--b1)'"
      >

      <!-- Clear button -->
      <button
        id="fs-clear"
        onclick="window._fsClear()"
        title="Xóa tìm kiếm (Esc)"
        style="
          display: none;
          position: absolute;
          right: 4px;
          background: none;
          border: none;
          color: var(--t3);
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          padding: 2px 3px;
        "
      >✕</button>
    </div>

    <!-- Kết quả count -->
    <div
      id="${FS_COUNT_ID}"
      style="
        font-size: 9px;
        color: var(--t3);
        padding: 2px 2px 0;
        min-height: 14px;
        display: none;
      "
    ></div>
  `;

  // Chèn trước sb-tree
  sbTree.parentNode.insertBefore(wrap, sbTree);
}

// ── Filter tree items ────────────────────────────────────────
function _filter(query) {
  _lastQuery = query;
  const q = query.toLowerCase().trim();

  // Lấy tất cả tree-item trong sidebar
  const sbTree = document.getElementById('sb-tree');
  if (!sbTree) return;

  const items = sbTree.querySelectorAll('.tree-item');
  const count  = document.getElementById(FS_COUNT_ID);
  const clearBtn = document.getElementById('fs-clear');

  if (!q) {
    // Reset: hiện tất cả, xóa highlight
    items.forEach(el => {
      el.style.display = '';
      _unhighlight(el);
    });
    if (count)    { count.style.display = 'none'; count.textContent = ''; }
    if (clearBtn)  clearBtn.style.display = 'none';
    return;
  }

  // Có query
  if (clearBtn) clearBtn.style.display = '';

  let matched = 0;
  let firstMatch = null;

  items.forEach(el => {
    // Lấy tên file (text node trực tiếp, bỏ qua button con)
    const name = _getItemName(el).toLowerCase();

    if (name.includes(q)) {
      el.style.display = '';
      _highlight(el, query);
      matched++;
      if (!firstMatch) firstMatch = el;
    } else {
      el.style.display = 'none';
      _unhighlight(el);
    }
  });

  // Hiện count
  if (count) {
    count.style.display = '';
    count.textContent = matched > 0
      ? `${matched} kết quả`
      : 'Không tìm thấy';
    count.style.color = matched > 0 ? 'var(--t3)' : 'var(--red, #fc8181)';
  }

  // Lưu query
  try { sessionStorage.setItem(FS_KEY, query); } catch {}
}

// ── Lấy tên file từ tree-item ────────────────────────────────
function _getItemName(el) {
  // Clone và xóa các button (trash, v.v.) để lấy text thuần
  const clone = el.cloneNode(true);
  clone.querySelectorAll('button, svg').forEach(n => n.remove());
  return clone.textContent.trim();
}

// ── Highlight match ──────────────────────────────────────────
function _highlight(el, query) {
  // Chỉ highlight text node chứa tên file, không đụng button
  // Đơn giản: thêm outline
  el.style.outline = '1px solid rgba(var(--acc-rgb,99,179,237),.35)';
  el.style.borderRadius = '3px';
}

function _unhighlight(el) {
  el.style.outline = '';
  el.style.borderRadius = '';
}

// ── Event handlers ───────────────────────────────────────────
function _onInput(value) {
  // Debounce 120ms — nhẹ cho Termux
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => _filter(value), 120);
}

function _onKey(e) {
  if (e.key === 'Escape') {
    _clear();
    return;
  }

  if (e.key === 'Enter') {
    // Mở file đầu tiên trong kết quả
    const sbTree = document.getElementById('sb-tree');
    if (!sbTree) return;
    const first = sbTree.querySelector('.tree-item[style*="display: "]');
    // Tìm item hiển thị và không phải folder
    const visible = Array.from(sbTree.querySelectorAll('.tree-item'))
      .find(el => el.style.display !== 'none');
    if (visible) visible.click();
    e.preventDefault();
  }
}

function _clear() {
  const inp = document.getElementById(FS_ID);
  if (inp) { inp.value = ''; inp.focus(); }
  _filter('');
  try { sessionStorage.removeItem(FS_KEY); } catch {}
}

// ── Khôi phục query cũ (nếu có) ─────────────────────────────
function _restoreQuery() {
  try {
    const saved = sessionStorage.getItem(FS_KEY);
    if (saved) {
      const inp = document.getElementById(FS_ID);
      if (inp) { inp.value = saved; _filter(saved); }
    }
  } catch {}
}

// ── Re-filter sau khi tree được rebuild ─────────────────────
// Hook vào loadFiles — nếu có query đang active thì filter lại
function _hookTreeRefresh() {
  const origLoadFiles = window.loadFiles;
  if (typeof origLoadFiles !== 'function') return;

  window.loadFiles = async function(...args) {
    const result = await origLoadFiles.apply(this, args);
    // Đợi tree render xong rồi apply filter
    if (_lastQuery) {
      setTimeout(() => _filter(_lastQuery), 50);
    }
    return result;
  };
}

// ── Init ─────────────────────────────────────────────────────
function initFileSearch() {
  _inject();
  _restoreQuery();
  _hookTreeRefresh();
}

// ── Exports ──────────────────────────────────────────────────
window._fsOnInput    = _onInput;
window._fsOnKey      = _onKey;
window._fsClear      = _clear;
window.initFileSearch = initFileSearch;

// ── Auto-init ────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initFileSearch, 350));
} else {
  setTimeout(initFileSearch, 350);
}

})();
