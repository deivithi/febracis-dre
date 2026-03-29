/**
 * Gera favicons PNG (16 / 32 / apple-touch 180) com o lockup Febracis (águia + texto).
 *
 * O filtro de cor dourada replica `.sidebar__logo-image` em layout.css.
 * - favicon-16 / favicon-32: recorte quadrado à esquerda do PNG (mais área útil num ícone pequeno).
 * - apple-touch-icon: lockup completo (melhor leitura do nome em 180×180).
 *
 * Fundo: por defeito **sólido claro** `#FBF6EC` (bom contraste com dourado em abas escuras).
 * Transparente: `FAVICON_TRANSPARENT=1`. Cor custom: `FAVICON_BG_HEX=#RRGGBB`.
 *
 * Fallback: se existir `public/images/logo-febracis-favicon.png`, usa-se sem filtro CSS.
 *
 * Manter em sync com .sidebar__logo-image em src/styles/components/layout.css
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

/** Mesmo filtro que `.sidebar__logo-image` (layout.css) — não alterar sem atualizar o CSS. */
const SIDEBAR_LOGO_FILTER = [
  'brightness(0) saturate(100%)',
  'invert(79%) sepia(49%) saturate(624%) hue-rotate(354deg)',
  'brightness(104%) contrast(99%)',
  'drop-shadow(0 0 12px rgba(240, 183, 62, 0.24))',
  'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.2))',
].join(' ');

const RASTER_SIZE = 512;

/** Fundo claro por defeito (contraste com dourado em abas escuras); transparente só com FAVICON_TRANSPARENT=1. */
const DEFAULT_FAVICON_BG_HEX = '#FBF6EC';

/** Área útil do lockup em `#mark img`; margem mínima para `drop-shadow` do filtro (evitar clipping). */
const FAVICON_IMG_MAX_WIDTH_PCT = 98;
const FAVICON_IMG_MAX_HEIGHT_PCT = 90;

/**
 * Recorte quadrado a partir do canto superior esquerdo (lado = min(largura, altura)).
 * Maximiza o símbolo na aba para PNGs horizontais (ex. 300×170).
 *
 * @param {Buffer} inputBuf
 * @returns {Promise<Buffer>}
 */
async function extractSmallIconSquarePng(inputBuf) {
  const meta = await sharp(inputBuf).metadata();
  if (meta.width === undefined || meta.height === undefined) {
    throw new Error('Metadados de imagem em falta (largura/altura).');
  }
  const side = Math.min(meta.width, meta.height);
  return sharp(inputBuf).extract({ left: 0, top: 0, width: side, height: side }).png().toBuffer();
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
 * Transparente com opt-in; senão DEFAULT ou FAVICON_BG_HEX válido.
 * @returns {string | null} hex ou null = transparente
 */
function resolveSolidBackgroundHex() {
  if (process.env.FAVICON_TRANSPARENT === '1') {
    if (process.env.FAVICON_BG_HEX !== undefined && String(process.env.FAVICON_BG_HEX).trim() !== '') {
      console.warn('FAVICON_TRANSPARENT=1: FAVICON_BG_HEX ignorado (fundo transparente).');
    }
    return null;
  }

  const raw = process.env.FAVICON_BG_HEX;
  if (raw !== undefined && String(raw).trim() !== '') {
    const parsed = parseSolidBgHex(raw);
    if (parsed !== null) {
      return parsed;
    }
    console.warn(
      `FAVICON_BG_HEX inválido (use #RRGGBB). A usar fundo por defeito ${DEFAULT_FAVICON_BG_HEX}.`,
    );
    return DEFAULT_FAVICON_BG_HEX;
  }

  return DEFAULT_FAVICON_BG_HEX;
}

/**
 * @param {string} imageDataUrl
 * @param {boolean} applyCssFilter
 * @param {string | null} solidBgHex
 */
function buildMarkupPage(imageDataUrl, applyCssFilter, solidBgHex) {
  const imgFilter = applyCssFilter ? SIDEBAR_LOGO_FILTER : 'none';
  const bg = solidBgHex === null ? 'transparent' : solidBgHex;
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
      max-width: ${FAVICON_IMG_MAX_WIDTH_PCT}%;
      max-height: ${FAVICON_IMG_MAX_HEIGHT_PCT}%;
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
 * @returns {Promise<Buffer>}
 */
async function rasterizeMarkPngFromBuffer(buf, applyCssFilter, solidBgHex) {
  const b64 = buf.toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;
  const html = buildMarkupPage(dataUrl, applyCssFilter, solidBgHex);

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
  const smallSquareBuf = await extractSmallIconSquarePng(sourceBuf);

  if (useOptionalGold) {
    console.log('Usando logo-febracis-favicon.png (marca dourada, sem filtro CSS).');
  } else {
    console.log('Raster com filtro da sidebar (Playwright + Chromium).');
  }

  if (solidBgHex !== null) {
    console.log(`Fundo do favicon: ${solidBgHex}${process.env.FAVICON_BG_HEX ? ' (FAVICON_BG_HEX)' : ' (por defeito)'}.`);
  } else {
    console.log('Fundo transparente (FAVICON_TRANSPARENT=1).');
  }

  console.log('favicon-16/32: recorte quadrado (canto superior esquerdo); apple-touch: lockup completo.');

  const rasterSmall = await rasterizeMarkPngFromBuffer(smallSquareBuf, applyCssFilter, solidBgHex);
  const rasterApple = await rasterizeMarkPngFromBuffer(sourceBuf, applyCssFilter, solidBgHex);

  await writeIconFromRaster(rasterSmall, 16, 'favicon-16.png');
  await writeIconFromRaster(rasterSmall, 32, 'favicon-32.png');
  await writeIconFromRaster(rasterApple, 180, 'apple-touch-icon.png');

  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
