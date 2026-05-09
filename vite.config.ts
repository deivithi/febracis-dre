import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function loadFebracisSpaSecurityHeaders(): Record<string, string> {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const manifestPath = path.join(dir, 'config', 'febracis-http-security.json');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { headers?: Record<string, string> };
    return parsed.headers ?? {};
  } catch {
    return {};
  }
}

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const spaSecurityHeaders = loadFebracisSpaSecurityHeaders();
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
  const appVersion = (JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string }).version ?? '0.0.0';

  const dreAgentProxy =
    env.VITE_DRE_AGENT_PROXY_TARGET?.trim() || 'https://febracis-dre-phi.vercel.app';

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) return 'recharts';
            if (id.includes('node_modules/react-grid-layout')) return 'react-grid-layout';
          },
        },
      },
    },
    plugins: [react()],
    server: {
      headers: spaSecurityHeaders,
      proxy: {
        '/api': {
          target: dreAgentProxy,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    preview: {
      headers: spaSecurityHeaders,
    },
  };
});
