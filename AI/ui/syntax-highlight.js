/* ═══════════════════════════════════════════════════════════════
   SYNTAX HIGHLIGHT MODULE — ui/modules/syntax-highlight.js
   Dùng highlight.js lite từ CDN
   ═══════════════════════════════════════════════════════════════ */

// ── Configuration ──────────────────────────────────────────
const HIGHLIGHT_CONFIG = {
  cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0',
  scriptUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  styleUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
  enabledLanguages: ['python', 'javascript', 'html', 'css', 'json', 'bash', 'sh'],
  autodetect: true
};

// ── State ──────────────────────────────────────────────────
let hlReady = false;

// ── Load Highlight.js ──────────────────────────────────────
async function loadHighlightJs() {
  if (hlReady || window.hljs) return true;
  
  return new Promise((resolve) => {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = HIGHLIGHT_CONFIG.styleUrl;
    document.head.appendChild(link);
    
    // Load JS
    const script = document.createElement('script');
    script.src = HIGHLIGHT_CONFIG.scriptUrl;
    script.onload = () => {
      hlReady = true;
      console.log('✓ Syntax highlight loaded');
      resolve(true);
    };
    script.onerror = () => {
      console.warn('⚠ Failed to load syntax highlight');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

// ── Detect language from extension ─────────────────────────
function detectLanguage(filename) {
  const ext = filename?.split('.')?.pop()?.toLowerCase() || '';
  const langMap = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'json': 'json',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return langMap[ext] || 'plaintext';
}

// ── Highlight code ────────────────────────────────────────
async function highlightCode(codeElement, language = null) {
  if (!hlReady && !await loadHighlightJs()) {
    return; // Fallback: không highlight
  }
  
  if (!codeElement) return;
  
  try {
    const text = codeElement.textContent;
    const lang = language || detectLanguage(codeElement.dataset.filename);
    
    if (window.hljs) {
      // Highlight.js loaded
      const highlighted = window.hljs.highlight(text, {
        language: lang,
        ignoreIllegals: true
      });
      codeElement.innerHTML = highlighted.value;
      codeElement.classList.add('hljs', `language-${lang}`);
    }
  } catch (e) {
    console.warn('Highlight error:', e);
  }
}

// ── Highlight code in editor ──────────────────────────────
async function highlightEditor() {
  const editor = document.getElementById('code-content');
  if (!editor) return;
  
  // Determine filename
  const filename = window.currentFile?.name || 'unknown';
  
  // Highlight
  await highlightCode(editor, detectLanguage(filename));
}

// ── Export for use in app.js ───────────────────────────────
window.loadHighlightJs = loadHighlightJs;
window.highlightCode = highlightCode;
window.highlightEditor = highlightEditor;
window.detectLanguage = detectLanguage;
window.HIGHLIGHT_CONFIG = HIGHLIGHT_CONFIG;
