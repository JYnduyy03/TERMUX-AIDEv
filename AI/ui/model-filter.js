/* ═══════════════════════════════════════════════════════════════
   MODEL FILTER MODULE — model-filter.js  AIDEv1.0.0
   Quản lý tìm kiếm, lọc, hiển thị models
   ═══════════════════════════════════════════════════════════════ */

// ── Model Database ─────────────────────────────────────────────
const MODELS_DB = [
  {
    id: 'llama3.2:3b',
    displayName: 'Llama 3.2',
    desc: 'Nhẹ nhất · task đơn giản',
    size: '~2GB', tag: 'lite',
    tags: ['light', 'fast', 'simple', 'llama'],
  },
  {
    id: 'qwen2.5:7b',
    displayName: 'Qwen 2.5',
    desc: 'Cân bằng · tiếng Việt + code',
    size: '~4.4GB', tag: 'mid',
    tags: ['balanced', 'vietnamese', 'code', 'qwen', 'popular'],
  },
  {
    id: 'deepseek-coder:6.7b',
    displayName: 'DeepSeek Coder',
    desc: 'Chuyên code Python/HTML',
    size: '~4.1GB', tag: 'pro',
    tags: ['code', 'programming', 'python', 'deepseek'],
  },
  {
    id: 'codellama:13b',
    displayName: 'Code Llama',
    desc: 'Mạnh nhất · cần RAM nhiều',
    size: '~8GB', tag: 'max',
    tags: ['code', 'powerful', 'llama', 'large'],
  },
];

// ── State ──────────────────────────────────────────────────────
let _installedModels = [];   // list tên model đã cài từ Ollama

// ── Sync trạng thái đã cài từ API ─────────────────────────────
async function syncInstalledModels() {
  try {
    const d = await apiFetch('/api/models');
    _installedModels = d.models || [];
    _updateAllButtons();
  } catch {
    // Offline — giữ nguyên
  }
}

// Cập nhật tất cả nút "Tải" / "Đã cài" dựa trên _installedModels
function _updateAllButtons() {
  document.querySelectorAll('.mc').forEach(card => {
    const id  = card.dataset.modelId;
    if (!id) return;
    const btn = card.querySelector('.mc-dl');
    if (!btn) return;

    const installed = _installedModels.some(m =>
      m === id || m.startsWith(id.split(':')[0] + ':')
    );

    if (installed) {
      _setInstalled(btn, id);
    } else {
      _setNotInstalled(btn, id);
    }
  });
}

function _setInstalled(btn, modelId) {
  btn.className = 'mc-dl done';
  btn.disabled  = false;
  btn.title     = 'Đã cài — click để set làm model active';
  btn.innerHTML = `
    <svg><use href="#ic-check" stroke="currentColor" stroke-width="2.5"/></svg>
    Đã cài
  `;
  // Đổi onclick: set làm model active thay vì pull
  btn.onclick = (e) => {
    e.stopPropagation();
    const card = btn.closest('.mc');
    if (card) selModel(card, modelId);
    toast('Model active → ' + modelId.split(':')[0], 'ok');
  };
}

function _setNotInstalled(btn, modelId) {
  btn.className = 'mc-dl';
  btn.disabled  = false;
  btn.title     = 'Tải model về';
  btn.innerHTML = `
    <svg><use href="#ic-download" stroke="currentColor" stroke-width="2"/></svg>
    Tải
  `;
  btn.onclick = (e) => {
    e.stopPropagation();
    pullModel(btn, modelId);
  };
}

// ── Filter ─────────────────────────────────────────────────────
function filterModels(query) {
  const cards = document.querySelectorAll('.mc');
  const q     = query.toLowerCase().trim();

  // Xóa "không tìm thấy" cũ
  document.querySelectorAll('.model-no-found').forEach(el => el.remove());

  if (!q) {
    cards.forEach(c => { c.style.display = ''; c.classList.remove('hidden'); });
    _updateCount(cards.length);
    return;
  }

  let n = 0;
  cards.forEach(card => {
    const id  = card.dataset.modelId || '';
    const obj = MODELS_DB.find(m => m.id === id);
    if (!obj) return;

    const text = [obj.id, obj.displayName, obj.desc, obj.tags.join(' ')].join(' ').toLowerCase();
    const show = text.includes(q);
    card.style.display = show ? '' : 'none';
    card.classList.toggle('hidden', !show);
    if (show) n++;
  });

  _updateCount(n);

  if (n === 0) {
    const box = document.getElementById('model-cards');
    const div = document.createElement('div');
    div.className = 'model-no-found';
    div.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3);font-size:11px">
      Không tìm thấy "<b>${query}</b>" — thử: qwen, code, llama</div>`;
    box?.appendChild(div);
  }
}

function _updateCount(n) {
  const el = document.querySelector('.model-search-count');
  if (!el) return;
  el.textContent  = `${n}/${MODELS_DB.length}`;
  el.style.display = n < MODELS_DB.length ? 'block' : 'none';
}

// ── Init Model Cards ───────────────────────────────────────────
function initModelCards() {
  const box = document.getElementById('model-cards');
  if (!box) return;

  const currentModel = window.currentModel || 'qwen2.5:7b';
  box.innerHTML = '';

  MODELS_DB.forEach(m => {
    const isOn = m.id === currentModel;
    const div  = document.createElement('div');
    div.className      = `mc${isOn ? ' on' : ''}`;
    div.dataset.modelId = m.id;
    div.onclick        = () => selModel(div, m.id);

    div.innerHTML = `
      <div class="mc-radio"></div>
      <div class="mc-info">
        <div class="mc-name">${m.displayName}</div>
        <div class="mc-desc">${m.desc}</div>
      </div>
      <div class="mc-right">
        <div class="mc-tag ${m.tag}">${m.size}</div>
        <button class="mc-dl" title="Tải model về"
                onclick="event.stopPropagation();pullModel(this,'${m.id}')">
          <svg><use href="#ic-download" stroke="currentColor" stroke-width="2"/></svg>Tải
        </button>
      </div>
    `;
    box.appendChild(div);
  });

  // Sync ngay sau khi render — cập nhật nút "Đã cài"
  syncInstalledModels();
}

// ── Override pullModel để sync lại sau khi pull xong ──────────
const _origPullModel = window.pullModel;
window.pullModel = async function(btn, name) {
  await _origPullModel?.call(this, btn, name);
  // Sau khi pull xong, sync lại trạng thái các nút
  setTimeout(syncInstalledModels, 500);
};

// ── Exports ───────────────────────────────────────────────────
window.initModelCards       = initModelCards;
window.filterModels         = filterModels;
window.syncInstalledModels  = syncInstalledModels;
window.clearModelSearch     = () => {
  const el = document.getElementById('model-search');
  if (el) { el.value = ''; filterModels(''); }
};
