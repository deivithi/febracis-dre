import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const dreAgentProxy =
    env.VITE_DRE_AGENT_PROXY_TARGET?.trim() || 'https://febracis-dre.vercel.app';

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: dreAgentProxy,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
