import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * On Vercel the console is served from its own domain, so `/api/v1` would hit the
 * static host instead of the API. Refuse to build until the API origin is set.
 */
function assertDeployableApiBase(mode: string): void {
  // loadEnv also reads the process environment for these prefixes (Vercel's settings).
  const env = loadEnv(mode, '.', ['VITE_', 'VERCEL']);
  if (!env.VERCEL) return;
  const base = env.VITE_API_BASE_URL?.trim();
  if (!base) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables, e.g. https://api.example.com/api/v1',
    );
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`VITE_API_BASE_URL is not a valid URL: ${base}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`VITE_API_BASE_URL must use https on Vercel: ${base}`);
  }
}

export default defineConfig(({ mode }) => {
  assertDeployableApiBase(mode);
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
