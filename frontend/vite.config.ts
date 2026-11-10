import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The shared .env lives at the repo root.
const envDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');
  const apiTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

  return {
    envDir,
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Frontend calls /api/* → backend without CORS, e.g. /api/health → /health
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
