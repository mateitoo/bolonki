import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "npm run build"        -> dist/ (GitHub Pages / itch.io), three.js empaquetado.
// "npm run build:single" -> dist-single/ en un solo HTML, con three.js desde cdnjs
//                           (es lo que se publica como preview en claude.ai).
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single
      ? [
          {
            name: 'three-from-cdn',
            transformIndexHtml: (html) =>
              html.replace('<!-- three-cdn -->', `<script src="${THREE_CDN}"></script>`),
          },
          viteSingleFile(),
        ]
      : [],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      target: 'es2019',
      rollupOptions: single
        ? { external: ['three'], output: { format: 'iife', globals: { three: 'THREE' } } }
        : {},
    },
  };
});
