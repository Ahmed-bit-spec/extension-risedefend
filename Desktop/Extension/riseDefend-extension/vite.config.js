import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function chromeExtensionManifest(env) {
  return {
    name: 'chrome-extension-manifest',
    generateBundle() {
      const manifest = JSON.parse(readFileSync(resolve(__dirname, 'public/manifest.json'), 'utf-8'));
      const crxPublicKey = env.VITE_CRX_PUBLIC_KEY?.trim();

      if (crxPublicKey) {
        manifest.key = crxPublicKey;
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });

      // Copy public/blocked.html → dist/blocked.html (DNR redirect target)
      const blockedHtml = readFileSync(resolve(__dirname, 'public/blocked.html'), 'utf-8');
      this.emitFile({
        type: 'asset',
        fileName: 'blocked.html',
        source: blockedHtml,
      });

      // Copy public/blocked.js → dist/blocked.js
      const blockedJs = readFileSync(resolve(__dirname, 'public/blocked.js'), 'utf-8');
      this.emitFile({
        type: 'asset',
        fileName: 'blocked.js',
        source: blockedJs,
      });

      // Copy icons from public/icons/ to dist/icons/
      const iconSizes = ['16', '32', '48', '128', '512'];
      for (const sz of iconSizes) {
        const iconPath = resolve(__dirname, `public/icons/risedefend-icon-${sz}.png`);
        if (existsSync(iconPath)) {
          const iconBuffer = readFileSync(iconPath);
          this.emitFile({
            type: 'asset',
            fileName: `icons/risedefend-icon-${sz}.png`,
            source: iconBuffer,
          });
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    publicDir: false,
    plugins: [tailwindcss(), react(), chromeExtensionManifest(env)],
    define: {
      global: 'globalThis',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name]-[hash].js'
        }
      }
    },
  };
});
