/**
 * Gera favicons PNG (16 / 32 / apple-touch 180).
 *
 * - favicon-16 / favicon-32: só a **águia** — recorte horizontal à esquerda de `logo-febracis.png` + `trim` alpha.
 * - apple-touch-icon: **lockup completo** (águia + “Febracis”).
 *
 * **Fundo por defeito: transparente** (sem quadrado claro na aba). Fundo sólido opcional: `FAVICON_BG_HEX=#RRGGBB`.
 *
 * Filtro dourado alinhado à sidebar (variante leve no raster para menos halo em fundo transparente).
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

/** Ver `.sidebar__logo-image` em `layout.css` — o raster usa variante leve (`FAVICON_LOGO_FILTER_LIGHT`). */

/** Variante leve do filtro da sidebar: sem sombra escura (menos halo em fundo transparente). */
const FAVICON_LOGO_FILTER_LIGHT = [
  'brightness(0) saturate(100%)',
  'invert(79%) sepia(49%) saturate(624%) hue-rotate(354deg)',
  'brightness(104%) contrast(99%)',
  'drop-shadow(0 0 12px rgba(240, 183, 62, 0.24))',
].join(' ');

const RASTER_SIZE = 512;

/** Recorte horizontal da águia (percentagem da largura do PNG original). Afinar se a marca mudar. */
const FAVICON_EAGLE_LEFT_PCT = 0;
const FAVICON_EAGLE_WIDTH_PCT = 46;

/** Lockup completo no #mark (apple-touch). */
const FAVICON_FULL_IMG_MAX_WIDTH_PCT = 98;
const FAVICON_FULL_IMG_MAX_HEIGHT_PCT = 92;

/** Só águia: preencher o canvas após trim. */
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
  /** Dois passos: `extract`+`trim` na mesma chain falha neste sharp/libvips (“bad extract area”). */
  const cropped = await sharp(inputBuf)
    .extract({ left, top: 0, width: extractWidth, height: h })
    .png()
    .toBuffer();
  return sharp(cropped).trim().png().toBuffer();
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
 * Fundo sólido só com `FAVICON_BG_HEX` válido; caso contrário transparente.
 * @returns {string | null} hex ou null
 */
function resolveSolidBackgroundHex() {
  const raw = process.env.FAVICON_BG_HEX;
  if (raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const parsed = parseSolidBgHex(raw);
  if (parsed !== null) {
    return parsed;
  }
  console.warn('FAVICON_BG_HEX inválido (use #RRGGBB). A usar fundo transparente.');
  return null;
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

  const solidBgHex = resolveSolidBackgroundHex();

  const useOptionalGold = existsSync(optionalGoldPath);
  const sourcePath = useOptionalGold ? optionalGoldPath : defaultLogoPath;
  const applyCssFilter = !useOptionalGold;

  const sourceBuf = readFileSync(sourcePath);
  const eagleBuf = await extractEagleMarkPng(sourceBuf);

  const filterCssRaster = applyCssFilter ? FAVICON_LOGO_FILTER_LIGHT : 'none';

  const layoutEagle = {
    imgMaxWidthPct: FAVICON_EAGLE_IMG_MAX_WIDTH_PCT,
    imgMaxHeightPct: FAVICON_EAGLE_IMG_MAX_HEIGHT_PCT,
    filterCss: filterCssRaster,
  };

  const layoutFull = {
    imgMaxWidthPct: FAVICON_FULL_IMG_MAX_WIDTH_PCT,
    imgMaxHeightPct: FAVICON_FULL_IMG_MAX_HEIGHT_PCT,
    filterCss: filterCssRaster,
  };

  if (useOptionalGold) {
    console.log('Usando logo-febracis-favicon.png (marca dourada, sem filtro CSS).');
  } else {
    console.log('Raster com filtro da sidebar (variante leve; Playwright + Chromium).');
  }

  if (solidBgHex !== null) {
    console.log(`Fundo sólido: ${solidBgHex} (FAVICON_BG_HEX).`);
  } else {
    console.log('Fundo transparente (ícone assenta na aba do browser).');
  }

  console.log(
    `favicon-16/32: águia (recorte ${FAVICON_EAGLE_WIDTH_PCT}% largura + trim); apple-touch: lockup completo.`,
  );

  const rasterSmall = await rasterizeMarkPngFromBuffer(eagleBuf, applyCssFilter, solidBgHex, layoutEagle);
  const rasterApple = await rasterizeMarkPngFromBuffer(sourceBuf, applyCssFilter, solidBgHex, layoutFull);

  await writeIconFromRaster(rasterSmall, 16, 'favicon-16.png');
  await writeIconFromRaster(rasterSmall, 32, 'favicon-32.png');
  await writeIconFromRaster(rasterApple, 180, 'apple-touch-icon.png');

  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
