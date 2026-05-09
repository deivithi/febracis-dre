/**
 * Modo de apresentação (Vite): `production` no deploy canónico.
 * Banner e cópias de demo dependem apenas de `import.meta.env.VITE_APP_MODE === 'demo'` (literais).
 */
export function isDemoAppMode(): boolean {
  return import.meta.env.VITE_APP_MODE === 'demo';
}
