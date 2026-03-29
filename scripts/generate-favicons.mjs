/**
 * Gera favicons PNG (16 / 32 / apple-touch 180) alinhados ao aspeto dourado da sidebar.
 *
 * A sidebar aplica filtros CSS em `.sidebar__logo-image` (layout.css); o favicon é estático,
 * por isso rasterizamos com o mesmo filtro via Playwright (Chromium) e fundo tipo `.sidebar__logo-mark`.
 *
 * Fallback opcional: se existir `public/images/logo-febracis-favicon.png` (marca já em dourado),
 * usa-se esse ficheiro sem filtro CSS.
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

/**
 * Fundo aproximado ao painel da marca (sidebar__logo-mark): gradiente + base escura.
 * Não é fundo amarelo de página — só o mesmo “lift” subtil do UI.
 */
function buildMarkupPage(imageDataUrl, applyCssFilter) {
  const imgFilter = applyCssFilter ? SIDEBAR_LOGO_FILTER : 'none';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; box-sizing: border-box; }
    body {
      background: #0a0e1a;
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
      border-radius: 64px;
      border: 1px solid rgba(240, 183, 62, 0.18);
      background:
        linear-gradient(135deg, rgba(240, 183, 62, 0.14), rgba(240, 183, 62, 0.04)),
        rgba(10, 14, 26, 0.36);
      box-shadow:
        inset 0 1px 0 rgba(255, 244, 215, 0.09),
        0 10px 24px rgba(0, 0, 0, 0.22);
    }
    #mark img {
      max-width: 88%;
      max-height: 48%;
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
 * @returns {Promise<Buffer>}
 */
async function rasterizeMarkPng(imagePath, applyCssFilter) {
  const buf = readFileSync(imagePath);
  const b64 = buf.toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;
  const html = buildMarkupPage(dataUrl, applyCssFilter);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 800, height: 800 },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    const locator = page.locator('#mark');
    return await locator.screenshot({ type: 'png' });
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

  const useOptionalGold = existsSync(optionalGoldPath);
  const sourcePath = useOptionalGold ? optionalGoldPath : defaultLogoPath;
  const applyCssFilter = !useOptionalGold;

  if (useOptionalGold) {
    console.log('Usando logo-febracis-favicon.png (marca dourada, sem filtro CSS).');
  } else {
    console.log('Raster com filtro da sidebar (Playwright + Chromium).');
  }

  const raster512 = await rasterizeMarkPng(sourcePath, applyCssFilter);

  await writeIconFromRaster(raster512, 16, 'favicon-16.png');
  await writeIconFromRaster(raster512, 32, 'favicon-32.png');
  await writeIconFromRaster(raster512, 180, 'apple-touch-icon.png');

  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
