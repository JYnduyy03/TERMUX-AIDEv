/* ═══════════════════════════════════════════════════════════════
   TEMPLATES MODULE — templates.js
   Prompt templates cho AI Dev Studio
   - Pure frontend, không cần API mới
   - Fail-safe: lỗi module không ảnh hưởng app chính
   - Tích hợp: thêm nút 📋 vào chat toolbar
   ═══════════════════════════════════════════════════════════════ */

;(function() {  // IIFE — không leak biến ra global

'use strict';

// ── Config ──────────────────────────────────────────────────────
const TPL_CONFIG = {
  jsonPath: 'templates.json',   // đường dẫn tương đối từ UI
  storageKey: 'aidev_tpl_last', // nhớ template vừa dùng
  panelId: 'tpl-panel',
  btnId: 'tpl-btn',
};

// ── State ────────────────────────────────────────────────────────
let _templates = [];     // dữ liệu load từ JSON
let _panelOpen = false;  // trạng thái panel
let _filter = '';        // từ khoá đang lọc

// ── Load templates từ JSON ────────────────────────────────────
async function _loadTemplates() {
  if (_templates.length > 0) return _templates;  // cache
  try {
    const res = await fetch(TPL_CONFIG.jsonPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _templates = await res.json();
    return _templates;
  } catch (e) {
    console.warn('[Templates] Không load được templates.json:', e.message);
    return [];
  }
}

// ── Tạo nút 📋 trong chat toolbar ────────────────────────────
function _injectButton() {
  // Kiểm tra tránh inject 2 lần
  if (document.getElementById(TPL_CONFIG.btnId)) return;

  const toolbar = document.querySelector('.chat-tb');
  if (!toolbar) {
    console.warn('[Templates] Không tìm thấy .chat-tb');
    return;
  }

  const btn = document.createElement('button');
  btn.id = TPL_CONFIG.btnId;
  btn.className = 'tbtn';
  btn.title = 'Chọn prompt template';
  btn.innerHTML = '📋 Templates';
  btn.style.cssText = `
    color: var(--acc);
    border: 1px solid rgba(var(--acc-rgb, 99,179,237), 0.3);
    background: rgba(var(--acc-rgb, 99,179,237), 0.07);
  `;
  btn.onclick = togglePanel;

  // Chèn trước nút Xóa chat (luôn là phần tử cuối)
  toolbar.insertBefore(btn, toolbar.lastElementChild);
}

// ── Tạo panel chứa danh sách templates ───────────────────────
function _buildPanel() {
  if (document.getElementById(TPL_CONFIG.panelId)) return;

  const panel = document.createElement('div');
  panel.id = TPL_CONFIG.panelId;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chọn prompt template');
  panel.style.cssText = `
    display: none;
    position: absolute;
    bottom: 100%;
    left: 0; right: 0;
    background: var(--bg2);
    border: 1px solid var(--b1);
    border-radius: 10px 10px 0 0;
    z-index: 120;
    max-height: 60vh;
    overflow: hidden;
    display: none;
    flex-direction: column;
    box-shadow: 0 -4px 20px rgba(0,0,0,.35);
  `;

  panel.innerHTML = `
    <div style="
      display:flex; align-items:center; gap:8px;
      padding:10px 12px; border-bottom:1px solid var(--b1);
      flex-shrink:0;
    ">
      <span style="font-size:13px; font-weight:600; color:var(--t1); flex:1">
        📋 Chọn Template
      </span>
      <input
        id="tpl-search"
        type="text"
        placeholder="Tìm template..."
        autocomplete="off"
        style="
          background: var(--bg3,var(--bg1));
          border: 1px solid var(--b1);
          border-radius: 6px;
          padding: 4px 8px;
          color: var(--t1);
          font-size: 11px;
          width: 130px;
          outline: none;
        "
        oninput="window._tplSearch(this.value)"
      >
      <button
        onclick="window.toggleTemplatePanel()"
        style="
          background: none; border: none;
          color: var(--t3); cursor: pointer;
          font-size: 16px; line-height:1;
          padding: 0 2px;
        "
        title="Đóng"
      >✕</button>
    </div>
    <div id="tpl-list" style="
      overflow-y: auto;
      flex: 1;
      padding: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      -webkit-overflow-scrolling: touch;
    "></div>
  `;

  // Gắn vào chat panel, trước inp-area
  const chatPanel = document.getElementById('p-chat');
  const inpArea = chatPanel?.querySelector('.inp-area');
  if (chatPanel && inpArea) {
    // Bọc relative để panel position đúng
    inpArea.style.position = 'relative';
    chatPanel.insertBefore(panel, inpArea);
  } else {
    document.body.appendChild(panel);
  }
}

// ── Render danh sách template (có lọc) ───────────────────────
function _renderList(filter = '') {
  const list = document.getElementById('tpl-list');
  if (!list) return;

  const q = filter.toLowerCase().trim();
  const filtered = q
    ? _templates.filter(t =>
        t.label.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      )
    : _templates;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="
        grid-column: 1/-1;
        text-align:center; color:var(--t3);
        font-size:11px; padding:16px;
      ">Không tìm thấy template nào 🔍</div>
    `;
    return;
  }

  list.innerHTML = filtered.map(tpl => `
    <button
      class="tpl-card"
      onclick="window._tplSelect('${tpl.id}')"
      title="${tpl.tags.join(', ')}"
      style="
        background: var(--bg3, var(--bg1));
        border: 1px solid var(--b1);
        border-radius: 8px;
        padding: 10px 8px;
        cursor: pointer;
        text-align: left;
        transition: border-color .15s, background .15s;
        display: flex;
        flex-direction: column;
        gap: 4px;
      "
      onmouseover="this.style.borderColor='var(--acc)';this.style.background='var(--bg1)'"
      onmouseout="this.style.borderColor='var(--b1)';this.style.background='var(--bg3,var(--bg1))'"
    >
      <span style="font-size:18px; line-height:1">${tpl.icon}</span>
      <span style="
        font-size:11px; font-weight:600;
        color:var(--t1); line-height:1.3;
      ">${tpl.label}</span>
      <span style="
        font-size:9px; color:var(--t3);
        overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
      ">${tpl.tags.slice(0, 3).join(' · ')}</span>
    </button>
  `).join('');
}

// ── Chọn template → điền vào chat input ──────────────────────
function _selectTemplate(id) {
  const tpl = _templates.find(t => t.id === id);
  if (!tpl) return;

  const inp = document.getElementById('chat-inp');
  if (!inp) return;

  // Điền prompt vào input
  inp.value = tpl.prompt;
  inp.focus();

  // Trigger autoH nếu có (co giãn textarea)
  if (typeof autoH === 'function') autoH(inp);

  // Lưu last used
  try { localStorage.setItem(TPL_CONFIG.storageKey, id); } catch {}

  // Đóng panel
  closePanel();

  // Đặt cursor về đầu để user thấy placeholder dễ sửa
  inp.setSelectionRange(0, 0);
  inp.scrollTop = 0;
}

// ── Mở/đóng panel ────────────────────────────────────────────
async function togglePanel() {
  if (_panelOpen) {
    closePanel();
  } else {
    await openPanel();
  }
}

async function openPanel() {
  // Load data lần đầu
  await _loadTemplates();
  _buildPanel();

  const panel = document.getElementById(TPL_CONFIG.panelId);
  if (!panel) return;

  _renderList(_filter);
  panel.style.display = 'flex';
  _panelOpen = true;

  // Focus vào search
  setTimeout(() => {
    document.getElementById('tpl-search')?.focus();
  }, 50);

  // Click ngoài → đóng
  setTimeout(() => {
    document.addEventListener('click', _outsideClick, { once: true });
  }, 0);
}

function closePanel() {
  const panel = document.getElementById(TPL_CONFIG.panelId);
  if (panel) panel.style.display = 'none';
  _panelOpen = false;
  _filter = '';
  const search = document.getElementById('tpl-search');
  if (search) search.value = '';
}

function _outsideClick(e) {
  const panel = document.getElementById(TPL_CONFIG.panelId);
  const btn   = document.getElementById(TPL_CONFIG.btnId);
  if (panel && !panel.contains(e.target) && e.target !== btn) {
    closePanel();
  }
}

// ── Search handler ────────────────────────────────────────────
function _search(value) {
  _filter = value;
  _renderList(value);
}

// ── Init ─────────────────────────────────────────────────────
function initTemplates() {
  _injectButton();
  // Preload data im lặng (không block UI)
  _loadTemplates().catch(() => {});
}

// ── Exports ra window (để onclick="" trong HTML dùng được) ───
window.toggleTemplatePanel = togglePanel;
window._tplSelect          = _selectTemplate;
window._tplSearch          = _search;
window.initTemplates       = initTemplates;
window.closeTemplatePanel  = closePanel;   // alias cho Esc handler

// ── Auto-init khi DOM sẵn sàng ───────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTemplates);
} else {
  // DOM đã ready, đợi app.js init xong
  setTimeout(initTemplates, 200);
}

})(); // end IIFE
