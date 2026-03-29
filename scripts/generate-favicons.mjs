/**
 * Gera favicons PNG a partir de public/images/logo-febracis.png (mesmo asset da sidebar).
 * Fundo #0A0E1A (alinhado a theme-color no index.html), logo com fit "contain" e padding ~12%.
 *
 * Uso: npm run favicons
 * Requer: sharp (devDependency)
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoPath = join(root, 'public', 'images', 'logo-febracis.png');
const outDir = join(root, 'public');

/** #0A0E1A — mesmo token que index.html meta theme-color */
const BG = { r: 10, g: 14, b: 26, alpha: 1 };

async function writeIcon(size, fileName) {
  const pad = Math.max(1, Math.round(size * 0.12));
  const inner = size - 2 * pad;

  const resized = await sharp(logoPath)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(join(outDir, fileName));
}

async function main() {
  await writeIcon(16, 'favicon-16.png');
  await writeIcon(32, 'favicon-32.png');
  await writeIcon(180, 'apple-touch-icon.png');
  console.log('Favicons gerados: favicon-16.png, favicon-32.png, apple-touch-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
