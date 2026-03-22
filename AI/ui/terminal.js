/* ═══════════════════════════════════════════════════════════════
   TERMINAL MODULE — ui/modules/terminal.js
   Chạy bash/shell commands trực tiếp
   ═══════════════════════════════════════════════════════════════ */

// ── Configuration ──────────────────────────────────────────
const TERMINAL_CONFIG = {
  supportedCommands: [
    'ls', 'pwd', 'cd', 'cat', 'echo', 'grep', 'find',
    'python', 'python3', 'node', 'npm', 'git',
    'mkdir', 'touch', 'rm', 'cp', 'mv',
    'chmod', 'curl', 'wget', 'tar', 'zip'
  ],
  maxOutputLines: 1000,
  timeout: 60000  // 60 seconds
};

// ── State ──────────────────────────────────────────────────
let terminalOpen = false;
let lastCommand = '';

// ── Initialize Terminal UI ─────────────────────────────────
function initTerminal() {
  const output = document.getElementById('out-log');
  if (!output) return;
  
  // Add terminal input
  const termInput = document.createElement('div');
  termInput.id = 'terminal-input-area';
  termInput.innerHTML = `
    <div style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--b1);background:var(--bg2)">
      <span style="color:var(--t3);font-family:var(--mono);font-size:10px">$</span>
      <input type="text" id="terminal-cmd" 
             placeholder="ls, pwd, python3 file.py, git status..."
             style="flex:1;background:transparent;border:none;color:var(--t1);font-family:var(--mono);font-size:10px;outline:none"
             onkeydown="handleTerminalKey(event)">
    </div>
  `;
  output.appendChild(termInput);
}

// ── Handle terminal input ──────────────────────────────────
function handleTerminalKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = document.getElementById('terminal-cmd');
    const cmd = input.value.trim();
    if (cmd) {
      lastCommand = cmd;
      runCommand(cmd);
      input.value = '';
    }
  }
}

// ── Run command ────────────────────────────────────────────
async function runCommand(cmd) {
  const output = document.getElementById('out-log');
  if (!output) return;
  
  // Validate command (security)
  const cmdName = cmd.split(/\s+/)[0];
  if (!isCommandAllowed(cmdName)) {
    appendTerminalLine(`✘ Lệnh '${cmdName}' không được phép`, 'error');
    return;
  }
  
  // Show command
  appendTerminalLine(`$ ${cmd}`, 'command');
  
  try {
    // Send to backend endpoint /api/terminal
    const resp = await apiFetch('/api/terminal', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({command: cmd})
    });
    
    if (resp.error) {
      appendTerminalLine(`✘ ${resp.error}`, 'error');
      return;
    }
    
    // Stream output
    if (resp.job_id) {
      streamTerminalOutput(resp.job_id);
    } else if (resp.output) {
      appendTerminalLine(resp.output, 'output');
    }
  } catch (e) {
    appendTerminalLine(`✘ Error: ${e.message}`, 'error');
  }
}

// ── Stream terminal output ─────────────────────────────────
async function streamTerminalOutput(jobId) {
  const output = document.getElementById('out-log');
  if (!output) return;
  
  try {
    const resp = await fetch(`/api/terminal/output/${jobId}`, {
      headers: apiToken ? {'Authorization': `Bearer ${apiToken}`} : {}
    });
    
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      
      buf += dec.decode(value, {stream: true});
      const lines = buf.split('\n');
      buf = lines.pop();
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.line) appendTerminalLine(d.line.trim(), 'output');
          if (d.error) appendTerminalLine(`✘ ${d.error}`, 'error');
          if (d.done) {
            appendTerminalLine(`[Exit code: ${d.rc}]`, 'status');
          }
        } catch {}
      }
    }
  } catch (e) {
    appendTerminalLine(`✘ Output stream error: ${e.message}`, 'error');
  }
}

// ── Append line to terminal ────────────────────────────────
function appendTerminalLine(text, type = 'output') {
  const output = document.getElementById('out-log');
  if (!output) return;
  
  const line = document.createElement('div');
  line.className = `term-line term-${type}`;
  line.style.cssText = `
    font-family: var(--mono);
    font-size: 9.5px;
    padding: 2px 10px;
    white-space: pre-wrap;
    word-break: break-word;
  `;
  
  // Color code by type
  switch (type) {
    case 'command':
      line.style.color = 'var(--acc)';
      break;
    case 'error':
      line.style.color = 'var(--red)';
      break;
    case 'status':
      line.style.color = 'var(--grn)';
      break;
    default:
      line.style.color = 'var(--t2)';
  }
  
  line.textContent = text;
  output.appendChild(line);
  
  // Auto-scroll
  output.parentElement?.scrollTo(0, output.scrollHeight);
  
  // Limit lines
  const lines = output.querySelectorAll('.term-line');
  if (lines.length > TERMINAL_CONFIG.maxOutputLines) {
    lines[0].remove();
  }
}

// ── Validate command ───────────────────────────────────────
function isCommandAllowed(cmd) {
  // Basic whitelist
  return TERMINAL_CONFIG.supportedCommands.includes(cmd.toLowerCase());
}

// ── Clear terminal output ──────────────────────────────────
function clearTerminal() {
  const output = document.getElementById('out-log');
  if (output) {
    const lines = output.querySelectorAll('.term-line');
    lines.forEach(l => l.remove());
  }
  appendTerminalLine('Terminal cleared. Type command and press Enter.', 'status');
}

// ── Export ─────────────────────────────────────────────────
window.initTerminal = initTerminal;
window.runCommand = runCommand;
window.appendTerminalLine = appendTerminalLine;
window.clearTerminal = clearTerminal;
window.handleTerminalKey = handleTerminalKey;
window.TERMINAL_CONFIG = TERMINAL_CONFIG;
