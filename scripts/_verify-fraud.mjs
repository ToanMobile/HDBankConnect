import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

page.on('console', m => console.log('[browser]', m.type(), m.text().slice(0, 200)));
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('http://localhost:5173/login');
await page.fill('input[type="email"]', 'admin@smartattendance.vn');
await page.fill('input[type="password"]', 'SuperAdmin@2025!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);

await page.goto('http://localhost:5173/fraud');
await page.waitForTimeout(1500);
console.log('rows:', await page.locator('tr[role="button"]').count());
console.log('URL before click:', page.url());

const rich = page.locator('tr[role="button"]', { hasText: /mock_location|device_mismatch|schedule_window/ }).first();
const row = (await rich.count()) > 0 ? rich : page.locator('tr[role="button"]').first();
await row.waitFor({ state: 'visible', timeout: 5000 });
await row.click();
await page.waitForTimeout(800);

console.log('URL after click:', page.url());
console.log('dialog count:', await page.locator('[role="dialog"]').count());
console.log('body html size:', (await page.locator('body').innerHTML()).length);
console.log('#root children:', await page.locator('#root > *').count());

await page.screenshot({ path: '/tmp/v2_modal.png', fullPage: false });
await browser.close();
