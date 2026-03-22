/* ═══════════════════════════════════════════════════════════════
   THEME MODULE — ui/modules/theme.js
   Dark/Light mode toggle + persistence
   ═══════════════════════════════════════════════════════════════ */

// ── Configuration ──────────────────────────────────────────
const THEME_CONFIG = {
  storageKey: 'aidev_theme',
  defaultTheme: 'dark',
  themes: {
    dark: {
      name: 'Dark',
      icon: '🌙',
      cssVars: {
        '--bg': '#0e1117',
        '--bg2': '#141820',
        '--bg3': '#1c2230',
        '--bg4': '#1a2235',
        '--b1': '#232d40',
        '--b2': '#2a3650',
        '--t1': '#d4dce8',
        '--t2': '#637590',
        '--t3': '#3a4a60',
      }
    },
    light: {
      name: 'Light',
      icon: '☀️',
      cssVars: {
        '--bg': '#f5f7fa',
        '--bg2': '#eef0f5',
        '--bg3': '#e8ecf1',
        '--bg4': '#dfe5ed',
        '--b1': '#d0d8e3',
        '--b2': '#c5cdd9',
        '--t1': '#1a202c',
        '--t2': '#4a5568',
        '--t3': '#9da5b8',
      }
    }
  }
};

// ── State ──────────────────────────────────────────────────
let currentTheme = THEME_CONFIG.defaultTheme;

// ── Initialize Theme ───────────────────────────────────────
function initTheme() {
  // Load from localStorage
  const saved = localStorage.getItem(THEME_CONFIG.storageKey);
  if (saved && THEME_CONFIG.themes[saved]) {
    currentTheme = saved;
  } else {
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = prefersDark ? 'dark' : 'light';
  }
  
  applyTheme(currentTheme);
}

// ── Apply Theme ────────────────────────────────────────────
function applyTheme(themeName) {
  const theme = THEME_CONFIG.themes[themeName];
  if (!theme) return;
  
  // Update CSS variables
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Update HTML attribute
  document.documentElement.setAttribute('data-theme', themeName);
  
  // Save preference
  localStorage.setItem(THEME_CONFIG.storageKey, themeName);
  currentTheme = themeName;
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('themeChanged', {detail: {theme: themeName}}));
}

// ── Toggle Theme ───────────────────────────────────────────
function toggleTheme() {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  updateThemeButton();
  return next;
}

// ── Update Theme Button ────────────────────────────────────
function updateThemeButton() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  
  const theme = THEME_CONFIG.themes[currentTheme];
  btn.textContent = theme.icon;
  btn.title = `Switch to ${THEME_CONFIG.themes[currentTheme === 'dark' ? 'light' : 'dark'].name}`;
}

// ── Add Theme Toggle Button to Settings ────────────────────
function addThemeToggleUI() {
  const setS = document.querySelector('.set-s');
  if (!setS) return;
  
  // Insert before last set-s section
  const lastSetS = document.querySelectorAll('.set-s');
  const container = lastSetS[lastSetS.length - 1].parentElement;
  
  // Create theme section
  const themeSection = document.createElement('div');
  themeSection.className = 'set-s';
  themeSection.innerHTML = `
    <div class="set-slbl">Theme</div>
    <div class="set-row">
      <div>
        <div class="set-lbl">Dark Mode</div>
        <div class="set-sub">Chế độ tối / sáng</div>
      </div>
      <button id="theme-toggle-btn" class="theme-toggle-btn" onclick="toggleTheme();updateThemeButton()">
        🌙
      </button>
    </div>
  `;
  
  // Insert before apply button
  const setFoot = container.querySelector('.set-foot');
  if (setFoot) {
    container.insertBefore(themeSection, setFoot);
  } else {
    container.appendChild(themeSection);
  }
  
  updateThemeButton();
}

// ── CSS for theme toggle button ────────────────────────────
function injectThemeCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .theme-toggle-btn {
      font-size: 18px;
      width: 40px;
      height: 32px;
      border: 1px solid var(--b1);
      border-radius: 6px;
      background: var(--bg3);
      cursor: pointer;
      transition: all .15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .theme-toggle-btn:hover {
      border-color: var(--acc);
      background: var(--acc-d);
      transform: scale(1.05);
    }
    .theme-toggle-btn:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);
}

// ── Export for use in app.js ───────────────────────────────
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.updateThemeButton = updateThemeButton;
window.addThemeToggleUI = addThemeToggleUI;
window.currentTheme = currentTheme;
window.THEME_CONFIG = THEME_CONFIG;

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectThemeCSS();
    initTheme();
  });
} else {
  injectThemeCSS();
  initTheme();
}
