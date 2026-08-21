import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const viteEntry = path.join(HERE, '..', 'frontend', 'node_modules', 'vite', 'dist', 'node', 'index.js');
const { build } = await import(pathToFileURL(viteEntry).href);

await build({
  configFile: false,
  logLevel: 'warn',
  root: HERE,
  build: {
    lib: { entry: path.join(HERE, 'entry.ts'), formats: ['es'], fileName: 'envelope_bundle' },
    outDir: path.join(HERE, 'dist'),
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { codeSplitting: false } },
  },
});
console.log('interop bundle built');
