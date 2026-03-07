#!/bin/bash

# Script khởi động AutoClip một lần
# Phiên bản: 2.0
# Chức năng: Khởi động hệ thống AutoClip đầy đủ (API backend + Celery Worker + Giao diện frontend)

set -euo pipefail

# =============================================================================
# Vùng cấu hình
# =============================================================================

# Cấu hình cổng dịch vụ
BACKEND_PORT=8000
FRONTEND_PORT=3000
REDIS_PORT=6379

# Cấu hình thời gian chờ dịch vụ
BACKEND_STARTUP_TIMEOUT=60
FRONTEND_STARTUP_TIMEOUT=90
HEALTH_CHECK_TIMEOUT=10

# Cấu hình nhật ký
LOG_DIR="logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
CELERY_LOG="$LOG_DIR/celery.log"

# File PID
BACKEND_PID_FILE="backend.pid"
FRONTEND_PID_FILE="frontend.pid"
CELERY_PID_FILE="celery.pid"

# =============================================================================
# Định nghĩa màu sắc và kiểu
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Định nghĩa biểu tượng
ICON_SUCCESS="✅"
ICON_ERROR="❌"
ICON_WARNING="⚠️"
ICON_INFO="ℹ️"
ICON_ROCKET="🚀"
ICON_GEAR="⚙️"
ICON_DATABASE="🗄️"
ICON_WORKER="👷"
ICON_WEB="🌐"
ICON_HEALTH="💚"

# =============================================================================
# Hàm tiện ích
# =============================================================================

log_info() {
    echo -e "${BLUE}${ICON_INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${ICON_SUCCESS} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${ICON_WARNING} $1${NC}"
}

log_error() {
    echo -e "${RED}${ICON_ERROR} $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}${ICON_ROCKET} $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

log_step() {
    echo -e "\n${CYAN}${ICON_GEAR} $1${NC}"
}

# Kiểm tra lệnh có tồn tại
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Kiểm tra cổng có đang dùng
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Chờ dịch vụ khởi động
wait_for_service() {
    local url="$1"
    local timeout="$2"
    local service_name="$3"
    
    log_info "Đang chờ $service_name khởi động..."
    
    for i in $(seq 1 "$timeout"); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            log_success "$service_name đã khởi động"
            return 0
        fi
        sleep 1
    done
    
    log_error "Hết thời gian chờ $service_name khởi động"
    return 1
}

# Kiểm tra tiến trình có chạy
process_running() {
    local pid_file="$1"
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    return 1
}

# Dừng tiến trình
stop_process() {
    local pid_file="$1"
    local service_name="$2"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Đang dừng $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Đang ép dừng $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$pid_file"
    fi
}

# =============================================================================
# Hàm kiểm tra môi trường
# =============================================================================

check_environment() {
    log_header "Kiểm tra môi trường"
    
    # Kiểm tra hệ điều hành
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "Phát hiện hệ thống macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Phát hiện hệ thống Linux"
    else
        log_warning "Hệ điều hành không xác định: $OSTYPE"
    fi
    
    # Kiểm tra các lệnh cần thiết
    local required_commands=("python3" "node" "npm" "redis-cli")
    for cmd in "${required_commands[@]}"; do
        if command_exists "$cmd"; then
            log_success "$cmd đã cài đặt"
        else
            log_error "$cmd chưa cài đặt, vui lòng cài đặt trước"
            exit 1
        fi
    done
    
    # Kiểm tra phiên bản Python
    local python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
    log_info "Phiên bản Python: $python_version"
    
    # Kiểm tra phiên bản Node.js
    local node_version=$(node --version)
    log_info "Phiên bản Node.js: $node_version"
    
    # Kiểm tra môi trường ảo
    if [[ ! -d "venv" ]]; then
        log_error "Môi trường ảo không tồn tại, vui lòng tạo: python3 -m venv venv"
        exit 1
    fi
    log_success "Môi trường ảo tồn tại"
    
    # Kiểm tra cấu trúc dự án
    local required_dirs=("backend" "frontend" "data")
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log_success "Thư mục $dir tồn tại"
        else
            log_error "Thư mục $dir không tồn tại"
            exit 1
        fi
    done
}

# =============================================================================
# Hàm khởi động dịch vụ
# =============================================================================

start_redis() {
    log_step "Khởi động dịch vụ Redis"
    
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Dịch vụ Redis đang chạy"
        return 0
    fi
    
    log_info "Đang khởi động dịch vụ Redis..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            brew services start redis
            sleep 3
        else
            log_error "Vui lòng khởi động dịch vụ Redis thủ công"
            exit 1
        fi
    else
        systemctl start redis-server 2>/dev/null || service redis-server start 2>/dev/null || {
            log_error "Không thể khởi động dịch vụ Redis, vui lòng khởi động thủ công"
            exit 1
        }
    fi
    
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Dịch vụ Redis khởi động thành công"
    else
        log_error "Dịch vụ Redis khởi động thất bại"
        exit 1
    fi
}

setup_environment() {
    log_step "Thiết lập môi trường"
    
    # Tạo thư mục nhật ký
    mkdir -p "$LOG_DIR"
    
    # Kích hoạt môi trường ảo
    log_info "Đang kích hoạt môi trường ảo..."
    source venv/bin/activate
    
    # Thiết lập đường dẫn Python
    : "${PYTHONPATH:=}"
    export PYTHONPATH="${PWD}:${PYTHONPATH}"
    log_info "Đặt đường dẫn Python: $PYTHONPATH"
    
    # Tải biến môi trường
    if [[ -f ".env" ]]; then
        log_info "Đang tải biến môi trường..."
        set -a
        source .env
        set +a
        log_success "Tải biến môi trường thành công"
    else
        log_warning "File .env không tồn tại, sử dụng cấu hình mặc định"
        # Tạo file biến môi trường mặc định
        if [[ ! -f ".env" ]]; then
            log_info "Đang tạo file .env mặc định..."
            cp env.example .env 2>/dev/null || {
                cat > .env << EOF
# Cấu hình môi trường AutoClip
DATABASE_URL=sqlite:///./data/autoclip.db
REDIS_URL=redis://localhost:6379/0
API_DASHSCOPE_API_KEY=
API_MODEL_NAME=qwen-plus
LOG_LEVEL=INFO
ENVIRONMENT=development
DEBUG=true
EOF
                log_success "Đã tạo file .env mặc định"
            }
        fi
    fi
    
    # Kiểm tra phụ thuộc Python
    log_info "Đang kiểm tra phụ thuộc Python..."
    if ! python -c "import fastapi, celery, sqlalchemy" 2>/dev/null; then
        log_warning "Thiếu phụ thuộc, đang cài đặt..."
        pip install -r requirements.txt
    fi
    log_success "Kiểm tra phụ thuộc Python hoàn tất"
}

init_database() {
    log_step "Khởi tạo cơ sở dữ liệu"
    
    # Đảm bảo thư mục dữ liệu tồn tại
    mkdir -p data
    
    # Khởi tạo cơ sở dữ liệu
    log_info "Đang tạo bảng cơ sở dữ liệu..."
    if python -c "
import sys
sys.path.insert(0, '.')
from backend.core.database import engine, Base
from backend.models import project, task, clip, collection, bilibili
try:
    Base.metadata.create_all(bind=engine)
    print('Tạo bảng cơ sở dữ liệu thành công')
except Exception as e:
    print(f'Khởi tạo cơ sở dữ liệu thất bại: {e}')
    sys.exit(1)
" 2>/dev/null; then
        log_success "Khởi tạo cơ sở dữ liệu thành công"
    else
        log_error "Khởi tạo cơ sở dữ liệu thất bại"
        exit 1
    fi
}

start_celery() {
    log_step "Khởi động Celery Worker"
    
    # Dừng tiến trình Celery hiện có
    pkill -f "celery.*worker" 2>/dev/null || true
    sleep 2
    
    log_info "Đang khởi động Celery Worker..."
    nohup celery -A backend.core.celery_app worker \
        --loglevel=info \
        --concurrency=2 \
        -Q processing,upload,notification,maintenance \
        --hostname=worker@%h \
        > "$CELERY_LOG" 2>&1 &
    
    local celery_pid=$!
    echo "$celery_pid" > "$CELERY_PID_FILE"
    
    # Chờ Worker khởi động
    sleep 5
    
    if pgrep -f "celery.*worker" >/dev/null; then
        log_success "Celery Worker đã khởi động (PID: $celery_pid)"
    else
        log_error "Celery Worker khởi động thất bại"
        log_info "Xem nhật ký: tail -f $CELERY_LOG"
        exit 1
    fi
}

start_backend() {
    log_step "Khởi động dịch vụ API backend"
    
    # Kiểm tra cổng có đang dùng
    if port_in_use "$BACKEND_PORT"; then
        log_warning "Cổng $BACKEND_PORT đã được sử dụng, đang thử dừng dịch vụ hiện có..."
        stop_process "$BACKEND_PID_FILE" "Dịch vụ backend"
    fi
    
    log_info "Đang khởi động dịch vụ backend (cổng: $BACKEND_PORT)..."
    nohup python -m uvicorn backend.main:app \
        --host 0.0.0.0 \
        --port "$BACKEND_PORT" \
        --reload \
        --reload-dir backend \
        --reload-include '*.py' \
        --reload-exclude 'data/*' \
        --reload-exclude 'logs/*' \
        --reload-exclude 'uploads/*' \
        --reload-exclude '*.log' \
        > "$BACKEND_LOG" 2>&1 &
    
    local backend_pid=$!
    echo "$backend_pid" > "$BACKEND_PID_FILE"
    
    # Chờ backend khởi động
    if wait_for_service "http://localhost:$BACKEND_PORT/api/v1/health/" "$BACKEND_STARTUP_TIMEOUT" "Dịch vụ backend"; then
        log_success "Dịch vụ backend đã khởi động (PID: $backend_pid)"
    else
        log_error "Dịch vụ backend khởi động thất bại"
        log_info "Xem nhật ký: tail -f $BACKEND_LOG"
        exit 1
    fi
}

start_frontend() {
    log_step "Khởi động dịch vụ frontend"
    
    # Kiểm tra cổng có đang dùng
    if port_in_use "$FRONTEND_PORT"; then
        log_warning "Cổng $FRONTEND_PORT đã được sử dụng, đang thử dừng dịch vụ hiện có..."
        stop_process "$FRONTEND_PID_FILE" "Dịch vụ frontend"
    fi
    
    # Vào thư mục frontend
    cd frontend || {
        log_error "Không thể vào thư mục frontend"
        exit 1
    }
    
    # Kiểm tra phụ thuộc frontend
    if [[ ! -d "node_modules" ]]; then
        log_info "Đang cài đặt phụ thuộc frontend..."
        npm install
    fi
    
    log_info "Đang khởi động dịch vụ frontend (cổng: $FRONTEND_PORT)..."
    nohup npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" \
        > "../$FRONTEND_LOG" 2>&1 &
    
    local frontend_pid=$!
    echo "$frontend_pid" > "../$FRONTEND_PID_FILE"
    
    # Quay về thư mục gốc dự án
    cd ..
    
    # Chờ frontend khởi động
    if wait_for_service "http://localhost:$FRONTEND_PORT/" "$FRONTEND_STARTUP_TIMEOUT" "Dịch vụ frontend"; then
        log_success "Dịch vụ frontend đã khởi động (PID: $frontend_pid)"
    else
        log_error "Dịch vụ frontend khởi động thất bại"
        log_info "Xem nhật ký: tail -f $FRONTEND_LOG"
        exit 1
    fi
}

# =============================================================================
# Hàm kiểm tra sức khỏe
# =============================================================================

health_check() {
    log_header "Kiểm tra sức khỏe hệ thống"
    
    local all_healthy=true
    
    # Kiểm tra backend
    log_info "Đang kiểm tra dịch vụ backend..."
    if curl -fsS "http://localhost:$BACKEND_PORT/api/v1/health/" >/dev/null 2>&1; then
        log_success "Dịch vụ backend hoạt động tốt"
    else
        log_error "Dịch vụ backend không hoạt động"
        all_healthy=false
    fi
    
    # Kiểm tra frontend
    log_info "Đang kiểm tra dịch vụ frontend..."
    if curl -fsS "http://localhost:$FRONTEND_PORT/" >/dev/null 2>&1; then
        log_success "Dịch vụ frontend hoạt động tốt"
    else
        log_error "Dịch vụ frontend không hoạt động"
        all_healthy=false
    fi
    
    # Kiểm tra Redis
    log_info "Đang kiểm tra dịch vụ Redis..."
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Dịch vụ Redis hoạt động tốt"
    else
        log_error "Dịch vụ Redis không hoạt động"
        all_healthy=false
    fi
    
    # Kiểm tra Celery Worker
    log_info "Đang kiểm tra Celery Worker..."
    if pgrep -f "celery.*worker" >/dev/null; then
        log_success "Celery Worker hoạt động tốt"
    else
        log_error "Celery Worker không hoạt động"
        all_healthy=false
    fi
    
    if [[ "$all_healthy" == true ]]; then
        log_success "Tất cả kiểm tra sức khỏe dịch vụ đều đạt"
        return 0
    else
        log_error "Một số dịch vụ kiểm tra sức khỏe thất bại"
        return 1
    fi
}

# =============================================================================
# Hàm dọn dẹp
# =============================================================================

cleanup() {
    log_header "Dọn dẹp dịch vụ"
    
    stop_process "$BACKEND_PID_FILE" "Dịch vụ backend"
    stop_process "$FRONTEND_PID_FILE" "Dịch vụ frontend"
    stop_process "$CELERY_PID_FILE" "Celery Worker"
    
    # Dừng tất cả tiến trình liên quan
    pkill -f "celery.*worker" 2>/dev/null || true
    pkill -f "uvicorn.*backend.main:app" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    
    log_success "Dọn dẹp hoàn tất"
}

# =============================================================================
# Hiển thị thông tin hệ thống
# =============================================================================

show_system_info() {
    log_header "Khởi động hệ thống hoàn tất"
    
    echo -e "${WHITE}🎉 Hệ thống AutoClip đã khởi động thành công!${NC}"
    echo ""
    echo -e "${CYAN}📊 Trạng thái dịch vụ:${NC}"
    echo -e "  ${ICON_WEB} API Backend:  http://localhost:$BACKEND_PORT"
    echo -e "  ${ICON_WEB} Giao diện:    http://localhost:$FRONTEND_PORT"
    echo -e "  ${ICON_WEB} Tài liệu API: http://localhost:$BACKEND_PORT/docs"
    echo -e "  ${ICON_HEALTH} Kiểm tra sức khỏe: http://localhost:$BACKEND_PORT/api/v1/health/"
    echo ""
    echo -e "${CYAN}📝 File nhật ký:${NC}"
    echo -e "  Nhật ký backend: tail -f $BACKEND_LOG"
    echo -e "  Nhật ký frontend: tail -f $FRONTEND_LOG"
    echo -e "  Nhật ký Celery: tail -f $CELERY_LOG"
    echo ""
    echo -e "${CYAN}🛑 Dừng hệ thống:${NC}"
    echo -e "  ./stop_autoclip.sh hoặc nhấn Ctrl+C"
    echo ""
    echo -e "${YELLOW}💡 Hướng dẫn sử dụng:${NC}"
    echo -e "  1. Truy cập http://localhost:$FRONTEND_PORT để sử dụng giao diện"
    echo -e "  2. Tải lên file video hoặc nhập liên kết B站"
    echo -e "  3. Hệ thống sẽ tự động chạy pipeline xử lý AI"
    echo -e "  4. Xem tiến độ và kết quả xử lý theo thời gian thực"
    echo ""
}

# =============================================================================
# Xử lý tín hiệu
# =============================================================================

trap cleanup EXIT INT TERM

# =============================================================================
# Hàm chính
# =============================================================================

main() {
    log_header "Bộ khởi động hệ thống AutoClip v2.0"
    
    # Kiểm tra môi trường
    check_environment
    
    # Khởi động dịch vụ
    start_redis
    setup_environment
    init_database
    start_celery
    start_backend
    start_frontend
    
    # Kiểm tra sức khỏe
    if health_check; then
        show_system_info
        
        # Giữ script chạy (không kiểm tra lặp)
        log_info "Hệ thống đang chạy... Nhấn Ctrl+C để dừng"
        log_info "Để kiểm tra trạng thái hệ thống, vui lòng chạy: ./status_autoclip.sh"
        while true; do
            sleep 3600  # Kiểm tra mỗi giờ, giảm tần suất
        done
    else
        log_error "Khởi động hệ thống thất bại, vui lòng kiểm tra nhật ký"
        exit 1
    fi
}

# Chạy hàm chính
main "$@"
