#!/data/data/com.termux/files/usr/bin/bash
# ================================================================
#  AI Dev Studio AIDEv1.0.0  |  Termux ARM64
#  Type "AI" anywhere in Termux to open menu
# ================================================================

set -euo pipefail

# ── Màu / Colors ─────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m'
C='\033[0;36m' B='\033[0;34m' W='\033[1;37m'
D='\033[2m'    N='\033[0m'

# ── Đường dẫn / Paths ────────────────────────────────────────────
AIDEV_DIR="$HOME/.aidev"
BRIDGE_PY="$AIDEV_DIR/bridge.py"
UI_DIR="$AIDEV_DIR/ui"
UI_HTML="$UI_DIR/index.html"
UI_CSS="$UI_DIR/style.css"
UI_APP="$UI_DIR/app.js"
UI_PARTICLES="$UI_DIR/particles.js"
UI_THEME="$UI_DIR/theme.js"
UI_MODEL_FILTER="$UI_DIR/model-filter.js"
UI_SYNTAX="$UI_DIR/syntax-highlight.js"
UI_TERMINAL="$UI_DIR/terminal.js"
UI_TEMPLATES="$UI_DIR/templates.js"
UI_TEMPLATES_JSON="$UI_DIR/templates.json"
UI_GIT="$UI_DIR/git.js"
UI_FILESEARCH="$UI_DIR/file-search.js"
UI_HEALTH="$UI_DIR/health.js"
UI_PROJECTS="$UI_DIR/projects.js"
UI_DIFF="$UI_DIR/diff.js"
PROJECTS_DIR="/sdcard/AIProjects"
LOG_DIR="$AIDEV_DIR/logs"
BRIDGE_PORT="${BRIDGE_PORT:-5000}"
OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
AI_MODEL="${AI_MODEL:-qwen2.5:7b}"
AI_THREADS="${AI_THREADS:-4}"
LANG_PREF="${LANG_PREF:-}"   # vi | en — trống = chưa chọn

# ── Helpers ──────────────────────────────────────────────────────
log()  { echo -e " ${C}▸${N} $*"; }
ok()   { echo -e " ${G}✔${N}  $*"; }
warn() { echo -e " ${Y}⚠${N}  $*"; }
err()  { echo -e " ${R}✘${N}  $*"; }
die()  { err "$*"; exit 1; }
sep()  { echo -e " ${D}────────────────────────────────────${N}"; }

is_running()   { pgrep -f "$1" >/dev/null 2>&1; }
distro_exists(){ proot-distro list 2>/dev/null | grep -q "^$1"; }

get_ip() {
    ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[\d.]+' \
    || ifconfig 2>/dev/null | grep -oP 'inet \K[\d.]+' | grep -v '127.' | head -1 \
    || echo "localhost"
}

# ── Text strings (VI / EN) ────────────────────────────────────────
t() {
    # t <vi_text> <en_text>
    if [[ "${LANG_PREF:-vi}" == "en" ]]; then echo "$2"; else echo "$1"; fi
}

# ── Header ───────────────────────────────────────────────────────
show_header() {
    clear
    local lang_tag
    [[ "${LANG_PREF:-vi}" == "en" ]] && lang_tag="EN" || lang_tag="VI"
    echo ""
    echo -e "${W}  ╔══════════════════════════════════════════╗${N}"
    echo -e "${W}  ║${N}  ${C}⬡  AI Dev Studio AIDEv1.0.0${N}  ${D}[${lang_tag}] ARM64${N}  ${W}║${N}"
    echo -e "${W}  ╠══════════════════════════════════════════╣${N}"
    local ol_st wui_st
    is_running "ollama serve" \
        && ol_st="${G}● $(t 'chạy' 'running')${N}" \
        || ol_st="${R}○ $(t 'dừng' 'stopped')${N}"
    is_running "bridge.py" \
        && wui_st="${G}● $(t 'chạy' 'running') :${BRIDGE_PORT}${N}" \
        || wui_st="${R}○ $(t 'dừng' 'stopped')${N}"
    echo -e "${W}  ║${N}  Ollama  ${ol_st}   WebUI  ${wui_st}"
    echo -e "${W}  ║${N}  Model   ${D}${AI_MODEL}${N}   Threads  ${D}${AI_THREADS}${N}"
    echo -e "${W}  ╚══════════════════════════════════════════╝${N}"
    echo ""
}

# ================================================================
#  CHỌN NGÔN NGỮ / LANGUAGE SELECTION
# ================================================================
select_language() {
    clear
    echo ""
    echo -e "${W}  ╔══════════════════════════════════════════╗${N}"
    echo -e "${W}  ║${N}  ${C}⬡  AI Dev Studio AIDEv1.0.0${N}              ${W}║${N}"
    echo -e "${W}  ╚══════════════════════════════════════════╝${N}"
    echo ""
    echo -e "  ${W}Chọn ngôn ngữ / Select language:${N}"
    echo ""
    echo -e "  ${W}1.${N}  🇻🇳  Tiếng Việt"
    echo -e "  ${W}2.${N}  🇬🇧  English"
    echo ""
    read -rp "  [1/2]: " ch
    case "$ch" in
        1) LANG_PREF="vi" ;;
        2) LANG_PREF="en" ;;
        *) LANG_PREF="vi" ;;
    esac
    _save_config
}

# ================================================================
#  MENU CHÍNH / MAIN MENU
# ================================================================
main_menu() {
    while true; do
        show_header
        echo -e "  ${W}1.${N}  ⚙   $(t 'Cài đặt lần đầu' 'First-time setup')"
        echo -e "  ${W}2.${N}  🚀  $(t 'Khởi động AI Studio' 'Launch AI Studio')"
        echo -e "  ${W}3.${N}  ■   $(t 'Dừng tất cả' 'Stop all services')"
        echo -e "  ${W}4.${N}  📦  $(t 'Pull / quản lý model' 'Pull / manage models')"
        echo -e "  ${W}5.${N}  🔧  $(t 'Cấu hình' 'Configuration')"
        echo -e "  ${W}6.${N}  📊  $(t 'Trạng thái & log' 'Status & logs')"
        echo -e "  ${W}7.${N}  🔄  $(t 'Cập nhật bridge & UI' 'Update bridge & UI')"
        echo -e "  ${W}8.${N}  🔑  $(t 'Cấp quyền thực thi' 'Fix permissions')"
        echo -e "  ${W}9.${N}  🌐  $(t 'Đổi ngôn ngữ (EN)' 'Change language (VI)')"
        sep
        echo -e "  ${W}0.${N}  ${D}$(t 'Thoát' 'Exit')${N}"
        echo ""
        read -rp "  $(t 'Chọn' 'Choose') [0-9]: " choice
        case "$choice" in
            1) menu_install ;;
            2) menu_start ;;
            3) menu_stop ;;
            4) menu_models ;;
            5) menu_config ;;
            6) menu_status ;;
            7) menu_update ;;
            8) menu_chmod ;;
            9) select_language ;;
            0) echo -e "\n  ${D}$(t 'Tạm biệt!' 'Goodbye!')${N}\n"; exit 0 ;;
            *) warn "$(t 'Không hợp lệ.' 'Invalid choice.')"; sleep 1 ;;
        esac
    done
}

# ================================================================
#  1. CÀI ĐẶT / SETUP
# ================================================================
menu_install() {
    show_header
    echo -e "  ${W}$(t 'Cài đặt lần đầu' 'First-time Setup')${N}\n"
    echo -e "  ${W}1.${N}  $(t 'Cài tất cả' 'Install everything') ${D}($(t 'khuyến nghị' 'recommended'))${N}"
    echo -e "  ${W}2.${N}  $(t 'Chỉ cài Ollama' 'Ollama only')"
    echo -e "  ${W}3.${N}  $(t 'Chỉ cài Web UI Bridge' 'Web UI Bridge only')"
    sep
    echo -e "  ${W}0.${N}  ${D}$(t 'Quay lại' 'Back')${N}"
    echo ""
    read -rp "  $(t 'Chọn' 'Choose') [0-3]: " ch
    case "$ch" in
        1) do_install_base; do_install_ollama; do_install_bridge ;;
        2) do_install_base; do_install_ollama ;;
        3) do_install_base; do_install_bridge ;;
        0) return ;;
        *) warn "$(t 'Không hợp lệ.' 'Invalid.')"; sleep 1; return ;;
    esac
    echo ""
    ok "$(t 'Cài đặt hoàn tất!' 'Setup complete!')"
    read -rp "  $(t 'Nhấn Enter...' 'Press Enter...')"
}

do_install() { do_install_base; do_install_ollama; do_install_bridge; }

do_install_base() {
    log "$(t 'Cập nhật Termux...' 'Updating Termux...')"
    apt update -y && apt install -y proot-distro python3 iproute2 \
        || die "$(t 'Không cài được package cơ bản.' 'Failed to install base packages.')"
    mkdir -p "$AIDEV_DIR/ui" "$LOG_DIR" "$PROJECTS_DIR"
    ok "$(t 'Base packages xong.' 'Base packages done.')"
}

do_install_ollama() {
    log "$(t 'Cài Ollama...' 'Installing Ollama...')"
    if distro_exists "ollama"; then
        warn "$(t "Distro 'ollama' đã có, bỏ qua." "Distro 'ollama' exists, skipping.")"
    else
        pd install --override-alias ollama ubuntu \
            || die "$(t 'Không tạo được distro ollama.' 'Failed to create ollama distro.')"
    fi
    pd login ollama -- bash -c "
        set -e
        apt update -y && apt upgrade -y
        apt install -y ca-certificates curl
        update-ca-certificates
        curl -fsSL https://ollama.com/install.sh | sh
    " || die "$(t 'Cài Ollama thất bại.' 'Ollama installation failed.')"
    ok "$(t 'Ollama xong.' 'Ollama done.')"
}

do_install_bridge() {
    log "$(t 'Cài Web UI Bridge...' 'Installing Web UI Bridge...')"
    python3 -m pip install flask flask-cors requests --break-system-packages \
        || die "$(t 'Không cài được Python packages.' 'Failed to install Python packages.')"

    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    [[ -f "$SCRIPT_DIR/bridge.py" ]] \
        && cp "$SCRIPT_DIR/bridge.py" "$BRIDGE_PY" \
        || die "$(t 'Không tìm thấy bridge.py.' 'bridge.py not found.')"

    mkdir -p "$UI_DIR"
    local ui_files=(
        "index.html" "style.css" "app.js" "particles.js"
        "theme.js" "model-filter.js" "syntax-highlight.js" "terminal.js"
        "templates.js" "templates.json" "git.js" "file-search.js" "health.js"
        "projects.js" "diff.js"
    )
    for f in "${ui_files[@]}"; do
        if [[ -f "$SCRIPT_DIR/ui/$f" ]]; then
            cp "$SCRIPT_DIR/ui/$f" "$UI_DIR/$f"
            ok "  $(t 'Đã copy' 'Copied'): ui/$f"
        else
            warn "  $(t 'Không tìm thấy' 'Not found'): ui/$f"
        fi
    done

    ok "$(t 'Web UI Bridge xong.' 'Web UI Bridge done.')"
    _register_command
}

_register_command() {
    local BIN="$PREFIX/bin/AI"
    cat > "$BIN" << CMDEOF
#!/data/data/com.termux/files/usr/bin/bash
bash "$(realpath "${BASH_SOURCE[0]}")" "\$@"
CMDEOF
    chmod +x "$BIN"
    ok "$(t "Lệnh 'AI' đã đăng ký — gõ AI ở bất kỳ đâu." "Command 'AI' registered — type AI anywhere.")"
}

# ================================================================
#  2. KHỞI ĐỘNG / LAUNCH
# ================================================================
menu_start() {
    show_header
    echo -e "  ${W}$(t 'Khởi động AI Studio' 'Launch AI Studio')${N}\n"

    if [[ ! -f "$BRIDGE_PY" ]]; then
        warn "$(t 'Chưa cài đặt. Chạy cài đặt trước.' 'Not installed. Run setup first.')"
        echo ""
        read -rp "  $(t 'Cài đặt ngay?' 'Setup now?') [y/N]: " yn
        [[ "$yn" =~ ^[Yy]$ ]] && do_install || return
    fi

    # Ollama
    if is_running "ollama serve"; then
        warn "$(t 'Ollama đang chạy rồi.' 'Ollama already running.')"
    else
        log "$(t 'Khởi động Ollama...' 'Starting Ollama...')"
        pd login ollama -- bash -c "ollama serve" \
            >"$LOG_DIR/ollama.log" 2>&1 &
        sleep 3
        is_running "ollama serve" \
            && ok "$(t 'Ollama đã lên.' 'Ollama is up.')" \
            || { err "$(t 'Ollama lỗi. Xem:' 'Ollama error. Check:') $LOG_DIR/ollama.log"; read -rp "  Enter..."; return; }
    fi

    # Bridge
    if is_running "bridge.py"; then
        warn "$(t 'Web UI đang chạy rồi.' 'Web UI already running.')"
    else
        log "$(t 'Khởi động Web UI...' 'Starting Web UI...')"
        OLLAMA_HOST="$OLLAMA_HOST" \
        AI_MODEL="$AI_MODEL" \
        AI_THREADS="$AI_THREADS" \
        BRIDGE_PORT="$BRIDGE_PORT" \
        PROJECTS_DIR="$PROJECTS_DIR" \
        python3 "$BRIDGE_PY" \
            >"$LOG_DIR/bridge.log" 2>&1 &
        sleep 3
        is_running "bridge.py" \
            && ok "$(t 'Web UI đã lên.' 'Web UI is up.')" \
            || { err "$(t 'Bridge lỗi. Xem:' 'Bridge error. Check:') $LOG_DIR/bridge.log"; read -rp "  Enter..."; return; }
    fi

    local IP; IP=$(get_ip)
    echo ""
    sep
    echo -e "\n  ${G}${W}✔  $(t 'AI Studio đang chạy!' 'AI Studio is running!')${N}\n"
    echo -e "  ${W}$(t 'Trình duyệt PC' 'Browser'):${N}      ${C}http://localhost:${BRIDGE_PORT}${N}"
    echo -e "  ${W}$(t 'Kết nối thiết bị khác' 'Other device'):${N}  ${C}http://${IP}:${BRIDGE_PORT}${N}"
    echo -e "  ${W}Projects:${N}          ${D}${PROJECTS_DIR}${N}"
    sep
    echo ""
    echo -e "  ${D}$(t 'Nhấn Enter để quay lại, Ctrl+C để giữ session...' 'Press Enter to go back, Ctrl+C to keep session...')${N}"
    read -r
}

# ================================================================
#  3. DỪNG / STOP
# ================================================================
menu_stop() {
    show_header
    echo -e "  ${W}$(t 'Dừng dịch vụ' 'Stop Services')${N}\n"
    log "$(t 'Dừng Web UI...' 'Stopping Web UI...')"
    pkill -f "bridge.py"   2>/dev/null \
        && ok "$(t 'Bridge đã dừng.' 'Bridge stopped.')" \
        || warn "$(t 'Bridge không đang chạy.' 'Bridge was not running.')"
    log "$(t 'Dừng Ollama...' 'Stopping Ollama...')"
    pkill -f "ollama serve" 2>/dev/null \
        && ok "$(t 'Ollama đã dừng.' 'Ollama stopped.')" \
        || warn "$(t 'Ollama không đang chạy.' 'Ollama was not running.')"
    echo ""
    read -rp "  $(t 'Nhấn Enter...' 'Press Enter...')"
}

# ================================================================
#  4. MODELS
# ================================================================
menu_models() {
    while true; do
        show_header
        echo -e "  ${W}$(t 'Quản lý Model' 'Manage Models')${N}\n"

        local installed=""
        if is_running "ollama serve"; then
            installed=$(curl -s "http://127.0.0.1:11434/api/tags" 2>/dev/null \
                | python3 -c "import sys,json; d=json.load(sys.stdin); [print(m['name']) for m in d.get('models',[])]" 2>/dev/null || true)
            if [[ -z "$installed" ]]; then
                installed=$(pd login ollama -- bash -c \
                    "ollama list 2>/dev/null | tail -n +2 | awk '{print \$1}'" 2>/dev/null || true)
            fi
        fi

        if [[ -n "$installed" ]]; then
            echo -e "  ${G}$(t 'Model đã cài:' 'Installed models:')${N}"
            while IFS= read -r m; do
                local marker="   ${G}✔${N}"
                [[ "$m" == "$AI_MODEL" ]] && marker="   ${C}★ ($(t 'đang dùng' 'active')) ✔${N}"
                echo -e "$marker ${D}$m${N}"
            done <<< "$installed"
            sep
        fi

        echo -e "  ${W}$(t 'Model gợi ý:' 'Suggested models:')${N}"
        echo -e "  ${W}1.${N}  llama3.2:3b         ${D}~2GB  · $(t 'nhanh, nhẹ' 'fast, light')${N}"
        echo -e "  ${W}2.${N}  qwen2.5:7b          ${D}~4.4GB · $(t 'cân bằng, tốt tiếng Việt' 'balanced, good Vietnamese')${N}"
        echo -e "  ${W}3.${N}  deepseek-coder:6.7b ${D}~4.1GB · $(t 'chuyên code' 'code specialist')${N}"
        echo -e "  ${W}4.${N}  codellama:13b       ${D}~8GB  · $(t 'mạnh nhất' 'most powerful')${N}"
        echo -e "  ${W}5.${N}  $(t 'Nhập tên model khác' 'Enter custom model name')"
        sep
        echo -e "  ${W}0.${N}  ${D}$(t 'Quay lại' 'Back')${N}"
        echo ""
        read -rp "  $(t 'Chọn' 'Choose'): " ch

        local model_name=""
        case "$ch" in
            1) model_name="llama3.2:3b" ;;
            2) model_name="qwen2.5:7b" ;;
            3) model_name="deepseek-coder:6.7b" ;;
            4) model_name="codellama:13b" ;;
            5) read -rp "  $(t 'Tên model' 'Model name'): " model_name ;;
            0) return ;;
            *) warn "$(t 'Không hợp lệ.' 'Invalid.')"; sleep 1; continue ;;
        esac

        [[ -z "$model_name" ]] && continue

        local already_installed=false
        echo "$installed" | grep -qx "$model_name" 2>/dev/null && already_installed=true

        if $already_installed; then
            echo ""
            ok "$(t "Model '$model_name' đã được cài." "Model '$model_name' is installed.")"
            echo ""
            echo -e "  ${W}1.${N}  $(t 'Set làm model active' 'Set as active model') ${D}($(t 'đang dùng' 'current'): ${AI_MODEL})${N}"
            echo -e "  ${W}2.${N}  $(t 'Pull lại / cập nhật' 'Re-pull / update')"
            echo -e "  ${W}0.${N}  ${D}$(t 'Quay lại' 'Back')${N}"
            echo ""
            read -rp "  $(t 'Chọn' 'Choose'): " action
            case "$action" in
                1)
                    AI_MODEL="$model_name"
                    _save_config
                    if is_running "bridge.py"; then
                        curl -s -X POST "http://127.0.0.1:${BRIDGE_PORT}/api/models/set" \
                             -H "Content-Type: application/json" \
                             -d "{\"model\":\"$model_name\"}" >/dev/null 2>&1 || true
                    fi
                    ok "$(t 'Model active →' 'Active model →') $AI_MODEL"
                    ;;
                2) log "$(t 'Pull lại:' 'Re-pulling:') $model_name..."; _do_pull "$model_name" ;;
                *) ;;
            esac
        else
            log "$(t 'Pull model mới:' 'Pulling new model:') $model_name..."
            _do_pull "$model_name"
        fi

        echo ""
        read -rp "  $(t 'Nhấn Enter...' 'Press Enter...')"
    done
}

_do_pull() {
    local model="$1"
    local started_tmp=false
    if ! is_running "ollama serve"; then
        log "$(t 'Khởi động Ollama tạm...' 'Starting Ollama temporarily...')"
        pd login ollama -- bash -c "ollama serve" >>"$LOG_DIR/ollama.log" 2>&1 &
        sleep 5
        started_tmp=true
    fi
    if pd login ollama -- bash -c "ollama pull $model" 2>&1; then
        ok "$(t 'Pull xong:' 'Pull done:') $model"
    else
        warn "$(t 'Pull thất bại. Kiểm tra tên model và kết nối mạng.' 'Pull failed. Check model name and network connection.')"
    fi
    $started_tmp && pkill -f "ollama serve" 2>/dev/null && sleep 1 || true
}

# ================================================================
#  5. CẤU HÌNH / CONFIGURATION
# ================================================================
menu_config() {
    while true; do
        show_header
        echo -e "  ${W}$(t 'Cấu hình hiện tại' 'Current Configuration')${N}\n"
        echo -e "  ${W}Model:${N}    ${C}$AI_MODEL${N}"
        echo -e "  ${W}Threads:${N}  ${C}$AI_THREADS${N}"
        echo -e "  ${W}Port:${N}     ${C}$BRIDGE_PORT${N}"
        echo -e "  ${W}Projects:${N} ${C}$PROJECTS_DIR${N}"
        sep
        echo -e "  ${W}1.${N}  $(t 'Đổi model' 'Change model')"
        echo -e "  ${W}2.${N}  $(t 'Đổi số threads' 'Change threads') ($(t 'hiện' 'current'): $AI_THREADS)"
        echo -e "  ${W}3.${N}  $(t 'Đổi port' 'Change port') ($(t 'hiện' 'current'): $BRIDGE_PORT)"
        echo -e "  ${W}4.${N}  $(t 'Đổi projects folder' 'Change projects folder')"
        echo -e "  ${W}5.${N}  $(t 'Lưu cấu hình' 'Save config')"
        sep
        echo -e "  ${W}0.${N}  ${D}$(t 'Quay lại' 'Back')${N}"
        echo ""
        read -rp "  $(t 'Chọn' 'Choose') [0-5]: " ch
        case "$ch" in
            1)
                read -rp "  $(t 'Tên model mới' 'New model name'): " v
                [[ -n "$v" ]] && AI_MODEL="$v" && ok "Model → $AI_MODEL"
                ;;
            2)
                read -rp "  Threads [2/4/6/8]: " v
                [[ "$v" =~ ^(2|4|6|8)$ ]] && AI_THREADS="$v" && ok "Threads → $AI_THREADS" \
                    || warn "$(t 'Chỉ nhập 2, 4, 6 hoặc 8.' 'Only 2, 4, 6 or 8 allowed.')"
                ;;
            3)
                read -rp "  Port: " v
                [[ "$v" =~ ^[0-9]+$ ]] && BRIDGE_PORT="$v" && ok "Port → $BRIDGE_PORT" \
                    || warn "$(t 'Port không hợp lệ.' 'Invalid port.')"
                ;;
            4)
                read -rp "  $(t 'Đường dẫn projects' 'Projects path'): " v
                [[ -n "$v" ]] && PROJECTS_DIR="$v" && mkdir -p "$PROJECTS_DIR" \
                    && ok "Projects → $PROJECTS_DIR"
                ;;
            5) _save_config ;;
            0) return ;;
            *) warn "$(t 'Không hợp lệ.' 'Invalid.')"; sleep 1 ;;
        esac
    done
}

_save_config() {
    local cfg="$AIDEV_DIR/config.env"
    mkdir -p "$AIDEV_DIR"
    cat > "$cfg" << EOF
AI_MODEL=$AI_MODEL
AI_THREADS=$AI_THREADS
BRIDGE_PORT=$BRIDGE_PORT
PROJECTS_DIR=$PROJECTS_DIR
OLLAMA_HOST=$OLLAMA_HOST
LANG_PREF=$LANG_PREF
EOF
    ok "$(t 'Đã lưu →' 'Saved →') $cfg"
    sleep 1
}

_load_config() {
    local cfg="$AIDEV_DIR/config.env"
    [[ -f "$cfg" ]] && source "$cfg" || true
}

# ================================================================
#  6. TRẠNG THÁI / STATUS
# ================================================================
menu_status() {
    show_header
    echo -e "  ${W}$(t 'Trạng thái' 'Status')${N}\n"

    if is_running "ollama serve"; then
        echo -e "  ${G}●${N}  Ollama     ${G}$(t 'Đang chạy' 'Running')${N}"
        local models
        models=$(pd login ollama -- bash -c \
            "ollama list 2>/dev/null | tail -n +2 | awk '{print \$1}'" 2>/dev/null || true)
        while IFS= read -r m; do
            [[ -n "$m" ]] && echo -e "      ${D}└ $m${N}"
        done <<< "$models"
    else
        echo -e "  ${R}○${N}  Ollama     ${D}$(t 'Đã dừng' 'Stopped')${N}"
    fi

    if is_running "bridge.py"; then
        local IP; IP=$(get_ip)
        echo -e "  ${G}●${N}  Web UI     ${G}$(t 'Đang chạy' 'Running')${N}  ${D}→ http://${IP}:${BRIDGE_PORT}${N}"
    else
        echo -e "  ${R}○${N}  Web UI     ${D}$(t 'Đã dừng' 'Stopped')${N}"
    fi

    sep
    echo -e "\n  ${W}$(t 'Log gần nhất:' 'Recent logs:')${N}\n"
    echo -e "  ${D}[bridge]${N}"
    tail -5 "$LOG_DIR/bridge.log" 2>/dev/null \
        | while IFS= read -r l; do echo "   $l"; done \
        || echo -e "   ${D}($(t 'chưa có log' 'no logs yet'))${N}"
    echo ""
    echo -e "  ${D}[ollama]${N}"
    tail -5 "$LOG_DIR/ollama.log" 2>/dev/null \
        | while IFS= read -r l; do echo "   $l"; done \
        || echo -e "   ${D}($(t 'chưa có log' 'no logs yet'))${N}"

    sep
    echo ""
    echo -e "  ${W}l${N}  $(t 'Xem log bridge realtime' 'Watch bridge log')"
    echo -e "  ${W}o${N}  $(t 'Xem log ollama realtime' 'Watch ollama log')"
    echo -e "  ${W}Enter${N}  $(t 'Quay lại' 'Back')"
    echo ""
    read -rp "  $(t 'Chọn' 'Choose'): " ch
    case "$ch" in
        l) tail -f "$LOG_DIR/bridge.log" 2>/dev/null || warn "$(t 'Chưa có log.' 'No logs yet.')" ;;
        o) tail -f "$LOG_DIR/ollama.log" 2>/dev/null || warn "$(t 'Chưa có log.' 'No logs yet.')" ;;
    esac
}

# ================================================================
#  7. CẬP NHẬT / UPDATE
# ================================================================
menu_update() {
    show_header
    echo -e "  ${W}$(t 'Cập nhật bridge & UI' 'Update bridge & UI')${N}\n"

    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local updated=0

    local was_running=false
    if is_running "bridge.py"; then
        was_running=true
        log "$(t 'Dừng bridge tạm...' 'Stopping bridge temporarily...')"
        pkill -f "bridge.py" 2>/dev/null; sleep 1
    fi

    _update_file() {
        local src="$1" dst="$2" label="$3"
        if [[ ! -f "$src" ]]; then
            warn "$label → $(t 'không tìm thấy file nguồn' 'source file not found')"
            return
        fi
        local sh sd
        sh=$(md5sum "$src" | cut -d' ' -f1)
        sd=$(md5sum "$dst" 2>/dev/null | cut -d' ' -f1 || echo "none")
        if [[ "$sh" != "$sd" ]]; then
            mkdir -p "$(dirname "$dst")"
            cp "$src" "$dst"
            ok "$label → $(t 'cập nhật xong' 'updated')"
            updated=$((updated+1))
        else
            warn "$label → $(t 'đã là phiên bản mới nhất' 'already up to date')"
        fi
    }

    _update_file "$SCRIPT_DIR/bridge.py"                 "$BRIDGE_PY"         "bridge.py          "
    _update_file "$SCRIPT_DIR/ui/index.html"             "$UI_HTML"           "index.html         "
    _update_file "$SCRIPT_DIR/ui/style.css"              "$UI_CSS"            "style.css          "
    _update_file "$SCRIPT_DIR/ui/app.js"                 "$UI_APP"            "app.js             "
    _update_file "$SCRIPT_DIR/ui/particles.js"           "$UI_PARTICLES"      "particles.js       "
    _update_file "$SCRIPT_DIR/ui/theme.js"               "$UI_THEME"          "theme.js           "
    _update_file "$SCRIPT_DIR/ui/model-filter.js"        "$UI_MODEL_FILTER"   "model-filter.js    "
    _update_file "$SCRIPT_DIR/ui/syntax-highlight.js"    "$UI_SYNTAX"         "syntax-highlight.js"
    _update_file "$SCRIPT_DIR/ui/terminal.js"            "$UI_TERMINAL"       "terminal.js        "
    _update_file "$SCRIPT_DIR/ui/templates.js"           "$UI_TEMPLATES"      "templates.js       "
    _update_file "$SCRIPT_DIR/ui/templates.json"         "$UI_TEMPLATES_JSON" "templates.json     "
    _update_file "$SCRIPT_DIR/ui/git.js"                 "$UI_GIT"            "git.js             "
    _update_file "$SCRIPT_DIR/ui/file-search.js"         "$UI_FILESEARCH"     "file-search.js     "
    _update_file "$SCRIPT_DIR/ui/health.js"              "$UI_HEALTH"         "health.js          "
    _update_file "$SCRIPT_DIR/ui/projects.js"            "$UI_PROJECTS"       "projects.js        "
    _update_file "$SCRIPT_DIR/ui/diff.js"                "$UI_DIFF"           "diff.js            "

    if $was_running; then
        log "$(t 'Khởi động lại bridge...' 'Restarting bridge...')"
        OLLAMA_HOST="$OLLAMA_HOST" AI_MODEL="$AI_MODEL" \
        AI_THREADS="$AI_THREADS" BRIDGE_PORT="$BRIDGE_PORT" \
        PROJECTS_DIR="$PROJECTS_DIR" \
        python3 "$BRIDGE_PY" >"$LOG_DIR/bridge.log" 2>&1 &
        sleep 2
        is_running "bridge.py" \
            && ok "$(t 'Bridge đã restart.' 'Bridge restarted.')" \
            || warn "$(t 'Bridge lỗi, kiểm tra log.' 'Bridge error, check logs.')"
    fi

    echo ""
    [[ $updated -gt 0 ]] \
        && ok "$updated $(t 'file đã được cập nhật.' 'file(s) updated.')" \
        || log "$(t 'Không có gì thay đổi.' 'Nothing changed.')"
    echo ""
    read -rp "  $(t 'Nhấn Enter...' 'Press Enter...')"
}

# ================================================================
#  8. CẤP QUYỀN / PERMISSIONS
# ================================================================
menu_chmod() {
    show_header
    echo -e "  ${W}$(t 'Cấp quyền thực thi' 'Fix Permissions')${N}\n"

    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    chmod +x "$SCRIPT_DIR/AI.sh"   2>/dev/null && ok "AI.sh      +x" || warn "AI.sh: $(t 'không cấp được' 'failed')"
    chmod +x "$SCRIPT_DIR/bridge.py" 2>/dev/null && ok "bridge.py  +x" || warn "bridge.py: $(t 'không cấp được' 'failed')"

    if [[ -d "$AIDEV_DIR" ]]; then
        find "$AIDEV_DIR" \( -name "*.py" -o -name "*.sh" \) | while read -r f; do
            chmod +x "$f" && ok "${f##*/}  +x"
        done
    fi

    local BIN="$PREFIX/bin/AI"
    [[ -f "$BIN" ]] && chmod +x "$BIN" && ok "AI (global) +x"

    echo ""
    warn "$(t 'Lưu ý: /sdcard/AIProjects không hỗ trợ chmod (FAT32).' 'Note: /sdcard/AIProjects does not support chmod (FAT32).')"
    log  "  $(t 'Chạy file .py bằng: python3 file.py' 'Run .py files with: python3 file.py')"
    echo ""
    read -rp "  $(t 'Nhấn Enter...' 'Press Enter...')"
}

# ================================================================
#  MAIN
# ================================================================
_load_config

# Chọn ngôn ngữ lần đầu / First-time language selection
if [[ -z "${LANG_PREF:-}" ]]; then
    select_language
fi

# Xử lý args / Handle args
case "${1:-}" in
    "start")   menu_start ;;
    "stop")    menu_stop ;;
    "install") menu_install ;;
    "status")  menu_status ;;
    "lang")    select_language ;;
    *)         main_menu ;;
esac
