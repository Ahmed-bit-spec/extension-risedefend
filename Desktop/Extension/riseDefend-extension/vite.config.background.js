import { defineConfig, loadEnv } from 'vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    publicDir: false,
    define: { 'process.env': env, global: 'globalThis' },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      modulePreload: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/background/background.js'),
        output: {
          format: 'es',
          entryFileNames: 'background.js'
        }
      }
    }
  };
});
