/**
 * Gera favicons PNG (16 / 32 / apple-touch 180).
 *
 * - favicon-16 / favicon-32: só a **águia** — recorte horizontal à esquerda de `logo-febracis.png` + `trim` alpha.
 * - apple-touch-icon: **lockup completo** (águia + “Febracis”).
 *
 * **Fundo:** favicon **16/32 (aba)** — transparente por defeito (sem quadrado claro). Sólido opcional: `FAVICON_TAB_BG_HEX=#RRGGBB`.
 * **Apple-touch 180** — defeito `#FBF6EC`; override: `FAVICON_APPLE_BG_HEX` ou `FAVICON_BG_HEX`; transparente: `FAVICON_APPLE_TRANSPARENT=1`.
 * `FAVICON_TRANSPARENT=1` força a **aba** transparente e ignora `FAVICON_TAB_BG_HEX` (legado).
 *
 * favicon 16/32: águia com `sharp` cover 512×512 (preenche o quadrado; evita mancha minúscula com `contain`).
 * Filtro **sem** drop-shadow no raster da águia (nitidez a 16px). Apple-touch: variante leve com sombra dourada.
 *
 * Fallback: `public/images/logo-febracis-favicon.png` (sem filtro CSS).
 *
 * Manter em sync com `.sidebar__logo-image` em `src/styles/components/layout.css`
 *
 * Uso: npm run favicons
 * Requer: sharp, playwright (Chromium: npx playwright install chromium)
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public');
const defaultLogoPath = join(root, 'public', 'images', 'logo-febracis.png');
const optionalGoldPath = join(root, 'public', 'images', 'logo-febracis-favicon.png');

/** Fundo do raster do apple-touch quando não há override de env. */
const DEFAULT_APPLE_BG_HEX = '#FBF6EC';

/** Ver `.sidebar__logo-image` em `layout.css`. */

/** Só cor (sem sombra) — raster da águia 16/32 para nitidez máxima. */
const FAVICON_LOGO_FILTER_FLAT = [
  'brightness(0) saturate(100%)',
  'invert(79%) sepia(49%) saturate(624%) hue-rotate(354deg)',
  'brightness(104%) contrast(99%)',
].join(' ');

/** Apple-touch / lockup: variante leve com sombra dourada (sem sombra escura da sidebar). */
const FAVICON_LOGO_FILTER_LIGHT = [
  'brightness(0) saturate(100%)',
  'invert(79%) sepia(49%) saturate(624%) hue-rotate(354deg)',
  'brightness(104%) contrast(99%)',
  'drop-shadow(0 0 12px rgba(240, 183, 62, 0.24))',
].join(' ');

const RASTER_SIZE = 512;

/** Recorte horizontal da águia (percentagem da largura do PNG original). Afinar se a marca mudar. */
const FAVICON_EAGLE_LEFT_PCT = 0;
/** Afinado para não incluir o início do wordmark no ícone da aba (ex.: “FEB”). */
const FAVICON_EAGLE_WIDTH_PCT = 40;

/** Recorte vertical opcional (percentagem da altura do PNG original). Afinar para bbox mais quadrado. */
const FAVICON_EAGLE_TOP_PCT = 0;
const FAVICON_EAGLE_HEIGHT_PCT = 100;

/** Lockup completo no #mark (apple-touch). */
const FAVICON_FULL_IMG_MAX_WIDTH_PCT = 98;
const FAVICON_FULL_IMG_MAX_HEIGHT_PCT = 92;

/** Só águia: após `cover` 512 o bitmap já preenche o canvas; manter 100% no #mark. */
const FAVICON_EAGLE_IMG_MAX_WIDTH_PCT = 100;
const FAVICON_EAGLE_IMG_MAX_HEIGHT_PCT = 100;

/**
 * Zona esquerda do lockup (águia) + trim ao contorno do desenho.
 *
 * @param {Buffer} inputBuf
 * @returns {Promise<Buffer>}
 */
async function extractEagleMarkPng(inputBuf) {
  const meta = await sharp(inputBuf).metadata();
  if (meta.width === undefined || meta.height === undefined) {
    throw new Error('Metadados de imagem em falta (largura/altura).');
  }
  const w = meta.width;
  const h = meta.height;
  const left = Math.round((FAVICON_EAGLE_LEFT_PCT / 100) * w);
  const extractWidth = Math.min(
    Math.round((FAVICON_EAGLE_WIDTH_PCT / 100) * w),
    w - left,
  );
  const top = Math.round((FAVICON_EAGLE_TOP_PCT / 100) * h);
  const extractHeight = Math.min(
    Math.round((FAVICON_EAGLE_HEIGHT_PCT / 100) * h),
    h - top,
  );
  /** Dois passos: `extract`+`trim` na mesma chain falha neste sharp/libvips (“bad extract area”). */
  const cropped = await sharp(inputBuf)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .png()
    .toBuffer();
  return sharp(cropped).trim().png().toBuffer();
}

/**
 * Preenche o quadrado 512×512 (equivalente a `object-fit: cover`) para a águia não ficar minúscula no downscale.
 *
 * @param {Buffer} trimmedEagleBuf
 * @returns {Promise<Buffer>}
 */
async function prepareEagleForFaviconRaster(trimmedEagleBuf) {
  return sharp(trimmedEagleBuf)
    .resize(RASTER_SIZE, RASTER_SIZE, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
}

/**
 * @param {string | undefined} raw
 * @returns {string | null} hex #RRGGBB ou null
 */
function parseSolidBgHex(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }
  const s = String(raw).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s;
  }
  return null;
}

/**
 * Fundo do raster da **águia** (favicon-16 / favicon-32): por defeito **transparente**.
 * `FAVICON_TRANSPARENT=1` força transparente e ignora `FAVICON_TAB_BG_HEX`.
 * @returns {string | null} hex ou null (transparente)
 */
function resolveTabBackgroundHex() {
  if (process.env.FAVICON_TRANSPARENT === '1') {
    if (process.env.FAVICON_TAB_BG_HEX !== undefined && String(process.env.FAVICON_TAB_BG_HEX).trim() !== '') {
      console.warn('FAVICON_TRANSPARENT=1: FAVICON_TAB_BG_HEX ignorado (aba transparente).');
    }
    return null;
  }
  const raw = process.env.FAVICON_TAB_BG_HEX;
  if (raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const parsed = parseSolidBgHex(raw);
  if (parsed !== null) {
    return parsed;
  }
  console.warn('FAVICON_TAB_BG_HEX inválido (use #RRGGBB). A usar fundo transparente na aba.');
  return null;
}

/**
 * Fundo do **apple-touch-icon** (180): por defeito `#FBF6EC`.
 * Prioridade: `FAVICON_APPLE_BG_HEX` → `FAVICON_BG_HEX` → defeito.
 * `FAVICON_APPLE_TRANSPARENT=1` → transparente.
 * @returns {string | null} hex ou null
 */
function resolveAppleBackgroundHex() {
  if (process.env.FAVICON_APPLE_TRANSPARENT === '1') {
    const apple = process.env.FAVICON_APPLE_BG_HEX;
    const legacy = process.env.FAVICON_BG_HEX;
    if (
      (apple !== undefined && String(apple).trim() !== '') ||
      (legacy !== undefined && String(legacy).trim() !== '')
    ) {
      console.warn(
        'FAVICON_APPLE_TRANSPARENT=1: FAVICON_APPLE_BG_HEX / FAVICON_BG_HEX ignorados (apple-touch transparente).',
      );
    }
    return null;
  }
  const rawApple = process.env.FAVICON_APPLE_BG_HEX;
  const rawLegacy = process.env.FAVICON_BG_HEX;
  const raw =
    rawApple !== undefined && String(rawApple).trim() !== ''
      ? rawApple
      : rawLegacy !== undefined && String(rawLegacy).trim() !== ''
        ? rawLegacy
        : undefined;
  if (raw === undefined || String(raw).trim() === '') {
    return DEFAULT_APPLE_BG_HEX;
  }
  const parsed = parseSolidBgHex(raw);
  if (parsed !== null) {
    return parsed;
  }
  console.warn(
    `FAVICON_APPLE_BG_HEX / FAVICON_BG_HEX inválido (use #RRGGBB). A usar defeito ${DEFAULT_APPLE_BG_HEX}.`,
  );
  return DEFAULT_APPLE_BG_HEX;
}

/**
 * @param {string} imageDataUrl
 * @param {boolean} applyCssFilter
 * @param {string | null} solidBgHex
 * @param {{ imgMaxWidthPct: number; imgMaxHeightPct: number; filterCss: string }} layout
 */
function buildMarkupPage(imageDataUrl, applyCssFilter, solidBgHex, layout) {
  const imgFilter = applyCssFilter ? layout.filterCss : 'none';
  const bg = solidBgHex === null ? 'transparent' : solidBgHex;
  const mw = layout.imgMaxWidthPct;
  const mh = layout.imgMaxHeightPct;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; box-sizing: border-box; }
    body {
      background: ${bg};
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    #mark {
      width: ${RASTER_SIZE}px;
      height: ${RASTER_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
    }
    #mark img {
      max-width: ${mw}%;
      max-height: ${mh}%;
      width: auto;
      height: auto;
      object-fit: contain;
      opacity: 0.98;
      filter: ${imgFilter};
    }
  </style>
</head>
<body>
  <div id="mark"><img src="${imageDataUrl}" alt="" /></div>
</body>
</html>`;
}

/**
 * @param {Buffer} buf
 * @param {boolean} applyCssFilter
 * @param {string | null} solidBgHex
 * @param {{ imgMaxWidthPct: number; imgMaxHeightPct: number; filterCss: string }} layout
 * @returns {Promise<Buffer>}
 */
async function rasterizeMarkPngFromBuffer(buf, applyCssFilter, solidBgHex, layout) {
  const b64 = buf.toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;
  const html = buildMarkupPage(dataUrl, applyCssFilter, solidBgHex, layout);

  const omitBackground = solidBgHex === null;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 800, height: 800 },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    const locator = page.locator('#mark');
    return await locator.screenshot({
      type: 'png',
      omitBackground,
    });
  } finally {
    await browser.close();
  }
}

/**
 * @param {Buffer} raster512
 * @param {number} size
 * @param {string} fileName
 */
async function writeIconFromRaster(raster512, size, fileName) {
  await sharp(raster512)
    .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(join(outDir, fileName));
}

async function main() {
  if (!existsSync(defaultLogoPath)) {
    throw new Error(`Ficheiro em falta: ${defaultLogoPath}`);
  }

  const tabBgHex = resolveTabBackgroundHex();
  const appleBgHex = resolveAppleBackgroundHex();

  const useOptionalGold = existsSync(optionalGoldPath);
  const sourcePath = useOptionalGold ? optionalGoldPath : defaultLogoPath;
  const applyCssFilter = !useOptionalGold;

  const sourceBuf = readFileSync(sourcePath);
  const eagleTrimmed = await extractEagleMarkPng(sourceBuf);
  const eagleBuf = await prepareEagleForFaviconRaster(eagleTrimmed);

  const filterCssEagle = applyCssFilter ? FAVICON_LOGO_FILTER_FLAT : 'none';
  const filterCssFull = applyCssFilter ? FAVICON_LOGO_FILTER_LIGHT : 'none';

  const layoutEagle = {
    imgMaxWidthPct: FAVICON_EAGLE_IMG_MAX_WIDTH_PCT,
    imgMaxHeightPct: FAVICON_EAGLE_IMG_MAX_HEIGHT_PCT,
    filterCss: filterCssEagle,
  };

  const layoutFull = {
    imgMaxWidthPct: FAVICON_FULL_IMG_MAX_WIDTH_PCT,
    imgMaxHeightPct: FAVICON_FULL_IMG_MAX_HEIGHT_PCT,
    filterCss: filterCssFull,
  };

  if (useOptionalGold) {
    console.log('Usando logo-febracis-favicon.png (marca dourada, sem filtro CSS).');
  } else {
    console.log('Raster: águia com filtro plano (sem drop-shadow); lockup com variante leve (Playwright).');
  }

  if (tabBgHex !== null) {
    console.log(`Aba (16/32): fundo sólido ${tabBgHex} (FAVICON_TAB_BG_HEX).`);
  } else {
    console.log('Aba (16/32): fundo transparente (defeito ou FAVICON_TRANSPARENT=1).');
  }
  if (appleBgHex !== null) {
    const src =
      process.env.FAVICON_APPLE_BG_HEX !== undefined &&
      String(process.env.FAVICON_APPLE_BG_HEX).trim() !== ''
        ? 'FAVICON_APPLE_BG_HEX'
        : process.env.FAVICON_BG_HEX !== undefined && String(process.env.FAVICON_BG_HEX).trim() !== ''
          ? 'FAVICON_BG_HEX'
          : 'defeito';
    console.log(`Apple-touch (180): fundo sólido ${appleBgHex} (${src}).`);
  } else {
    console.log('Apple-touch (180): fundo transparente (FAVICON_APPLE_TRANSPARENT=1).');
  }

  console.log(
    `favicon-16/32: águia (recorte ${FAVICON_EAGLE_WIDTH_PCT}%×${FAVICON_EAGLE_HEIGHT_PCT}% + trim + cover ${RASTER_SIZE}); apple-touch: lockup completo.`,
  );

  const rasterSmall = await rasterizeMarkPngFromBuffer(eagleBuf, applyCssFilter, tabBgHex, layoutEagle);
  const rasterApple = await rasterizeMarkPngFromBuffer(sourceBuf, applyCssFilter, appleBgHex, layoutFull);

  await writeIconFromRaster(rasterSmall, 16, 'favicon-16.png');
  await writeIconFromRaster(rasterSmall, 32, 'favicon-32.png');
  await writeIconFromRaster(rasterApple, 180, 'apple-touch-icon.png');

  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
