/* ═══════════════════════════════════════════════════════════════
   AI Dev Studio — app.js  AIDEv1.0.0
   ═══════════════════════════════════════════════════════════════ */

const HISTORY_KEY = 'aidev_chat_history';

// ── State ────────────────────────────────────────────────────────
let currentFile  = null;   // {path, name, ext}
let attachedFile = null;   // {name, content}
let streaming    = false;
let msgCounter   = 0;

// ── Init ─────────────────────────────────────────────────────────
let _fakeTimer = null;
async function init() {
  // 1. Load data
  await loadStatus();
  await loadFiles();
  await loadStorage();
  initThreadSlider();
  loadChatHistory();

  // 2. Sync server history (silent)
  try {
    const h = await apiFetch('/api/chat/history');
    if (h.history?.length) console.log('Server history:', h.history.length, 'msgs');
  } catch {}

  // 3. Periodic tasks
  setInterval(loadStatus,  8000);
  _fakeTimer = setInterval(fakeStats, 3000);
  setInterval(loadStorage, 20000);
  setInterval(() => apiFetch('/api/chat/save', {method:'POST'}).catch(()=>{}), 60000);

  // 4. Init modules (fail-safe)
  setTimeout(() => {
    _callIfExists('initTerminal');
    _callIfExists('initTemplates');
    _callIfExists('initGit');
    _callIfExists('initFileSearch');
    _callIfExists('initHealth');
  }, 150);
}

function _callIfExists(name, ...args) {
  if (typeof window[name] === 'function') window[name](...args);
}

// ── API helper ───────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

function setTxt(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Status & Stats ───────────────────────────────────────────────
async function loadStatus() {
  try {
    const d   = await apiFetch('/api/status');
    const dot = document.getElementById('st-dot');
    if (!dot) return;
    if (d.ollama) {
      dot.className = 'st-dot';
      const tag = document.getElementById('hdr-model');
      if (tag) {
        const node = tag.lastChild;
        if (node?.nodeType === 3) node.textContent = ' ' + d.model.split(':')[0];
      }
    } else {
      dot.className = 'st-dot off';
    }
    // Cập nhật stats thật nếu bridge trả về
    if (d.ram_pct !== undefined) _applyStats(d);
  } catch {}
}

// Áp dụng stats thật từ /api/status (bridge đọc /proc/meminfo)
function _applyStats(d) {
  _hasRealStats = true;
  if (_fakeTimer) { clearInterval(_fakeTimer); _fakeTimer = null; }
  const rPct = d.ram_pct + '%';
  const cPct = d.cpu_pct + '%';
  const rVal = d.ram_used_gb + '/' + d.ram_total_gb + 'G';

  ['s-ram','pc-ram-bar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = rPct; });
  ['s-cpu','pc-cpu-bar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = cPct; });
  setTxt('v-ram', rVal); setTxt('pc-ram', d.ram_used_gb);
  setTxt('v-cpu', Math.round(d.cpu_pct) + '%'); setTxt('pc-cpu', Math.round(d.cpu_pct));
}

// fakeStats chỉ chạy khi loadStatus chưa xong (lần khởi đầu)
let _hasRealStats = false;
function fakeStats() {
  if (_hasRealStats) return;   // đã có real stats thì không fake nữa
  const r = 55 + Math.random() * 14, c = 28 + Math.random() * 18;
  const rv = (r / 100 * 8).toFixed(1);
  ['s-ram','pc-ram-bar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = r.toFixed(1) + '%'; });
  ['s-cpu','pc-cpu-bar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = c.toFixed(1) + '%'; });
  setTxt('v-ram', rv + 'GB'); setTxt('pc-ram', rv);
  setTxt('v-cpu', Math.round(c) + '%'); setTxt('pc-cpu', Math.round(c));
}

async function loadStorage() {
  try {
    const d = await apiFetch('/api/storage');
    if (d.error) return;
    const pct = d.pct + '%';
    ['s-sto','pc-sto-bar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = pct; });
    setTxt('v-sto', d.used_gb + '/' + d.total_gb + 'G');
    setTxt('pc-sto', d.used_gb);
  } catch {}
}

// ── File Tree ─────────────────────────────────────────────────────
const extIcon  = {py:'🐍',html:'🌐',htm:'🌐',json:'📋',md:'📝',txt:'📄',css:'🎨',js:'📜',sh:'⚙️',png:'🖼️',jpg:'🖼️',gif:'🖼️',mp4:'🎬'};
const extColor = {py:'ti-py',html:'ti-html',htm:'ti-html',json:'ti-json',md:'ti-md',css:'ti-md',js:'ti-md',sh:'ti-sh',txt:'ti-txt'};

async function loadFiles(path = '') {
  try {
    const d = await apiFetch(`/api/files?path=${encodeURIComponent(path)}`);
    buildTree(d.items || [], 'main-tree', path);
    buildTree(d.items || [], 'sb-tree',   path);
  } catch {}
}

function buildTree(items, containerId, basePath = '') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'tree-item' + (currentFile?.path === item.path ? ' sel' : '');
    row.style.paddingLeft = '8px';

    const arrow = document.createElement('span');
    arrow.className = 'ti-arrow' + (item.is_dir ? '' : ' leaf');
    arrow.textContent = '›';

    const icon = document.createElement('span');
    icon.className = 'ti-icon ' + (item.is_dir ? '' : (extColor[item.name.split('.').pop()] || 'ti-txt'));
    icon.textContent = item.is_dir ? '📁' : (extIcon[item.name.split('.').pop()] || '📄');

    const name = document.createElement('span');
    name.className = 'ti-name';
    name.textContent = item.name;

    // Rename on double-click
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      startInlineRename(item, name);
    });

    const del = document.createElement('span');
    del.className = 'ti-del';
    del.innerHTML = `<svg viewBox="0 0 24 24"><use href="#ic-x" stroke="currentColor" stroke-width="2"/></svg>`;
    del.title = 'Xóa ' + item.name;
    del.addEventListener('click', e => { e.stopPropagation(); deleteItem(item); });

    row.appendChild(arrow); row.appendChild(icon); row.appendChild(name); row.appendChild(del);

    if (item.is_dir) {
      let open = false;
      const ch = document.createElement('div');
      ch.className = 'tree-children';
      row.addEventListener('click', async () => {
        open = !open;
        arrow.classList.toggle('open', open);
        icon.textContent = open ? '📂' : '📁';
        ch.classList.toggle('open', open);
        if (open && !ch.children.length) {
          const d2 = await apiFetch(`/api/files?path=${encodeURIComponent(item.path)}`);
          (d2.items || []).forEach(sub => ch.appendChild(makeFileRow(sub, 20)));
        }
      });
      el.appendChild(row); el.appendChild(ch);
    } else {
      row.addEventListener('click', () => openFile(item));
      el.appendChild(row);
    }
  });
}

function makeFileRow(item, indent = 8) {
  const row = document.createElement('div');
  row.className = 'tree-item' + (currentFile?.path === item.path ? ' sel' : '');
  row.style.paddingLeft = indent + 'px';
  const ext = item.name.split('.').pop();
  const name = document.createElement('span');
  name.className = 'ti-name';
  name.textContent = item.name;
  name.addEventListener('dblclick', e => { e.stopPropagation(); startInlineRename(item, name); });
  row.innerHTML = `
    <span class="ti-arrow leaf">›</span>
    <span class="ti-icon ${extColor[ext]||'ti-txt'}">${extIcon[ext]||'📄'}</span>`;
  row.appendChild(name);
  const del = document.createElement('span');
  del.className = 'ti-del';
  del.innerHTML = `<svg viewBox="0 0 24 24"><use href="#ic-x" stroke="currentColor" stroke-width="2"/></svg>`;
  del.addEventListener('click', e => { e.stopPropagation(); deleteItem(item); });
  row.appendChild(del);
  row.addEventListener('click', () => openFile(item));
  return row;
}

// ── Inline rename ─────────────────────────────────────────────────
function startInlineRename(item, nameEl) {
  const oldName = item.name;
  const input   = document.createElement('input');
  input.type  = 'text';
  input.value = oldName;
  input.className = 'ti-rename-input';
  input.style.cssText = `
    background:var(--bg3);border:1px solid var(--acc);border-radius:3px;
    color:var(--t1);font-family:var(--mono);font-size:10px;
    padding:1px 5px;outline:none;width:calc(100% - 8px);`;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    const newName = input.value.trim();
    if (!newName || newName === oldName) { input.replaceWith(nameEl); return; }
    const dir     = item.path.split('/').slice(0, -1).join('/');
    const newPath = dir ? dir + '/' + newName : newName;
    try {
      const r = await apiFetch('/api/files/rename', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({old_path: item.path, new_path: newPath}),
      });
      if (currentFile?.path === item.path) {
        currentFile = { ...currentFile, path: newPath, name: newName };
        setTxt('editor-fname', newName);
        setTxt('out-fname', newName);
      }
      await loadFiles();
      toast(`Đổi tên: ${oldName} → ${newName}`, 'ok');
    } catch { input.replaceWith(nameEl); }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.replaceWith(nameEl); }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.contains(input)) input.replaceWith(nameEl); }, 150));
}

// ── File ops ──────────────────────────────────────────────────────
async function deleteItem(item) {
  if (!confirm(`Xóa "${item.name}"?`)) return;
  const r = await apiFetch('/api/files/delete', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({path: item.path}),
  });
  if (currentFile?.path === item.path) {
    currentFile = null;
    setTxt('editor-fname', '—'); setTxt('out-fname', '—');
    document.getElementById('code-content').textContent = '';
    document.getElementById('line-nums').innerHTML = '';
  }
  await loadFiles();
  toast('Đã xóa: ' + item.name, 'ok');
}

async function openFile(item) {
  try {
    const d = await apiFetch(`/api/files/read?path=${encodeURIComponent(item.path)}`);
    currentFile = {path: item.path, name: item.name, ext: item.name.split('.').pop()};
    const lines = d.content.split('\n');
    setTxt('editor-fname', item.name); setTxt('out-fname', item.name);
    document.getElementById('code-content').textContent = d.content;
    document.getElementById('line-nums').innerHTML = lines.map((_,i) => `<div class="ln">${i+1}</div>`).join('');
    document.querySelectorAll('.tree-item').forEach(r => {
      r.classList.toggle('sel', r.querySelector('.ti-name')?.textContent === item.name);
    });
    feSwitch('editor'); switchTo('files');
    document.getElementById('save-dot').classList.remove('show');
    document.getElementById('save-dot2')?.classList.remove('show');
    setTimeout(() => _callIfExists('highlightEditor'), 0);
  } catch { toast('Lỗi mở file', 'err'); }
}

function onCodeEdit() {
  document.getElementById('save-dot').classList.add('show');
  document.getElementById('save-dot2')?.classList.add('show');
}

async function saveFile() {
  if (!currentFile) { toast('Chưa mở file', 'err'); return; }
  const content = document.getElementById('code-content').textContent;
  const r = await apiFetch('/api/files/write', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({path: currentFile.path, content}),
  });
  if (r.error) { toast(r.error, 'err'); return; }
  document.getElementById('save-dot').classList.remove('show');
  document.getElementById('save-dot2')?.classList.remove('show');
  toast('Đã lưu: ' + currentFile.name, 'ok');
}

async function promptNewFile() {
  const name = prompt('Tên file mới (vd: game.py):');
  if (!name?.trim()) return;
  await apiFetch('/api/files/write', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: name.trim(), content: ''}),
  });
  await loadFiles();
  toast('Đã tạo: ' + name, 'ok');
}

async function promptNewDir() {
  const name = prompt('Tên thư mục mới (vd: assets):');
  if (!name?.trim()) return;
  await apiFetch('/api/files/mkdir', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: name.trim()}),
  });
  await loadFiles();
  toast('Đã tạo thư mục: ' + name, 'ok');
}

function toggleLN(tog) {
  tog.classList.toggle('on');
  document.getElementById('line-nums').style.display = tog.classList.contains('on') ? '' : 'none';
}

// ── Search in files ───────────────────────────────────────────────
let _searchDebounce = null;

function openSearchPanel() {
  let panel = document.getElementById('search-panel');
  if (!panel) panel = _buildSearchPanel();
  panel.style.display = 'flex';
  switchTo('files');
  setTimeout(() => document.getElementById('search-input')?.focus(), 50);
}

function _buildSearchPanel() {
  const panel = document.createElement('div');
  panel.id = 'search-panel';
  panel.style.cssText = `
    display:none;flex-direction:column;
    position:absolute;inset:0;background:var(--bg);z-index:20;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--b1);background:var(--bg2);flex-shrink:0">
      <span style="font-size:11px;color:var(--t3)">🔍</span>
      <input id="search-input" type="text" placeholder="Tìm trong project..."
        autocomplete="off" spellcheck="false"
        style="flex:1;background:transparent;border:none;color:var(--t1);font-family:var(--mono);font-size:10.5px;outline:none"
        oninput="onSearchInput(this.value)" onkeydown="if(event.key==='Escape')closeSearchPanel()">
      <button onclick="closeSearchPanel()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:0 2px">✕</button>
    </div>
    <div id="search-results" style="flex:1;overflow-y:auto;padding:6px;scrollbar-width:thin;scrollbar-color:var(--b2) transparent">
      <div style="text-align:center;padding:24px;color:var(--t3);font-size:10px">Nhập từ khoá để tìm...</div>
    </div>
  `;
  document.getElementById('fe-body')?.appendChild(panel);
  return panel;
}

function closeSearchPanel() {
  const p = document.getElementById('search-panel');
  if (p) p.style.display = 'none';
}

function onSearchInput(q) {
  clearTimeout(_searchDebounce);
  if (q.trim().length < 2) {
    document.getElementById('search-results').innerHTML =
      '<div style="text-align:center;padding:24px;color:var(--t3);font-size:10px">Nhập ít nhất 2 ký tự...</div>';
    return;
  }
  _searchDebounce = setTimeout(() => _doSearch(q.trim()), 300);
}

async function _doSearch(q) {
  const box = document.getElementById('search-results');
  box.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:10px">🔍 Đang tìm...</div>';
  try {
    const d = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (d.error) { box.innerHTML = `<div style="color:var(--red);padding:12px;font-size:10px">${d.error}</div>`; return; }
    if (!d.results?.length) {
      box.innerHTML = '<div style="text-align:center;padding:24px;color:var(--t3);font-size:10px">Không tìm thấy kết quả</div>';
      return;
    }
    box.innerHTML = d.results.map(res => `
      <div style="margin-bottom:8px;border:1px solid var(--b1);border-radius:6px;overflow:hidden">
        <div onclick="openFile({path:'${escH(res.path)}',name:'${escH(res.name)}',is_dir:false})"
          style="padding:6px 9px;background:var(--bg2);cursor:pointer;display:flex;align-items:center;gap:6px"
          onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
          <span style="font-size:11px">${extIcon[res.name.split('.').pop()]||'📄'}</span>
          <span style="font-family:var(--mono);font-size:9.5px;color:var(--acc);flex:1">${escH(res.path)}</span>
          <span style="font-size:8.5px;color:var(--t3)">${res.matches.length} dòng</span>
        </div>
        ${res.matches.map(m => `
          <div onclick="openFile({path:'${escH(res.path)}',name:'${escH(res.name)}',is_dir:false})"
            style="padding:4px 9px 4px 28px;cursor:pointer;border-top:1px solid var(--b1)"
            onmouseover="this.style.background='rgba(77,158,255,.05)'" onmouseout="this.style.background=''">
            <span style="font-family:var(--mono);font-size:8.5px;color:var(--t3);margin-right:8px">${m.line}</span>
            <span style="font-family:var(--mono);font-size:9px;color:var(--t2)">${escH(m.text)}</span>
          </div>`).join('')}
      </div>`).join('');
  } catch (e) {
    box.innerHTML = `<div style="color:var(--red);padding:12px;font-size:10px">Lỗi: ${e.message}</div>`;
  }
}

// ── Run ───────────────────────────────────────────────────────────
async function runFile() {
  if (!currentFile) { toast('Chưa mở file', 'err'); return; }
  if (document.getElementById('save-dot').classList.contains('show')) { try { await saveFile(); } catch { toast('Lỗi lưu file trước khi chạy', 'err'); return; } }
  const d = await apiFetch('/api/run', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: currentFile.path}),
  });
  if (d.type === 'html') { window.open('/' + currentFile.path, '_blank'); return; }
  switchTo('output');
  document.getElementById('out-log').innerHTML = '';
  addOutLine(`▶ ${currentFile.name}\n──────────────────────`, 'sys-l');
  const es = new EventSource(`/api/run/output/${d.job_id}`);
  es.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.line) addOutLine(msg.line, msg.line.toLowerCase().includes('error') ? 'err-l' : '');
    if (msg.done) { addOutLine(`\n── exit ${msg.rc} ──────────────`, msg.rc === 0 ? 'sys-l' : 'err-l'); es.close(); }
    if (msg.error) { addOutLine(msg.error, 'err-l'); es.close(); }
  };
  es.onerror = () => es.close();
}

function runInTermux() {
  if (!currentFile) { toast('Chưa mở file', 'err'); return; }
  const ext = currentFile.ext;
  const cmd = ext==='py' ? `python3 "${currentFile.path}"` :
              ext==='sh' ? `bash "${currentFile.path}"` :
              ext==='js' ? `node "${currentFile.path}"` : `"${currentFile.path}"`;
  const url = `intent:#Intent;action=android.intent.action.VIEW;component=com.termux/.app.TermuxActivity;S.com.termux.app.RUN_COMMAND_PATH=/data/data/com.termux/files/usr/bin/bash;S.com.termux.app.RUN_COMMAND_ARGUMENTS=${encodeURIComponent(cmd)};end`;
  try { window.location.href = url; switchTo('output'); addOutLine(`→ Termux: ${cmd}`, 'sys-l'); }
  catch { navigator.clipboard?.writeText(cmd).catch(()=>{}); toast('Copy lệnh: ' + cmd, 'warn'); }
}

function addOutLine(text, cls = '') {
  const log = document.getElementById('out-log');
  const s   = document.createElement('span');
  s.className = 'ol' + (cls ? ' ' + cls : '');
  s.textContent = text + '\n';
  log.appendChild(s);
  log.scrollTop = log.scrollHeight;
}
function clearOut() { document.getElementById('out-log').innerHTML = ''; }

// ── Chat history ──────────────────────────────────────────────────
function saveChatHistory() {
  try {
    const msgs = [];
    document.querySelectorAll('#msgs .msg').forEach(el => {
      const role = el.classList.contains('u') ? 'u' : 'a';
      const bub  = el.querySelector('.bub');
      if (!bub) return;
      // Lưu text thuần, không lưu innerHTML tránh XSS khi restore
      const clone = bub.cloneNode(true);
      clone.querySelectorAll('.write-card').forEach(wc => wc.remove());
      msgs.push({role, text: clone.textContent || ''});
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
  } catch {}
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const msgs = JSON.parse(raw);
    if (!msgs.length) return;
    const box = document.getElementById('msgs');
    msgs.forEach(m => {
      const id  = ++msgCounter;
      const div = document.createElement('div');
      div.className  = `msg ${m.role === 'u' ? 'u' : 'a'}`;
      div.dataset.mid = id;
      // Render từ text thuần → tránh XSS từ localStorage
      const safeContent = m.role === 'u' ? escH(m.text || m.html || '') : renderMd(m.text || m.html || '');
      div.innerHTML  = `<div class="mlbl">${m.role==='u'?'Bạn':'AI'}</div><div class="bub">${safeContent}</div>`;
      box.appendChild(div);
    });
    scrollMsgs();
    toast('Đã khôi phục cuộc trò chuyện', 'ok');
  } catch { localStorage.removeItem(HISTORY_KEY); }
}

function saveChatLocally(userMsg, aiMsg) {
  // Lưu vào localStorage sau mỗi turn — dùng key "text" (nhất quán với saveChatHistory)
  try {
    const raw  = localStorage.getItem(HISTORY_KEY) || '[]';
    const msgs = JSON.parse(raw);
    msgs.push({role:'u', text: userMsg});
    msgs.push({role:'a', text: aiMsg});
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
  } catch {}
}

function clearChatUI() {
  if (!confirm('Xóa toàn bộ lịch sử chat?')) return;
  document.getElementById('msgs').innerHTML = '';
  localStorage.removeItem(HISTORY_KEY);
  apiFetch('/api/chat/clear', {method:'POST'}).catch(()=>{});
  toast('Đã xóa chat', 'ok');
}

// ── Chat ──────────────────────────────────────────────────────────
function chatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

async function sendChat() {
  if (streaming) return;
  const input = document.getElementById('chat-inp');
  const msg   = input.value.trim();
  if (!msg) return;

  streaming = true;
  document.getElementById('send-btn').disabled = true;
  input.value = ''; input.style.height = 'auto';

  appendMsg('u', msg);
  const thinkId = appendThink();
  const body    = {message: msg};
  if (attachedFile) { body.attached_file = attachedFile; clearAttach(); }

  try {
    const headers = {'Content-Type': 'application/json'};
    const resp = await fetch('/api/chat', {method:'POST', headers, body: JSON.stringify(body)});

    if (!resp.ok) {
      removeMsg(thinkId);
      appendMsg('a', `⚠ Lỗi server: HTTP ${resp.status}`);
      return;
    }
    const reader = resp.body.getReader();
    const dec    = new TextDecoder();
    let buf = '', aiText = '', aiId = null, writtenFiles = [];

    removeMsg(thinkId);
    aiId = appendMsg('a', '');

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream: true});
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.token)  { aiText += d.token; updateMsgBub(aiId, renderMd(aiText)); scrollMsgs(); }
          if (d.done)   writtenFiles = d.written_files || [];
          if (d.error)  toast(d.error, 'err');
        } catch {}
      }
    }

    if (writtenFiles.length) {
      const bub = document.querySelector(`[data-mid="${aiId}"] .bub`);
      writtenFiles.forEach(f => bub?.appendChild(buildWriteCard(f)));
      await loadFiles();
      if (currentFile && writtenFiles.find(f => f.filename === currentFile.name)) {
        const d = await apiFetch(`/api/files/read?path=${encodeURIComponent(currentFile.path)}`);
        if (!d.error) {
          document.getElementById('code-content').textContent = d.content;
          document.getElementById('line-nums').innerHTML = d.content.split('\n').map((_,i) => `<div class="ln">${i+1}</div>`).join('');
          document.getElementById('save-dot').classList.remove('show');
          document.getElementById('save-dot2')?.classList.remove('show');
        }
      }
    }

    saveChatLocally(msg, aiText);
  } catch {
    removeMsg(thinkId);
    appendMsg('a', '⚠ Lỗi kết nối. Thử lại sau.');
  } finally {
    streaming = false;
    document.getElementById('send-btn').disabled = false;
    saveChatHistory();
  }
}

function buildWriteCard(f) {
  const div  = document.createElement('div');
  div.className = 'write-card';
  const badge = f.is_new
    ? '<div class="wc-badge new">FILE MỚI</div>'
    : '<div class="wc-badge upd">CẬP NHẬT</div>';
  const code  = (f.content || '').split('\n').slice(0, 8)
    .map(l => `<span class="wc-add">+${escH(l)}</span>`).join('');
  div.innerHTML = `
    <div class="wc-hdr">
      <div class="wc-icon"><svg viewBox="0 0 24 24"><use href="#ic-file-check" stroke="var(--grn)" stroke-width="2"/></svg></div>
      <div class="wc-info">
        <div class="wc-title">${escH(f.filename)}</div>
        <div class="wc-path">${escH(f.filename)}</div>
      </div>${badge}
    </div>
    <div class="wc-code">${code}</div>
    <div class="wc-footer">
      <div class="wc-status"><div class="wc-dot"></div><span class="wc-status-txt">Đã ghi file</span></div>
      <span class="wc-lines">+${f.lines||0} dòng</span>
    </div>`;
  return div;
}

// ── Attach ────────────────────────────────────────────────────────
function toggleAttachMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('attach-menu');
  menu.classList.toggle('show');
  if (menu.classList.contains('show'))
    setTimeout(() => document.addEventListener('click', closeAttachMenu, {once:true}), 0);
}
function closeAttachMenu() { document.getElementById('attach-menu').classList.remove('show'); }

function attachFromProject() {
  closeAttachMenu();
  if (!currentFile) { toast('Mở file trong Editor trước', 'err'); return; }
  const content = document.getElementById('code-content').textContent;
  attachedFile  = {name: currentFile.name, content: content.slice(0, 4000)};
  setTxt('attach-name', currentFile.name);
  document.getElementById('attach-chip').classList.add('show');
  toast('Đính kèm: ' + currentFile.name, 'ok');
}

function attachFromPhone() {
  closeAttachMenu();
  document.getElementById('file-picker').click();
}

function handleFilePick(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    attachedFile = {name: file.name, content: e.target.result.slice(0, 4000)};
    setTxt('attach-name', file.name);
    document.getElementById('attach-chip').classList.add('show');
    toast('Đính kèm: ' + file.name, 'ok');
  };
  reader.readAsText(file);
  input.value = '';
}

function attachCurrent() { attachFromProject(); }
function clearAttach() {
  attachedFile = null;
  document.getElementById('attach-chip').classList.remove('show');
}

// ── Msg helpers ───────────────────────────────────────────────────
function appendMsg(role, text) {
  const id  = ++msgCounter;
  const box = document.getElementById('msgs');
  const div = document.createElement('div');
  div.className   = `msg ${role === 'u' ? 'u' : 'a'}`;
  div.dataset.mid = id;
  div.innerHTML   = `<div class="mlbl">${role==='u'?'Bạn':'AI'}</div><div class="bub">${role==='u'?escH(text):renderMd(text)}</div>`;
  box.appendChild(div); scrollMsgs(); return id;
}
function appendThink() {
  const id  = ++msgCounter;
  const box = document.getElementById('msgs');
  const div = document.createElement('div');
  div.className   = 'msg a'; div.dataset.mid = id;
  div.innerHTML   = `<div class="mlbl">AI</div><div class="bub"><div class="think"><span></span><span></span><span></span></div></div>`;
  box.appendChild(div); scrollMsgs(); return id;
}
function updateMsgBub(id, html) {
  const el = document.querySelector(`[data-mid="${id}"] .bub`);
  if (el) el.innerHTML = html;
}
function removeMsg(id) { document.querySelector(`[data-mid="${id}"]`)?.remove(); }
function scrollMsgs()  { const b = document.getElementById('msgs'); b.scrollTop = b.scrollHeight; }

// ── Markdown renderer (cải thiện) ────────────────────────────────
function renderMd(text) {
  // Xử lý code blocks TRƯỚC escH để tránh double-encode &lt; &gt;
  // Dùng mảng để lưu các đoạn HTML đã render, thay bằng token SAFE
  const parts = [];
  const SAFE  = '\x00SAFE\x00';   // null-delimited marker, không xuất hiện trong code thông thường

  // Fenced code blocks ```lang\n...\n```
  let t = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    parts.push(`<pre><code class="lang-${lang||'text'}">${escH(code)}</code></pre>`);
    return SAFE + (parts.length - 1) + SAFE;
  });

  // Inline code `...`
  t = t.replace(/`([^`\n]+)`/g, (_, code) => {
    parts.push(`<code>${escH(code)}</code>`);
    return SAFE + (parts.length - 1) + SAFE;
  });

  // escH phần text thường
  let h = escH(t);

  // Markdown formatting
  h = h.replace(/^### (.+)$/gm, '<strong style="color:var(--pur)">$1</strong>');
  h = h.replace(/^## (.+)$/gm,  '<strong style="font-size:1.05em;color:var(--acc)">$1</strong>');
  h = h.replace(/^# (.+)$/gm,   '<strong style="font-size:1.1em;color:var(--t1)">$1</strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g,     '<em>$1</em>');
  h = h.replace(/^- (.+)$/gm,    '&nbsp;•&nbsp;$1');
  let _li = 0; h = h.replace(/^\d+\. (.+)$/gm, (_, txt) => `&nbsp;${++_li}.&nbsp;${txt}`);
  h = h.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--b1);margin:6px 0">');
  h = h.replace(/\n/g, '<br>');

  // Khôi phục code blocks
  // escH không encode � nên token vẫn nguyên
  h = h.replace(/\x00SAFE(\d+)\x00/g, (_, i) => parts[+i] || '');

  return h;
}

function escH(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Navigation ────────────────────────────────────────────────────
function switchTo(name) {
  ['chat','files','output'].forEach(n => {
    document.getElementById('p-'+n)?.classList.remove('on');
    document.getElementById('bn-'+n)?.classList.remove('on');
    document.getElementById('pc-ni-'+n)?.classList.remove('on');
  });
  document.getElementById('p-'+name)?.classList.add('on');
  document.getElementById('bn-'+name)?.classList.add('on');
  document.getElementById('pc-ni-'+name)?.classList.add('on');
  closeSet();
}

function feSwitch(name) {
  ['files','editor'].forEach(n => {
    document.getElementById('fe-'+n)?.classList.remove('on');
    document.getElementById('fe-tab-'+n)?.classList.remove('on');
  });
  document.getElementById('fe-'+name)?.classList.add('on');
  document.getElementById('fe-tab-'+name)?.classList.add('on');
}

// ── Settings ─────────────────────────────────────────────────────
function toggleSet() {
  const s = document.getElementById('setp');
  const o = document.getElementById('ov');
  if (s.style.display === 'none') {
    s.style.display = 'flex'; s.style.flexDirection = 'column';
    o.classList.add('on');
    document.getElementById('bn-settings')?.classList.add('on');
    if (!document.querySelector('.mc')) initModelCards?.();
    if (!document.getElementById('theme-toggle-btn')) addThemeToggleUI?.();
    // Sync trạng thái "Đã cài" mỗi lần mở Settings
    setTimeout(() => window.syncInstalledModels?.(), 0);
  } else closeSet();
}
function closeSet() {
  document.getElementById('setp').style.display = 'none';
  document.getElementById('ov').classList.remove('on');
  document.getElementById('bn-settings')?.classList.remove('on');
}

async function selModel(el, name) {
  document.querySelectorAll('.mc').forEach(m => m.classList.remove('on'));
  el.classList.add('on');
  const tag = document.getElementById('hdr-model');
  if (tag) {
    const node = tag.lastChild;
    if (node?.nodeType === 3) node.textContent = ' ' + name.split(':')[0];
    else tag.appendChild(document.createTextNode(' ' + name.split(':')[0]));
  }
  await apiFetch('/api/models/set', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({model:name})});
  toast('Model → ' + name, 'ok');
}

async function pullModel(btn, name) {
  if (btn.classList.contains('pulling') || btn.classList.contains('done')) return;
  btn.classList.add('pulling');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><use href="#ic-download" stroke="currentColor" stroke-width="2"/></svg> Đang tải…`;
  toast('Đang pull: ' + name, 'warn');
  try {
    const r = await fetch('/api/models/pull', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({model:name})});
    if (r.ok) {
      btn.classList.replace('pulling','done');
      btn.innerHTML = `<svg viewBox="0 0 24 24"><use href="#ic-check" stroke="currentColor" stroke-width="2.5"/></svg> Đã có`;
      toast('Pull xong: ' + name, 'ok');
    } else { throw new Error(); }
  } catch {
    btn.classList.remove('pulling');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><use href="#ic-download" stroke="currentColor" stroke-width="2"/></svg> Tải`;
    toast('Lỗi pull model', 'err');
  }
}

function applySet() { closeSet(); toast('Đã lưu cài đặt', 'ok'); }

// ── Threads slider ────────────────────────────────────────────────
function initThreadSlider() {
  const steps = [2, 4, 6, 8];
  const track = document.getElementById('ts-track');
  const fill  = document.getElementById('ts-fill');
  const thumb = document.getElementById('ts-thumb');
  if (!track) return;
  let drag = false;

  function snap(cx) {
    const r   = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    const idx = Math.round(pct * 3);
    const sp  = idx / 3;
    fill.style.width = (sp * 100) + '%';
    thumb.style.left = (sp * 100) + '%';
    const val = steps[idx];
    setTxt('ts-val', val + ' threads');
    apiFetch('/api/config', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({threads:val})}).catch(()=>{});
  }

  track.addEventListener('mousedown',  e => { drag=true; snap(e.clientX); e.preventDefault(); });
  track.addEventListener('touchstart', e => { drag=true; snap(e.touches[0].clientX); e.preventDefault(); }, {passive:false});
  document.addEventListener('mousemove',  e => { if (drag) snap(e.clientX); });
  document.addEventListener('touchmove',  e => { if (drag) snap(e.touches[0].clientX); }, {passive:false});
  document.addEventListener('mouseup',    () => drag = false);
  document.addEventListener('touchend',   () => drag = false);
}

// ── Toast ─────────────────────────────────────────────────────────
let _tt;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast on ' + (type || '');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = 'toast', 2800);
}
// alias — một số chỗ gọi showToast
const showToast = toast;

function autoH(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }

// ── Keyboard shortcuts ───────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveFile();
  }
});

// ── Boot ──────────────────────────────────────────────────────────
init();
