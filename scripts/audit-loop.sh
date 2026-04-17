#!/bin/bash
# ============================================================
# eCheckAI V2 — Audit Loop Test Runner
# ============================================================
# Rule: chạy → audit failure → fix → lặp lại cho đến khi
#        toàn bộ test XANH.
#
# Usage:
#   ./scripts/audit-loop.sh              # chạy e2e + unit
#   ./scripts/audit-loop.sh --unit-only  # chỉ unit tests
#   ./scripts/audit-loop.sh --e2e-only   # chỉ e2e tests
#   ./scripts/audit-loop.sh --max 5      # tối đa 5 vòng lặp
#
# Requires: Node.js 20+, Jest, Docker (cho e2e test DB)
# ============================================================

set -euo pipefail

# ─── Màu output ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Đường dẫn ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
LOG_FILE="${PROJECT_ROOT}/audit-loop.log"
REPORT_DIR="${PROJECT_ROOT}/.audit-reports"
TIMEOUT_SECONDS=300   # 5 phút mỗi vòng

# ─── Giá trị mặc định ───────────────────────────────────────
RUN_UNIT=true
RUN_E2E=true
MAX_ITERATIONS=50
CURRENT_ITERATION=0
TOTAL_FAILURES_FIXED=0
declare -a FIXED_TESTS=()
declare -a STILL_FAILING=()

# ─── Parse arguments ────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit-only)
      RUN_E2E=false
      shift
      ;;
    --e2e-only)
      RUN_UNIT=false
      shift
      ;;
    --max)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--unit-only] [--e2e-only] [--max N] [--timeout SECONDS]"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${RESET}"
      exit 1
      ;;
  esac
done

# ─── Khởi tạo ───────────────────────────────────────────────
mkdir -p "${REPORT_DIR}"

# Ghi header vào log file
{
  echo "================================================================"
  echo "AUDIT LOOP RUN — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Project: eCheckAI V2"
  echo "Mode: UNIT=${RUN_UNIT}, E2E=${RUN_E2E}"
  echo "Max iterations: ${MAX_ITERATIONS}"
  echo "Timeout per round: ${TIMEOUT_SECONDS}s"
  echo "================================================================"
} >> "${LOG_FILE}"

# ─── Helper functions ────────────────────────────────────────

log() {
  local level="$1"
  local message="$2"
  local timestamp
  timestamp="$(date '+%H:%M:%S')"
  echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║      eCheckAI V2 — AUDIT LOOP TEST RUNNER        ║${RESET}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

print_round_header() {
  local round="$1"
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}  VÒNG ${round} / ${MAX_ITERATIONS}${RESET}   $(date '+%H:%M:%S')"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

extract_failures_from_report() {
  local report_file="$1"
  if [[ ! -f "${report_file}" ]]; then
    echo "No report file found at ${report_file}"
    return
  fi

  # Trích xuất tên các test fail từ Jest JSON report
  node -e "
    const fs = require('fs');
    const report = JSON.parse(fs.readFileSync('${report_file}', 'utf8'));
    const failures = [];
    (report.testResults || []).forEach(suite => {
      (suite.testResults || []).forEach(test => {
        if (test.status === 'failed') {
          failures.push({
            file: suite.testFilePath.replace('${BACKEND_DIR}/', ''),
            title: test.fullName,
            messages: test.failureMessages
          });
        }
      });
    });
    failures.forEach(f => {
      console.log('');
      console.log('  FILE   : ' + f.file);
      console.log('  TEST   : ' + f.title);
      f.messages.forEach(m => {
        const lines = m.split('\n').slice(0, 15);
        lines.forEach(l => console.log('         ' + l));
      });
    });
  " 2>/dev/null || grep -E "(FAIL|PASS|●)" "${report_file}" | head -50 || true
}

count_failures_in_report() {
  local report_file="$1"
  if [[ ! -f "${report_file}" ]]; then
    echo "0"
    return
  fi
  node -e "
    const fs = require('fs');
    try {
      const report = JSON.parse(fs.readFileSync('${report_file}', 'utf8'));
      let count = 0;
      (report.testResults || []).forEach(suite => {
        (suite.testResults || []).forEach(test => {
          if (test.status === 'failed') count++;
        });
      });
      console.log(count);
    } catch(e) { console.log(0); }
  " 2>/dev/null || echo "0"
}

count_passes_in_report() {
  local report_file="$1"
  if [[ ! -f "${report_file}" ]]; then
    echo "0"
    return
  fi
  node -e "
    const fs = require('fs');
    try {
      const report = JSON.parse(fs.readFileSync('${report_file}', 'utf8'));
      let count = 0;
      (report.testResults || []).forEach(suite => {
        (suite.testResults || []).forEach(test => {
          if (test.status === 'passed') count++;
        });
      });
      console.log(count);
    } catch(e) { console.log(0); }
  " 2>/dev/null || echo "0"
}

get_failed_test_names() {
  local report_file="$1"
  if [[ ! -f "${report_file}" ]]; then
    return
  fi
  node -e "
    const fs = require('fs');
    try {
      const report = JSON.parse(fs.readFileSync('${report_file}', 'utf8'));
      (report.testResults || []).forEach(suite => {
        (suite.testResults || []).forEach(test => {
          if (test.status === 'failed') console.log(test.fullName);
        });
      });
    } catch(e) {}
  " 2>/dev/null || true
}

# ─── Pre-flight checks ───────────────────────────────────────
check_prerequisites() {
  echo -e "${YELLOW}Kiểm tra môi trường...${RESET}"

  local missing=0

  if ! command -v node &>/dev/null; then
    echo -e "${RED}  ✗ Node.js không tìm thấy${RESET}"
    missing=1
  else
    local node_ver
    node_ver="$(node --version)"
    echo -e "${GREEN}  ✓ Node.js ${node_ver}${RESET}"
  fi

  if ! command -v npm &>/dev/null; then
    echo -e "${RED}  ✗ npm không tìm thấy${RESET}"
    missing=1
  else
    echo -e "${GREEN}  ✓ npm $(npm --version)${RESET}"
  fi

  if [[ ! -d "${BACKEND_DIR}" ]]; then
    echo -e "${RED}  ✗ Thư mục backend không tồn tại: ${BACKEND_DIR}${RESET}"
    missing=1
  else
    echo -e "${GREEN}  ✓ Backend directory: ${BACKEND_DIR}${RESET}"
  fi

  if [[ ! -f "${BACKEND_DIR}/package.json" ]]; then
    echo -e "${RED}  ✗ backend/package.json không tồn tại${RESET}"
    missing=1
  else
    echo -e "${GREEN}  ✓ package.json tồn tại${RESET}"
  fi

  if $RUN_E2E; then
    if ! command -v docker &>/dev/null; then
      echo -e "${YELLOW}  ⚠ Docker không tìm thấy — e2e tests có thể fail${RESET}"
    else
      echo -e "${GREEN}  ✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${RESET}"
    fi
  fi

  if [[ $missing -eq 1 ]]; then
    echo -e "${RED}Pre-flight check thất bại. Vui lòng cài đặt các dependency còn thiếu.${RESET}"
    exit 1
  fi

  echo -e "${GREEN}Pre-flight OK${RESET}"
  echo ""
}

# ─── Cài dependencies nếu cần ────────────────────────────────
ensure_dependencies() {
  if [[ ! -d "${BACKEND_DIR}/node_modules" ]]; then
    echo -e "${YELLOW}node_modules không tồn tại — đang cài npm install...${RESET}"
    cd "${BACKEND_DIR}" && npm install --silent
    echo -e "${GREEN}npm install hoàn thành${RESET}"
  fi
}

# ─── Chạy Unit Tests ─────────────────────────────────────────
run_unit_tests() {
  local round="$1"
  local report_file="${REPORT_DIR}/unit-report-round${round}.json"
  local stdout_file="${REPORT_DIR}/unit-stdout-round${round}.txt"

  echo -e "${CYAN}▶ Chạy UNIT tests...${RESET}"
  log "INFO" "Round ${round}: Starting unit tests"

  local exit_code=0

  cd "${BACKEND_DIR}"
  timeout "${TIMEOUT_SECONDS}" npx jest \
    --testPathPattern="test/unit" \
    --json \
    --outputFile="${report_file}" \
    --forceExit \
    --no-coverage \
    --passWithNoTests \
    2>&1 | tee "${stdout_file}" || exit_code=$?

  local failures
  failures="$(count_failures_in_report "${report_file}")"
  local passes
  passes="$(count_passes_in_report "${report_file}")"

  if [[ "$exit_code" -eq 0 ]] || [[ "$failures" -eq 0 ]]; then
    echo -e "${GREEN}  ✓ Unit tests: ${passes} passed, 0 failed${RESET}"
    log "PASS" "Round ${round}: Unit tests — ${passes} passed"
    return 0
  else
    echo -e "${RED}  ✗ Unit tests: ${passes} passed, ${failures} FAILED${RESET}"
    log "FAIL" "Round ${round}: Unit tests — ${failures} failed"
    echo ""
    echo -e "${YELLOW}  Danh sách test FAIL:${RESET}"
    extract_failures_from_report "${report_file}"
    return 1
  fi
}

# ─── Chạy E2E Tests ──────────────────────────────────────────
run_e2e_tests() {
  local round="$1"
  local report_file="${REPORT_DIR}/e2e-report-round${round}.json"
  local stdout_file="${REPORT_DIR}/e2e-stdout-round${round}.txt"

  echo -e "${CYAN}▶ Chạy E2E tests...${RESET}"
  log "INFO" "Round ${round}: Starting e2e tests"

  local exit_code=0

  cd "${BACKEND_DIR}"
  timeout "${TIMEOUT_SECONDS}" npx jest \
    --testPathPattern="test/e2e" \
    --json \
    --outputFile="${report_file}" \
    --forceExit \
    --runInBand \
    --no-coverage \
    --passWithNoTests \
    2>&1 | tee "${stdout_file}" || exit_code=$?

  local failures
  failures="$(count_failures_in_report "${report_file}")"
  local passes
  passes="$(count_passes_in_report "${report_file}")"

  if [[ "$exit_code" -eq 0 ]] || [[ "$failures" -eq 0 ]]; then
    echo -e "${GREEN}  ✓ E2E tests: ${passes} passed, 0 failed${RESET}"
    log "PASS" "Round ${round}: E2E tests — ${passes} passed"
    return 0
  else
    echo -e "${RED}  ✗ E2E tests: ${passes} passed, ${failures} FAILED${RESET}"
    log "FAIL" "Round ${round}: E2E tests — ${failures} failed"
    echo ""
    echo -e "${YELLOW}  Danh sách test FAIL:${RESET}"
    extract_failures_from_report "${report_file}"
    return 1
  fi
}

# ─── So sánh failures giữa 2 vòng ───────────────────────────
compare_rounds() {
  local prev_round="$1"
  local curr_round="$2"
  local test_type="$3"   # "unit" hoặc "e2e"

  local prev_report="${REPORT_DIR}/${test_type}-report-round${prev_round}.json"
  local curr_report="${REPORT_DIR}/${test_type}-report-round${curr_round}.json"

  if [[ ! -f "${prev_report}" ]] || [[ ! -f "${curr_report}" ]]; then
    return
  fi

  local prev_failures=()
  local curr_failures=()

  while IFS= read -r line; do
    [[ -n "$line" ]] && prev_failures+=("$line")
  done < <(get_failed_test_names "${prev_report}")

  while IFS= read -r line; do
    [[ -n "$line" ]] && curr_failures+=("$line")
  done < <(get_failed_test_names "${curr_report}")

  # Tìm tests đã được fix (có trong prev nhưng không còn trong curr)
  local newly_fixed=()
  for test in "${prev_failures[@]:-}"; do
    local found=false
    for curr_test in "${curr_failures[@]:-}"; do
      if [[ "$test" == "$curr_test" ]]; then
        found=true
        break
      fi
    done
    if ! $found && [[ -n "$test" ]]; then
      newly_fixed+=("$test")
      FIXED_TESTS+=("$test")
    fi
  done

  if [[ ${#newly_fixed[@]} -gt 0 ]]; then
    echo -e "${GREEN}  Tests đã được fix trong vòng này:${RESET}"
    for t in "${newly_fixed[@]}"; do
      echo -e "${GREEN}    ✓ ${t}${RESET}"
      TOTAL_FAILURES_FIXED=$((TOTAL_FAILURES_FIXED + 1))
    done
  fi
}

# ─── Chờ developer fix ───────────────────────────────────────
wait_for_fix() {
  local round="$1"
  local unit_failed="$2"
  local e2e_failed="$3"

  echo ""
  echo -e "${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${YELLOW}${BOLD}║                  CẦN FIX CODE                           ║${RESET}"
  echo -e "${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "${YELLOW}Vòng ${round} có test fail.${RESET}"
  echo ""
  echo -e "  ${BOLD}RULE:${RESET}"
  echo -e "  1. Đọc error message ở trên"
  echo -e "  2. Tìm root cause trong source code"
  echo -e "  3. Fix CODE (không fix expected value trong test)"
  echo -e "  4. Lưu file và nhấn Enter để chạy lại"
  echo -e "  5. Nhấn Ctrl+C để dừng audit loop"
  echo ""

  if [[ "${CI:-false}" == "true" ]]; then
    echo -e "${RED}Đang chạy trong CI — thoát với lỗi (không có interactive prompt)${RESET}"
    log "ERROR" "CI mode: test failures detected, exiting"
    return 1
  fi

  echo -ne "${CYAN}Nhấn Enter để chạy lại (Ctrl+C để thoát)... ${RESET}"
  read -r || {
    echo ""
    echo -e "${YELLOW}Nhận Ctrl+C — dừng audit loop${RESET}"
    return 1
  }
  return 0
}

# ─── Print final summary ─────────────────────────────────────
print_final_summary() {
  local all_passed="$1"

  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}║                    AUDIT LOOP SUMMARY                       ║${RESET}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "  Số vòng đã chạy     : ${CURRENT_ITERATION}"
  echo -e "  Tests đã fix        : ${TOTAL_FAILURES_FIXED}"
  echo ""

  if [[ ${#FIXED_TESTS[@]} -gt 0 ]]; then
    echo -e "${GREEN}  Tests đã được fix:${RESET}"
    for t in "${FIXED_TESTS[@]}"; do
      echo -e "${GREEN}    ✓ ${t}${RESET}"
    done
    echo ""
  fi

  if $all_passed; then
    echo -e "${GREEN}${BOLD}  KẾT QUẢ: TẤT CẢ TEST ĐÃ XANH ✓${RESET}"
    echo -e "${GREEN}${BOLD}  Audit loop hoàn thành thành công.${RESET}"
    echo ""
    log "SUCCESS" "All tests passed after ${CURRENT_ITERATION} rounds. Fixed: ${TOTAL_FAILURES_FIXED}"
  else
    echo -e "${RED}${BOLD}  KẾT QUẢ: VẪN CÒN TEST FAIL ✗${RESET}"
    echo ""
    if [[ ${#STILL_FAILING[@]} -gt 0 ]]; then
      echo -e "${RED}  Tests vẫn còn fail:${RESET}"
      for t in "${STILL_FAILING[@]}"; do
        echo -e "${RED}    ✗ ${t}${RESET}"
      done
      echo ""
    fi
    echo -e "${RED}  Xem báo cáo chi tiết tại: ${REPORT_DIR}/${RESET}"
    log "FAIL" "Audit loop ended with failures after ${CURRENT_ITERATION} rounds"
  fi

  echo -e "  Log file: ${LOG_FILE}"
  echo -e "  Reports : ${REPORT_DIR}/"
  echo ""
}

# ─── Trap Ctrl+C ─────────────────────────────────────────────
interrupted=false
trap 'interrupted=true; echo ""; echo -e "${YELLOW}Nhận tín hiệu ngắt — đang dừng audit loop...${RESET}"' INT

# ─── MAIN ────────────────────────────────────────────────────
main() {
  print_banner
  check_prerequisites
  ensure_dependencies

  echo -e "${BOLD}Bắt đầu Audit Loop${RESET}"
  echo -e "  Chế độ   : $(if $RUN_UNIT && $RUN_E2E; then echo 'Unit + E2E'; elif $RUN_UNIT; then echo 'Unit only'; else echo 'E2E only'; fi)"
  echo -e "  Max vòng : ${MAX_ITERATIONS}"
  echo -e "  Timeout  : ${TIMEOUT_SECONDS}s / vòng"
  echo -e "  Log      : ${LOG_FILE}"
  echo -e "  Reports  : ${REPORT_DIR}/"
  echo ""

  local prev_unit_failures=0
  local prev_e2e_failures=0

  while [[ $CURRENT_ITERATION -lt $MAX_ITERATIONS ]]; do
    if $interrupted; then
      break
    fi

    CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
    print_round_header "${CURRENT_ITERATION}"
    log "INFO" "=== Round ${CURRENT_ITERATION} started ==="

    local unit_failed=false
    local e2e_failed=false

    # Chạy unit tests
    if $RUN_UNIT; then
      if ! run_unit_tests "${CURRENT_ITERATION}"; then
        unit_failed=true
      fi

      # So sánh với vòng trước
      if [[ $CURRENT_ITERATION -gt 1 ]]; then
        compare_rounds "$((CURRENT_ITERATION - 1))" "${CURRENT_ITERATION}" "unit"
      fi
    fi

    # Chạy e2e tests
    if $RUN_E2E; then
      if ! run_e2e_tests "${CURRENT_ITERATION}"; then
        e2e_failed=true
      fi

      # So sánh với vòng trước
      if [[ $CURRENT_ITERATION -gt 1 ]]; then
        compare_rounds "$((CURRENT_ITERATION - 1))" "${CURRENT_ITERATION}" "e2e"
      fi
    fi

    # Kiểm tra có fail không
    if ! $unit_failed && ! $e2e_failed; then
      echo ""
      echo -e "${GREEN}${BOLD}  ✓ TẤT CẢ TEST XANH — VÒNG ${CURRENT_ITERATION}${RESET}"
      print_final_summary true
      log "SUCCESS" "All tests passed at round ${CURRENT_ITERATION}"
      exit 0
    fi

    # Ghi remaining failures
    STILL_FAILING=()
    if $unit_failed; then
      local unit_report="${REPORT_DIR}/unit-report-round${CURRENT_ITERATION}.json"
      while IFS= read -r line; do
        [[ -n "$line" ]] && STILL_FAILING+=("[unit] ${line}")
      done < <(get_failed_test_names "${unit_report}")
    fi
    if $e2e_failed; then
      local e2e_report="${REPORT_DIR}/e2e-report-round${CURRENT_ITERATION}.json"
      while IFS= read -r line; do
        [[ -n "$line" ]] && STILL_FAILING+=("[e2e] ${line}")
      done < <(get_failed_test_names "${e2e_report}")
    fi

    log "FAIL" "Round ${CURRENT_ITERATION}: ${#STILL_FAILING[@]} tests still failing"

    # Nếu đang chạy trong CI → thoát ngay với lỗi
    if [[ "${CI:-false}" == "true" ]]; then
      echo -e "${RED}CI mode: test failures detected at round ${CURRENT_ITERATION}${RESET}"
      print_final_summary false
      exit 1
    fi

    # Max iterations reached?
    if [[ $CURRENT_ITERATION -ge $MAX_ITERATIONS ]]; then
      echo ""
      echo -e "${RED}Đã đạt tối đa ${MAX_ITERATIONS} vòng mà vẫn còn test fail.${RESET}"
      print_final_summary false
      exit 1
    fi

    # Chờ developer fix
    if ! wait_for_fix "${CURRENT_ITERATION}" "${unit_failed}" "${e2e_failed}"; then
      break
    fi
  done

  # Bị ngắt bởi Ctrl+C hoặc điều kiện thoát khác
  print_final_summary false

  # Thoát với lỗi nếu vẫn còn fail
  if [[ ${#STILL_FAILING[@]} -gt 0 ]]; then
    exit 1
  else
    exit 0
  fi
}

main "$@"
