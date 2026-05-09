import fs from 'node:fs';

const p = 'C:/Users/PC/Documents/VS CODE/febracis-dre/src/features/dashboard/DashboardPage.tsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const iSkel = lines.findIndex((l) => l.startsWith('function DashboardScopeBodySkeleton'));
const iLazy = lines.findIndex((l) => l.startsWith('const CustomizableDashboard = lazy'));
if (iLazy < 0 || iSkel < 0) {
  console.error('markers not found', { iLazy, iSkel });
  process.exit(1);
}

let endLazy = iLazy;
while (endLazy < lines.length && lines[endLazy].trim() !== ');') {
  endLazy++;
}
endLazy += 1; // line after );

const before = lines.slice(0, endLazy);
const after = lines.slice(iSkel);
const out = [...before, ...after].join('\n');
fs.writeFileSync(p, out);
console.log('kept lines 1-' + endLazy + ', removed ' + (iSkel - endLazy) + ', total now ~' + (before.length + after.length));
