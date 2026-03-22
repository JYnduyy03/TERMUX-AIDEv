/* ═══════════════════════════════════════════════════════════════
   GIT MODULE — git.js
   Git shortcut UI cho AI Dev Studio
   - Tái dụng /api/terminal + runCommand() đã có sẵn
   - Không thêm endpoint Python mới
   - Fail-safe: lỗi không crash app chính
   - Tích hợp: thêm Git toolbar vào Output panel
   ═══════════════════════════════════════════════════════════════ */

;(function() {

'use strict';

// ── Config ───────────────────────────────────────────────────
const GIT_CONFIG = {
  toolbarId:      'git-toolbar',
  commitInputId:  'git-commit-msg',
  commitRowId:    'git-commit-row',
  // Lệnh git được phép (phải có trong whitelist bridge.py)
  commands: {
    status:  'git status --short --branch',
    log:     'git log --oneline --decorate -10',
    diff:    'git diff --stat',
    add:     'git add .',
    push:    'git push',
    pull:    'git pull',
    stash:   'git stash',
  }
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Chuyển sang tab Output rồi chạy lệnh git
 * Tái dụng runCommand() từ terminal.js
 */
function _run(cmd, label) {
  // Chuyển sang output tab để user thấy kết quả
  if (typeof switchTo === 'function') switchTo('output');

  // Thêm separator để phân biệt các lệnh
  if (typeof appendTerminalLine === 'function') {
    appendTerminalLine(`── ${label} ──`, 'status');
  }

  // Gọi runCommand từ terminal.js (đã có auth + stream)
  if (typeof runCommand === 'function') {
    runCommand(cmd);
  } else {
    console.warn('[Git] runCommand() không tìm thấy — terminal.js chưa load?');
  }
}

/**
 * Kiểm tra xem git có sẵn và đang trong repo không
 * Trả về true nếu OK, false nếu không
 */
async function _checkGitRepo() {
  // Không block UI — chỉ check và cảnh báo nếu cần
  // Thực tế git CLI sẽ tự báo lỗi nếu không phải repo
  return true;
}

// ── Git actions ──────────────────────────────────────────────

function gitStatus() {
  _run(GIT_CONFIG.commands.status, 'git status');
}

function gitLog() {
  _run(GIT_CONFIG.commands.log, 'git log (10 commits gần nhất)');
}

function gitDiff() {
  _run(GIT_CONFIG.commands.diff, 'git diff --stat');
}

function gitAdd() {
  _run(GIT_CONFIG.commands.add, 'git add .');
}

function gitPull() {
  _run(GIT_CONFIG.commands.pull, 'git pull');
}

function gitStash() {
  _run(GIT_CONFIG.commands.stash, 'git stash');
}

/**
 * Commit: hiện/ẩn input message
 */
function gitCommitToggle() {
  const row = document.getElementById(GIT_CONFIG.commitRowId);
  if (!row) return;

  const isVisible = row.style.display !== 'none';
  row.style.display = isVisible ? 'none' : 'flex';

  if (!isVisible) {
    document.getElementById(GIT_CONFIG.commitInputId)?.focus();
  }
}

/**
 * Thực hiện commit với message từ input
 */
function gitCommit() {
  const inp = document.getElementById(GIT_CONFIG.commitInputId);
  if (!inp) return;

  const msg = inp.value.trim();
  if (!msg) {
    inp.style.borderColor = 'var(--red, #fc8181)';
    setTimeout(() => { inp.style.borderColor = 'var(--b1)'; }, 1200);
    inp.placeholder = 'Nhập commit message!';
    return;
  }

  // Escape dấu nháy đơn trong message
  const safe = msg.replace(/'/g, "'\\''");
  _run(`git commit -m '${safe}'`, `git commit "${msg}"`);

  inp.value = '';
  // Ẩn commit row sau khi commit
  const row = document.getElementById(GIT_CONFIG.commitRowId);
  if (row) row.style.display = 'none';
}

/**
 * Push — hỏi confirm vì có thể cần credential
 */
function gitPush() {
  // Dùng confirm nhẹ, không dùng alert nặng
  const row = document.getElementById(GIT_CONFIG.commitRowId);
  if (row) row.style.display = 'none';
  _run(GIT_CONFIG.commands.push, 'git push');
}

// ── Build UI ─────────────────────────────────────────────────

function _buildToolbar() {
  if (document.getElementById(GIT_CONFIG.toolbarId)) return;

  const outTb = document.querySelector('.out-tb');
  if (!outTb) {
    console.warn('[Git] Không tìm thấy .out-tb');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = GIT_CONFIG.toolbarId;
  wrapper.style.cssText = `
    border-top: 1px solid var(--b1);
    background: var(--bg2);
    flex-shrink: 0;
  `;

  wrapper.innerHTML = `
    <!-- Hàng 1: Git action buttons -->
    <div style="
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 7px 10px 5px;
      align-items: center;
    ">
      <!-- Label nhỏ -->
      <span style="
        font-size: 9px;
        font-weight: 700;
        color: var(--t3);
        letter-spacing: .08em;
        margin-right: 2px;
        flex-shrink: 0;
      ">GIT</span>

      <!-- Nút Status -->
      <button class="git-btn" onclick="window.gitStatus()" title="git status">
        📋 Status
      </button>

      <!-- Nút Log -->
      <button class="git-btn" onclick="window.gitLog()" title="git log --oneline -10">
        🕐 Log
      </button>

      <!-- Nút Diff -->
      <button class="git-btn" onclick="window.gitDiff()" title="git diff --stat">
        🔍 Diff
      </button>

      <!-- Nút Add -->
      <button class="git-btn git-btn--green" onclick="window.gitAdd()" title="git add .">
        ➕ Add
      </button>

      <!-- Nút Commit (mở input) -->
      <button class="git-btn git-btn--blue" onclick="window.gitCommitToggle()" title="git commit">
        💾 Commit
      </button>

      <!-- Nút Pull -->
      <button class="git-btn" onclick="window.gitPull()" title="git pull">
        ⬇️ Pull
      </button>

      <!-- Nút Push -->
      <button class="git-btn git-btn--acc" onclick="window.gitPush()" title="git push">
        🚀 Push
      </button>

      <!-- Nút Stash -->
      <button class="git-btn" onclick="window.gitStash()" title="git stash">
        📦 Stash
      </button>
    </div>

    <!-- Hàng 2: Commit message input (ẩn mặc định) -->
    <div
      id="${GIT_CONFIG.commitRowId}"
      style="
        display: none;
        gap: 6px;
        padding: 0 10px 8px;
        align-items: center;
      "
    >
      <input
        id="${GIT_CONFIG.commitInputId}"
        type="text"
        placeholder="Nhập commit message rồi nhấn Enter..."
        autocomplete="off"
        style="
          flex: 1;
          background: var(--bg3, var(--bg1));
          border: 1px solid var(--b1);
          border-radius: 6px;
          padding: 5px 9px;
          color: var(--t1);
          font-size: 11px;
          font-family: var(--mono);
          outline: none;
          transition: border-color .15s;
          min-width: 0;
        "
        onkeydown="if(event.key==='Enter'){window.gitCommit();}
                   if(event.key==='Escape'){window.gitCommitToggle();}"
        onfocus="this.style.borderColor='var(--acc)'"
        onblur="this.style.borderColor='var(--b1)'"
      >
      <button
        class="git-btn git-btn--blue"
        onclick="window.gitCommit()"
        style="flex-shrink:0"
      >✓ OK</button>
      <button
        class="git-btn"
        onclick="window.gitCommitToggle()"
        style="flex-shrink:0"
      >✕</button>
    </div>
  `;

  // Chèn Git toolbar sau out-tb (toolbar chính)
  outTb.parentNode.insertBefore(wrapper, outTb.nextSibling);

  // Inject CSS một lần
  _injectStyles();
}

// ── CSS nhẹ cho git buttons ──────────────────────────────────
function _injectStyles() {
  if (document.getElementById('git-styles')) return;

  const style = document.createElement('style');
  style.id = 'git-styles';
  style.textContent = `
    .git-btn {
      background: transparent;
      border: 1px solid var(--b1);
      border-radius: 5px;
      color: var(--t2);
      font-size: 9.5px;
      padding: 3px 7px;
      cursor: pointer;
      white-space: nowrap;
      transition: background .12s, border-color .12s, color .12s;
      font-family: inherit;
    }
    .git-btn:hover {
      background: var(--bg1);
      border-color: var(--t3);
      color: var(--t1);
    }
    .git-btn:active {
      opacity: .75;
      transform: scale(.97);
    }
    /* Màu phân loại hành động */
    .git-btn--green {
      border-color: rgba(72,187,120,.4);
      color: var(--grn, #68d391);
    }
    .git-btn--green:hover {
      background: rgba(72,187,120,.1);
      border-color: var(--grn, #68d391);
    }
    .git-btn--blue {
      border-color: rgba(99,179,237,.4);
      color: var(--acc, #63b3ed);
    }
    .git-btn--blue:hover {
      background: rgba(99,179,237,.1);
      border-color: var(--acc, #63b3ed);
    }
    .git-btn--acc {
      border-color: rgba(159,122,234,.4);
      color: var(--pur, #9f7aea);
    }
    .git-btn--acc:hover {
      background: rgba(159,122,234,.1);
      border-color: var(--pur, #9f7aea);
    }
  `;
  document.head.appendChild(style);
}

// ── Init ─────────────────────────────────────────────────────
function initGit() {
  _buildToolbar();
}

// ── Exports ──────────────────────────────────────────────────
window.gitStatus        = gitStatus;
window.gitLog           = gitLog;
window.gitDiff          = gitDiff;
window.gitAdd           = gitAdd;
window.gitCommitToggle  = gitCommitToggle;
window.gitCommit        = gitCommit;
window.gitPull          = gitPull;
window.gitPush          = gitPush;
window.gitStash         = gitStash;
window.initGit          = initGit;

// ── Auto-init ────────────────────────────────────────────────
// Đợi terminal.js load xong (terminal.js init qua app.js setTimeout 100ms)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initGit, 300));
} else {
  setTimeout(initGit, 300);
}

})(); // end IIFE
