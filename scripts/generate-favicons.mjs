/**
 * Gera favicons PNG (16 / 32 / apple-touch 180) com o lockup Febracis (águia + texto).
 *
 * O filtro de cor dourada replica `.sidebar__logo-image` em layout.css; o FUNDO não replica
 * o painel escuro da sidebar — por defeito o raster usa fundo transparente para o ícone
 * assentar no "fundo normal" da aba do browser. Opcional: fundo sólido claro quente via
 * variável de ambiente `FAVICON_BG_HEX` (ex.: `#FBF6EC` se o contraste em algum contexto
 * for insuficiente).
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

/** Área útil do lockup em `#mark img`; margem mínima para `drop-shadow` do filtro (evitar clipping). */
const FAVICON_IMG_MAX_WIDTH_PCT = 98;
const FAVICON_IMG_MAX_HEIGHT_PCT = 90;

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
 * @param {string} imagePath
 * @param {boolean} applyCssFilter
 * @param {string | null} solidBgHex
 * @returns {Promise<Buffer>}
 */
async function rasterizeMarkPng(imagePath, applyCssFilter, solidBgHex) {
  const buf = readFileSync(imagePath);
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

  const solidBgHex = parseSolidBgHex(process.env.FAVICON_BG_HEX);
  if (process.env.FAVICON_BG_HEX !== undefined && process.env.FAVICON_BG_HEX !== '' && solidBgHex === null) {
    console.warn(
      'FAVICON_BG_HEX ignorado (use formato #RRGGBB, ex.: #FBF6EC). A usar fundo transparente.',
    );
  }

  const useOptionalGold = existsSync(optionalGoldPath);
  const sourcePath = useOptionalGold ? optionalGoldPath : defaultLogoPath;
  const applyCssFilter = !useOptionalGold;

  if (useOptionalGold) {
    console.log('Usando logo-febracis-favicon.png (marca dourada, sem filtro CSS).');
  } else {
    console.log('Raster com filtro da sidebar (Playwright + Chromium).');
  }

  if (solidBgHex !== null) {
    console.log(`Fundo sólido do favicon: ${solidBgHex} (FAVICON_BG_HEX).`);
  } else {
    console.log('Fundo transparente (ícone assenta na aba do browser).');
  }

  const raster512 = await rasterizeMarkPng(sourcePath, applyCssFilter, solidBgHex);

  await writeIconFromRaster(raster512, 16, 'favicon-16.png');
  await writeIconFromRaster(raster512, 32, 'favicon-32.png');
  await writeIconFromRaster(raster512, 180, 'apple-touch-icon.png');

  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
