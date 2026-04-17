/**
 * record-portal-demo.mjs
 * Tự động thao tác toàn bộ tính năng portal và xuất video demo.
 * Output: /Volumes/Data/GalaxyHolding/HDBankConnect/portal-demo.webm
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ROOT = '/Volumes/Data/GalaxyHolding/HDBankConnect';
const BASE_URL = 'http://localhost:5173';
const VIDEO_DIR = path.join(ROOT, '_video_tmp');
const OUT_FILE = path.join(ROOT, 'portal-demo.webm');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pause(ms = 400) { await sleep(ms); }

const SUFFIX = Date.now().toString().slice(-6);

async function typeSlowly(page, selector, text, opts = {}) {
  await page.fill(selector, '');
  await page.type(selector, text, { delay: 45, ...opts });
}

// Click sidebar link, then race: API response for target endpoint OR first row.
// API-based wait unblocks the tab switch the moment the real data arrives.
// Wait for sonner toast to appear and auto-dismiss, then caller can proceed
async function waitToastDismiss(page, maxMs = 4500) {
  const toast = page.locator('[data-sonner-toast]').first();
  await toast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  await toast.waitFor({ state: 'hidden', timeout: maxMs }).catch(() => {});
}

async function gotoTab(page, linkSelector, urlFallback) {
  const link = page.locator(linkSelector).first();
  const found = await link.count().catch(() => 0);
  if (found > 0) {
    await link.click({ timeout: 3000 }).catch(async () => {
      await page.goto(urlFallback, { waitUntil: 'domcontentloaded' });
    });
  } else {
    await page.goto(urlFallback, { waitUntil: 'domcontentloaded' });
  }
  await pause(500);
}

(async () => {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  console.log('🎬 Bắt đầu quay video portal demo...\n');

  // ═══ LOGIN ═══
  console.log('1️⃣  Trang Login');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await pause(700);
  await typeSlowly(page, 'input[type="email"]', 'admin@smartattendance.vn');
  await pause(400);
  await typeSlowly(page, 'input[type="password"]', 'SuperAdmin@2025!');
  await pause(600);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  await pause(800);

  // ═══ DASHBOARD ═══
  console.log('2️⃣  Dashboard');
  await pause(1200);
  await page.mouse.wheel(0, 400);
  await pause(800);
  await page.mouse.wheel(0, 400);
  await pause(1000);
  await page.mouse.wheel(0, -800);
  await pause(600);

  // ═══ CHI NHÁNH ═══
  console.log('3️⃣  Quản lý Chi nhánh');
  await gotoTab(page, 'a[href*="branch"], a:has-text("Chi nhánh")', `${BASE_URL}/branches`, /\/branches\?/);
  await pause(600);
  await page.getByRole('button', { name: 'Tạo mới' }).first().click();
  await pause(900);
  await typeSlowly(page, '#code', `Q1-${SUFFIX}`);
  await pause(200);
  await typeSlowly(page, '#name', `HDBank Chi nhánh Demo ${SUFFIX}`);
  await pause(200);
  await typeSlowly(page, '#address', '123 Nguyễn Huệ, Quận 1, TP.HCM');
  await pause(300);
  await page.fill('#latitude', '10.776900');
  await pause(300);
  await page.fill('#longitude', '106.700900');
  await pause(300);
  const bssidInput = page.locator('input[placeholder="AA:BB:CC:DD:EE:FF"]').first();
  if (await bssidInput.count() > 0) await bssidInput.fill('AA:BB:CC:DD:EE:FF');
  await pause(500);
  await page.mouse.wheel(0, 400);
  await pause(600);
  await page.getByRole('button', { name: 'Tạo chi nhánh' }).click();
  await waitToastDismiss(page);
  console.log(`   ✓ Tạo chi nhánh Q1-${SUFFIX}`);

  // ═══ CA LÀM VIỆC ═══
  console.log('4️⃣  Quản lý Ca làm việc');
  await gotoTab(page, 'a[href*="schedule"], a:has-text("Ca làm"), a:has-text("Lịch")', `${BASE_URL}/schedules`, /\/schedules/);
  await pause(600);
  await page.getByRole('button', { name: 'Tạo lịch ca' }).first().click();
  await pause(900);
  const matchedValue = await page.evaluate((suf) => {
    const sel = document.querySelector('#branch_select');
    if (!sel) return null;
    const opt = Array.from(sel.options).find(o => o.textContent?.includes(suf));
    return opt?.value ?? null;
  }, SUFFIX);
  if (matchedValue) await page.selectOption('#branch_select', matchedValue);
  else await page.selectOption('#branch_select', { index: 1 });
  await pause(500);
  await page.fill('#checkin_time', '08:00');
  await pause(300);
  await page.fill('#checkout_time', '17:30');
  await pause(300);
  await page.fill('#window_minutes', '15');
  await pause(400);
  for (const d of ['T2', 'T3', 'T4', 'T5', 'T6']) {
    const btn = page.getByRole('button', { name: d, exact: true }).first();
    if (await btn.count() > 0) {
      const pressed = await btn.getAttribute('aria-pressed');
      if (pressed !== 'true') await btn.click();
      await pause(150);
    }
  }
  await pause(600);
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await waitToastDismiss(page);
  console.log('   ✓ Tạo lịch ca 08:00 – 17:30 (T2–T6)');

  // ═══ NHÂN VIÊN ═══
  console.log('5️⃣  Quản lý Nhân viên');
  await gotoTab(page, 'a[href*="employee"], a:has-text("Nhân viên")', `${BASE_URL}/employees`, /\/employees\?/);
  await pause(600);
  await page.getByRole('button', { name: 'Tạo nhân viên' }).first().click();
  await pause(900);
  await page.fill('#emp-code', `NV${SUFFIX}`);
  await pause(250);
  await page.fill('#emp-phone', '0901234567');
  await pause(250);
  await page.fill('#emp-name', 'Nguyễn Văn Demo');
  await pause(250);
  await page.fill('#emp-email', `demo${SUFFIX}@hdbank.vn`);
  await pause(300);
  await page.selectOption('#emp-role', 'employee').catch(() => {});
  await pause(350);
  await page.selectOption('#emp-branch', { index: 1 }).catch(() => {});
  await pause(300);
  await page.fill('#emp-password', 'Demo@2025!');
  await pause(600);
  await page.getByRole('button', { name: 'Tạo nhân viên', exact: true }).last().click();
  await waitToastDismiss(page);
  console.log(`   ✓ Tạo nhân viên NV${SUFFIX}`);

  // ═══ ATTENDANCE ═══
  console.log('6️⃣  Chấm công Attendance');
  await gotoTab(page, 'a[href*="attendance"], a:has-text("Chấm công")', `${BASE_URL}/attendance`, /\/attendance\?/);
  await pause(600);
  await page.mouse.wheel(0, 300);
  await pause(700);
  await page.mouse.wheel(0, -300);
  await pause(500);
  const exportBtn = page.getByRole('button', { name: /Xuất CSV/i }).first();
  if (await exportBtn.count() > 0) {
    await exportBtn.scrollIntoViewIfNeeded();
    await pause(400);
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        exportBtn.click(),
      ]);
      const csvPath = path.join(ROOT, `attendance-export-${SUFFIX}.csv`);
      await download.saveAs(csvPath);
      const size = fs.statSync(csvPath).size;
      console.log(`   ✓ Xuất CSV: ${csvPath} (${size} bytes)`);
      await pause(1200);
    } catch (err) {
      console.log('   ⚠ Export CSV timeout:', err.message);
    }
  }

  // ═══ FRAUD ═══
  console.log('6️⃣ ½ Phát hiện gian lận');
  await gotoTab(page, 'a[href*="fraud"], a:has-text("Gian lận"), a:has-text("Phát hiện")', `${BASE_URL}/fraud`, /\/fraud/);
  await pause(700);
  // Lướt danh sách fraud logs
  await page.mouse.wheel(0, 400);
  await pause(900);
  await page.mouse.wheel(0, -400);
  await pause(600);

  // ── Click row đầu → mở modal, xem chi tiết đầy đủ & tương tác ──
  // Chọn row có snapshot đầy đủ (mock_location / device_mismatch / schedule_window)
  const richRow = page.locator('tr[role="button"]', { hasText: /mock_location|device_mismatch|schedule_window/ }).first();
  const firstFraudRow = (await richRow.count()) > 0 ? richRow : page.locator('tr[role="button"]').first();
  await firstFraudRow.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await firstFraudRow.count() > 0) {
    await firstFraudRow.click();
    await pause(1400); // header + severity badge + employee/time grid
    const modal = page.locator('[role="dialog"], [aria-labelledby="fraud-modal-title"]').first();
    if (await modal.count() > 0) await modal.hover();

    // Hover lên severity badge để nhấn mạnh mức độ
    const severityBadge = page.locator('[role="dialog"] >> text=/critical|high|medium|low/i').first();
    if (await severityBadge.count() > 0) {
      await severityBadge.hover().catch(() => {});
      await pause(900);
    }

    // Scroll xuống "Thông tin thiết bị" — hover vào dòng VPN/mock (màu đỏ)
    await page.mouse.wheel(0, 220);
    await pause(1600);
    const vpnRow = page.locator('[role="dialog"] >> text=/is_vpn_active|is_mock_location/').first();
    if (await vpnRow.count() > 0) {
      await vpnRow.hover().catch(() => {});
      await pause(1200);
    }

    // Scroll tiếp "Thông tin vị trí" + GPS accuracy
    await page.mouse.wheel(0, 250);
    await pause(1800);

    // Scroll xem IP Address
    await page.mouse.wheel(0, 200);
    await pause(1500);

    // Click vào textarea "Ghi chú xử lý" và gõ note
    const noteArea = page.locator('#resolution-note');
    if (await noteArea.count() > 0) {
      await noteArea.scrollIntoViewIfNeeded();
      await pause(500);
      await noteArea.click();
      await pause(300);
      await noteArea.type('Xác minh: VPN + mock GPS — block thiết bị, yêu cầu NV đăng ký lại.', { delay: 35 });
      await pause(1200);
    }

    // Hover nút "Xác nhận đã xử lý" để show action khả dụng (không click — tránh mutate)
    const resolveBtn = page.getByRole('button', { name: /Xác nhận đã xử lý/i }).first();
    if (await resolveBtn.count() > 0) {
      await resolveBtn.hover().catch(() => {});
      await pause(1200);
    }

    // Đóng modal
    const closeBtn = page.getByRole('button', { name: /^Đóng$/ }).first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await pause(600);

    // Mở row severity khác để show variety
    const secondRow = page.locator('tr[role="button"]').nth(2);
    if (await secondRow.count() > 0) {
      await secondRow.click();
      await pause(1200);
      await page.mouse.wheel(0, 300);
      await pause(1200);
      await page.mouse.wheel(0, 300);
      await pause(1200);
      const closeBtn2 = page.getByRole('button', { name: /^Đóng$/ }).first();
      if (await closeBtn2.count() > 0) await closeBtn2.click();
      else await page.keyboard.press('Escape');
      await pause(500);
    }
    console.log('   ✓ Mở fraud detail modal — severity, device (VPN), location, IP, note');
  }

  console.log('\n⏹  Dừng quay, xuất video...');
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (videoPath && fs.existsSync(videoPath)) {
    fs.copyFileSync(videoPath, OUT_FILE);
    fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
    const size = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Video đã xuất: ${OUT_FILE}`);
    console.log(`   Kích thước: ${size} MB`);
  } else {
    console.error('❌ Không tìm thấy file video.');
    process.exit(1);
  }
})();
