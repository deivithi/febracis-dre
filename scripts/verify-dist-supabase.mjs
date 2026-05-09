/**
 * Gate local: após `vite build`, confirma que o bundle em dist/ contém
 * referência ao projeto Supabase canónico (quando VITE_* estão presentes no build).
 *
 * Uso: node scripts/verify-dist-supabase.mjs
 * Falha com exit 1 se não encontrar PROJECT_REF em nenhum .js em dist/assets.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.cwd());
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(DIST, "assets");
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF?.trim() || "vwxgrjjwbvdiaqxqbryk";

function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

const hasViteEnv =
  Boolean(process.env.VITE_SUPABASE_URL?.trim()) &&
  Boolean(process.env.VITE_SUPABASE_ANON_KEY?.trim());
const forceVerify = process.env.FORCE_VERIFY_DIST === "1" || process.env.FORCE_VERIFY_DIST === "true";

if (!hasViteEnv && !forceVerify) {
  console.log(
    "verify-dist-supabase: ignorado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente para validar o dist (ex.: `vercel env run -e production -- node scripts/verify-dist-supabase.mjs` após o build). Para forçar validação sem VITE_* no processo: FORCE_VERIFY_DIST=1.",
  );
  process.exit(0);
}

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("verify-dist-supabase: dist/index.html não encontrado. Rode npm run build primeiro.");
  process.exit(1);
}

if (!fs.existsSync(ASSETS)) {
  console.error("verify-dist-supabase: dist/assets não encontrado.");
  process.exit(1);
}

const html = readUtf8(path.join(DIST, "index.html"));
const jsFiles = fs
  .readdirSync(ASSETS)
  .filter((f) => f.endsWith(".js"))
  .map((f) => path.join(ASSETS, f));

let foundRef = false;
let foundSupabaseCo = false;
const checked = [];

for (const file of jsFiles) {
  const text = readUtf8(file);
  const base = path.basename(file);
  const hasRef = text.includes(PROJECT_REF);
  const hasCo = text.includes("supabase.co");
  checked.push({ file: base, bytes: text.length, hasRef, hasCo });
  if (hasRef) foundRef = true;
  if (hasCo) foundSupabaseCo = true;
}

console.log(
  "verify-dist-supabase",
  JSON.stringify(
    {
      dist: DIST,
      htmlHasRoot: /id=["']root["']/.test(html),
      foundProjectRef: foundRef,
      foundSupabaseCo,
      assetsJs: checked.length,
    },
    null,
    2,
  ),
);

if (!foundRef && !foundSupabaseCo) {
  console.error(
    "verify-dist-supabase: nenhum chunk em dist/assets contém o project ref nem supabase.co.",
    "Se o build local usou VITE_SUPABASE_URL correta, isto indica bundle sem Supabase embutido.",
  );
  process.exit(1);
}
