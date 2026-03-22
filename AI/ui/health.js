/* ═══════════════════════════════════════════════════════════════
   HEALTH MONITOR — health.js
   Theo dõi trạng thái bridge.py, cảnh báo khi offline
   - Ping /api/status mỗi 6 giây
   - Hiện banner khi offline 2 lần liên tiếp (tránh false positive)
   - Tự ẩn khi kết nối trở lại
   - Không block UI, không throw error
   ═══════════════════════════════════════════════════════════════ */

;(function() {
'use strict';

// ── Config ───────────────────────────────────────────────────
const HC = {
  endpoint:      '/api/status',
  intervalMs:    6000,     // ping mỗi 6s
  timeout:       4000,     // timeout mỗi ping
  failThreshold: 2,        // cần fail liên tiếp mới báo offline
  bannerId:      'hc-banner',
  dotId:         'st-dot', // dot đỏ/xanh trong header (đã có trong app)
};

// ── State ────────────────────────────────────────────────────
let _failCount    = 0;
let _isOffline    = false;
let _intervalId   = null;
let _retryCount   = 0;

// ── Ping ─────────────────────────────────────────────────────
async function _ping() {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), HC.timeout);

    const resp = await fetch(HC.endpoint, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      _onOnline();
    } else {
      _onFail();
    }
  } catch {
    _onFail();
  }
}

// ── Xử lý khi kết nối OK ─────────────────────────────────────
function _onOnline() {
  const wasOffline = _isOffline;
  _failCount  = 0;
  _isOffline  = false;
  _retryCount = 0;

  _hideBanner();
  _setDot('online');

  if (wasOffline) {
    // Báo user đã kết nối lại
    if (typeof toast === 'function') {
      toast('✅ Bridge đã kết nối lại', 'ok');
    }
    // Refresh status app
    if (typeof loadStatus === 'function') loadStatus();
  }
}

// ── Xử lý khi fail ───────────────────────────────────────────
function _onFail() {
  _failCount++;

  if (_failCount >= HC.failThreshold) {
    _isOffline = true;
    _setDot('offline');
    _showBanner();
  }
}

// ── Dot indicator trong header ───────────────────────────────
function _setDot(state) {
  const dot = document.getElementById(HC.dotId);
  if (!dot) return;

  if (state === 'online') {
    dot.style.background = '';  // về màu mặc định (green từ CSS)
    dot.title = 'Bridge online';
  } else {
    dot.style.background = 'var(--red, #fc8181)';
    dot.title = 'Bridge offline';
  }
}

// ── Banner offline ────────────────────────────────────────────
function _showBanner() {
  if (document.getElementById(HC.bannerId)) {
    // Đã hiện, chỉ update retry count
    _updateBannerText();
    return;
  }

  const banner = document.createElement('div');
  banner.id = HC.bannerId;
  banner.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 99999;
    background: linear-gradient(90deg, #c53030, #9b2c2c);
    color: #fff;
    font-size: 11px;
    font-family: inherit;
    padding: 7px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,.4);
    animation: hc-slide-in .2s ease;
  `;

  banner.innerHTML = `
    <style>
      @keyframes hc-slide-in {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes hc-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    </style>

    <!-- Icon warning -->
    <span style="font-size:14px; flex-shrink:0">⚠️</span>

    <!-- Text -->
    <span id="hc-text" style="flex:1">
      Bridge offline — Đang thử kết nối lại...
    </span>

    <!-- Spinner -->
    <span id="hc-spin" style="
      display: inline-block;
      font-size: 12px;
      animation: hc-spin 1s linear infinite;
      flex-shrink: 0;
    ">↻</span>

    <!-- Manual retry -->
    <button
      onclick="window._hcRetry()"
      title="Thử kết nối ngay"
      style="
        background: rgba(255,255,255,.2);
        border: 1px solid rgba(255,255,255,.4);
        border-radius: 4px;
        color: #fff;
        font-size: 10px;
        padding: 2px 8px;
        cursor: pointer;
        flex-shrink: 0;
      "
    >Retry</button>

    <!-- Hướng dẫn nhanh -->
    <button
      onclick="window._hcShowHelp()"
      title="Cách khởi động lại bridge"
      style="
        background: rgba(255,255,255,.15);
        border: 1px solid rgba(255,255,255,.3);
        border-radius: 4px;
        color: #fff;
        font-size: 10px;
        padding: 2px 8px;
        cursor: pointer;
        flex-shrink: 0;
      "
    >?</button>
  `;

  document.body.prepend(banner);

  // Đẩy nội dung xuống để không bị banner che
  _pushContent(true);
}

function _hideBanner() {
  const banner = document.getElementById(HC.bannerId);
  if (banner) {
    banner.style.animation = 'none';
    banner.style.opacity   = '0';
    banner.style.transform = 'translateY(-100%)';
    banner.style.transition = 'opacity .2s, transform .2s';
    setTimeout(() => banner.remove(), 200);
  }
  _pushContent(false);
}

function _updateBannerText() {
  _retryCount++;
  const el = document.getElementById('hc-text');
  if (el) {
    el.textContent = `Bridge offline — Thử kết nối lại lần ${_retryCount}...`;
  }
}

// Đẩy app xuống để tránh banner che nội dung
function _pushContent(on) {
  const app = document.getElementById('app');
  if (app) app.style.paddingTop = on ? '34px' : '';
}

// ── Manual retry ─────────────────────────────────────────────
function _retry() {
  // Reset fail count để ping ngay
  _failCount = 0;
  _ping();
}

// ── Help popup ───────────────────────────────────────────────
function _showHelp() {
  const existing = document.getElementById('hc-help');
  if (existing) { existing.remove(); return; }

  const help = document.createElement('div');
  help.id = 'hc-help';
  help.style.cssText = `
    position: fixed;
    top: 45px; left: 50%;
    transform: translateX(-50%);
    background: var(--bg2);
    border: 1px solid var(--b1);
    border-radius: 8px;
    padding: 14px 16px;
    z-index: 99998;
    min-width: 260px;
    max-width: 90vw;
    box-shadow: 0 4px 16px rgba(0,0,0,.5);
    font-size: 11px;
  `;

  help.innerHTML = `
    <div style="font-weight:700; color:var(--t1); margin-bottom:10px; font-size:12px">
      🔧 Khởi động lại Bridge
    </div>

    <div style="color:var(--t3); margin-bottom:6px; font-size:10px">
      Chạy trong Termux:
    </div>

    <div style="
      background: var(--bg1);
      border: 1px solid var(--b1);
      border-radius: 5px;
      padding: 8px 10px;
      font-family: var(--mono);
      font-size: 10px;
      color: var(--grn, #68d391);
      white-space: pre;
      overflow-x: auto;
    ">pkill -f bridge.py
python3 ~/.aidev/bridge.py &amp;</div>

    <div style="
      margin-top: 8px;
      font-size: 9px;
      color: var(--t3);
    ">Sau đó nhấn <strong style="color:var(--t2)">Retry</strong> ở banner trên.</div>

    <button
      onclick="this.parentNode.remove()"
      style="
        display: block; margin-top: 10px; margin-left: auto;
        background: var(--bg3,var(--bg1));
        border: 1px solid var(--b1);
        border-radius: 4px;
        color: var(--t2);
        font-size: 10px;
        padding: 3px 10px;
        cursor: pointer;
      "
    >Đóng</button>
  `;

  document.body.appendChild(help);

  // Tự đóng sau 12s
  setTimeout(() => help.remove(), 12000);
}

// ── Init ─────────────────────────────────────────────────────
function initHealth() {
  // Ping ngay lập tức
  _ping();
  // Sau đó định kỳ
  _intervalId = setInterval(_ping, HC.intervalMs);
}

// ── Stop (nếu cần) ───────────────────────────────────────────
function stopHealth() {
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
}

// ── Exports ──────────────────────────────────────────────────
window._hcRetry    = _retry;
window._hcShowHelp = _showHelp;
window.initHealth  = initHealth;
window.stopHealth  = stopHealth;

// ── Auto-init ────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initHealth, 500));
} else {
  setTimeout(initHealth, 500);
}

})();
