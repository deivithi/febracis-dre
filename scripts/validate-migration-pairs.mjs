#!/usr/bin/env node
/**
 * Lista ficheiros em supabase/migrations e cruza com supabase/rollbacks/*.down.sql.
 * Não bloqueia CI — apenas relatório. Exit 0 sempre (a menos que --fail seja usado).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const rollbacksDir = path.join(root, 'supabase', 'rollbacks');

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

const migs = listSqlFiles(migrationsDir);
const downs = listSqlFiles(rollbacksDir);

/** Prefixo numérico NNN_ */
function migrationPrefix(name) {
  const m = /^(\d{3})_/.exec(name);
  return m ? m[1] : null;
}

const downPrefixes = new Set(
  downs
    .map((f) => {
      const m = /^(\d{3})_/.exec(f);
      return m ? m[1] : null;
    })
    .filter(Boolean),
);

console.log('validate-migration-pairs: migrations', migs.length, 'rollback downs', downs.length);
console.log('');

const missingRollback = [];
for (const f of migs) {
  const p = migrationPrefix(f);
  if (!p) continue;
  if (!downPrefixes.has(p)) {
    missingRollback.push(f);
  }
}

if (missingRollback.length) {
  console.log('Migrations sem ficheiro .down.sql correspondente (por prefixo NNN):');
  for (const f of missingRollback) {
    console.log(`  - ${f}`);
  }
} else {
  console.log('Nenhum prefixo órfão detectado (todos os NNN_* têm pelo menos um .down com mesmo prefixo).');
}

console.log('');
console.log('Rollbacks presentes:', downs.length ? downs.join(', ') : '(nenhum)');

if (process.argv.includes('--fail') && missingRollback.length > 0) {
  process.exit(1);
}

process.exit(0);
