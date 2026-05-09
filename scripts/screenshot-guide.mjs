/**
 * Capturas da Guia (/app/guide) para pitch e documentação interna.
 *
 * Requisitos:
 * - Servidor Vite acessível (recomendado: `VITE_APP_MODE=demo npm run dev -- --host 127.0.0.1 --port 5173`)
 * - Variáveis `E2E_DRE_EMAIL` e `E2E_DRE_PASSWORD` (mesmo padrão dos smoke E2E)
 *
 * Uso:
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npm run screenshot:guide
 *
 * Gera PNGs em public/screenshots/guide/ (viewport 1920×1080 + lote tema claro com sufixo -light).
 */

import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'screenshots', 'guide');

const THEME_STORAGE_KEY = 'febracis.theme';
const TOUR_SESSION_KEY = 'febracis.tour.startedThisSession';

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const EMAIL = process.env.E2E_DRE_EMAIL?.trim();
const PASSWORD = process.env.E2E_DRE_PASSWORD?.trim();

const SHOTS = [
  ['guide-01', 'guide-01-hero.png'],
  ['guide-02', 'guide-02-flow-diagram.png'],
  ['guide-03', 'guide-03-trilha-3-passos.png'],
  ['guide-04', 'guide-04-pilares.png'],
  ['guide-05', 'guide-05-matriz-rbac.png'],
  ['guide-06', 'guide-06-jornadas.png'],
  ['guide-07', 'guide-07-roteiro-demo.png'],
];

async function serverResponds() {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6000);
    const res = await fetch(BASE_URL, { method: 'GET', signal: ac.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

function stripShepherd(page) {
  return page.evaluate(() => {
    document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container').forEach((el) => {
      el.remove();
    });
  });
}

async function loginAndOpenGuide(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByTestId('login-email').fill(EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/app\//, { timeout: 60_000 });
  await page.goto(`${BASE_URL}/app/guide`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-screenshot-id="guide-10"]').waitFor({ state: 'visible', timeout: 90_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await stripShepherd(page);
}

/**
 * @param {'dark' | 'light'} themeMode
 * @param {string} fileSuffix e.g. "" or "-light"
 */
async function captureBatch(themeMode, fileSuffix) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.addInitScript(
    ({ themeKey, tourKey, theme }) => {
      localStorage.setItem(themeKey, theme);
      sessionStorage.setItem(tourKey, '1');
    },
    { themeKey: THEME_STORAGE_KEY, tourKey: TOUR_SESSION_KEY, theme: themeMode },
  );

  await loginAndOpenGuide(page);

  for (const [id, filename] of SHOTS) {
    const loc = page.locator(`[data-screenshot-id="${id}"]`).first();
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const outPath = join(OUT_DIR, filename.replace('.png', `${fileSuffix}.png`));
    await loc.screenshot({ path: outPath });
  }

  await page.getByRole('tab', { name: /Visão de negócio/i }).click();
  await page.waitForTimeout(250);
  const loc8 = page.locator('[data-screenshot-id="guide-08"]').first();
  await loc8.scrollIntoViewIfNeeded();
  await loc8.screenshot({ path: join(OUT_DIR, `guide-08-formulas-visao-negocio${fileSuffix}.png`) });

  await page.getByRole('tab', { name: /Detalhe técnico/i }).click();
  await page.waitForTimeout(250);
  const loc9 = page.locator('[data-screenshot-id="guide-09"]').first();
  await loc9.scrollIntoViewIfNeeded();
  await loc9.screenshot({ path: join(OUT_DIR, `guide-09-formulas-detalhe-tecnico${fileSuffix}.png`) });

  const loc10 = page.locator('[data-screenshot-id="guide-10"]').first();
  await loc10.scrollIntoViewIfNeeded();
  await loc10.screenshot({ path: join(OUT_DIR, `guide-10-cta-final${fileSuffix}.png`) });

  await page.getByRole('tab', { name: /Visão de negócio/i }).click().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(OUT_DIR, `guide-full-page${fileSuffix}.png`),
    fullPage: true,
  });

  await browser.close();
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Defina E2E_DRE_EMAIL e E2E_DRE_PASSWORD (utilizador de teste com acesso ao /app/guide).');
    process.exit(1);
  }

  const alive = await serverResponds();
  if (!alive) {
    console.error(
      `Não foi possível contactar ${BASE_URL}. Inicie o Vite (recomenda-se VITE_APP_MODE=demo) e tente de novo.`,
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  await captureBatch('dark', '');
  await captureBatch('light', '-light');

  console.log(`Capturas gravadas em ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
