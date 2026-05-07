import crypto from "node:crypto";
import process from "node:process";

const base =
  process.env.SMOKE_PROD_URL?.replace(/\/?$/, "") ??
  "https://febracis-dre.vercel.app";

const PROJECT_REF = "vwxgrjjwbvdiaqxqbryk";
const STRICT = process.env.SMOKE_STRICT === "1" || process.env.SMOKE_STRICT === "true";

const FALLBACK_MARKERS = [
  "Configuração incompleta",
  "Configuração Supabase incompleta",
  "vwxgrjjwbvdiaqxqbryk",
];

async function fetchText(url) {
  const r = await fetch(url);
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

function sha256Short(body) {
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

const htmlRes = await fetchText(base);
const html = htmlRes.text;

const hasRoot = /id=["']root["']/.test(html);
const paths = new Set();

for (const m of html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/gi)) {
  paths.add(m[1]);
}
for (const m of html.matchAll(
  /<link[^>]+rel="modulepreload"[^>]+href="(\/assets\/[^"]+\.js)"/gi,
)) {
  paths.add(m[1]);
}
for (const m of html.matchAll(
  /<link[^>]+href="(\/assets\/[^"]+\.js)"[^>]+rel="modulepreload"/gi,
)) {
  paths.add(m[1]);
}

const uniq = [...paths];
const findings = [];
const assetReports = [];
let sawJwtLike = false;
let sawProjectRef = false;
let sawFallbackMarker = false;

for (const p of uniq) {
  const url = base + p;
  const r = await fetch(url);
  const j = await r.text();
  const hash = sha256Short(j);

  assetReports.push({
    path: p,
    status: r.status,
    ok: r.ok,
    bytes: j.length,
    sha256_16: hash,
  });

  if (!r.ok) {
    findings.push({ p, snippet: `http_${r.status}` });
    continue;
  }

  const hasDomain = j.includes("supabase.co");
  const hasJwtStart = /(^|[^A-Za-z0-9_])eyJ[A-Za-z0-9_-]{20,}/.test(j);
  if (hasJwtStart) sawJwtLike = true;
  if (j.includes(PROJECT_REF)) sawProjectRef = true;
  for (const marker of FALLBACK_MARKERS) {
    if (j.includes(marker)) {
      sawFallbackMarker = true;
      break;
    }
  }

  if (hasDomain) {
    findings.push({ p, snippet: "supabase.co" });
    continue;
  }
  if (j.includes("vwxgr")) {
    findings.push({ p, snippet: "vwxgr" });
    continue;
  }
  if (j.includes("sb_publishable")) {
    findings.push({ p, snippet: "sb_publishable" });
  }
}

const hasUrl = findings.some((f) => f.snippet === "supabase.co");
const hasPub = sawJwtLike;
const hasProjectRefInBundle = sawProjectRef;
const hasFallbackStrings = sawFallbackMarker;

const summary = {
  base,
  htmlStatus: htmlRes.status,
  htmlOk: htmlRes.ok,
  hasRoot,
  scripts_checked: uniq.length,
  hasUrl,
  hasPub,
  hasProjectRefInBundle,
  hasFallbackStrings,
  strict: STRICT,
};

console.log("summary", JSON.stringify(summary, null, 2));
console.log("paths", JSON.stringify(uniq));
console.log(
  "assets",
  JSON.stringify(
    assetReports.map((a) => ({
      path: a.path,
      status: a.status,
      ok: a.ok,
      bytes: a.bytes,
      sha256_16: a.sha256_16,
    })),
    null,
    2,
  ),
);
console.log("findings", JSON.stringify(findings, null, 2));

if (STRICT) {
  const failed = [];
  if (!htmlRes.ok) failed.push("html_not_ok");
  if (!hasRoot) failed.push("missing_root_in_html");
  if (!hasUrl) failed.push("missing_supabase_url_in_bundles");
  if (!hasProjectRefInBundle) failed.push("missing_project_ref_in_bundles");
  const badAsset = assetReports.some((a) => !a.ok);
  if (badAsset) failed.push("asset_http_error");

  if (failed.length) {
    console.error("SMOKE_STRICT failed:", failed.join(", "));
    process.exit(1);
  }
}
