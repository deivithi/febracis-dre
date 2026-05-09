#!/usr/bin/env node
/**
 * Verifica headers de segurança no alias de produção (ou URL passada).
 * Uso: node scripts/verify-security-headers.mjs
 * Env: VERIFY_HEADERS_URL (default https://febracis-dre.vercel.app)
 *      SMOKE_STRICT=1 — exit 1 se faltar header obrigatório
 */

const REQUIRED = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

const url =
  process.env.VERIFY_HEADERS_URL?.trim() || 'https://febracis-dre.vercel.app';
const strict = process.env.SMOKE_STRICT === '1' || process.env.SMOKE_STRICT === 'true';

async function main() {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { Accept: 'text/html' },
  });

  const status = res.status;
  const headers = res.headers;

  const lower = new Map();
  for (const [k, v] of headers.entries()) {
    lower.set(k.toLowerCase(), v);
  }

  const missing = REQUIRED.filter((k) => !lower.has(k));

  console.log(`verify-security-headers: GET ${url} -> ${status}`);
  for (const name of REQUIRED) {
    const ok = lower.has(name);
    console.log(`  ${ok ? 'OK' : 'MISS'} ${name}${ok ? '' : ' (missing)'}`);
  }

  if (missing.length > 0) {
    const msg = `verify-security-headers: missing: ${missing.join(', ')}`;
    if (strict) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
    process.exit(0);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('verify-security-headers:', err);
  process.exit(strict ? 1 : 0);
});
