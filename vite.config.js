import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built site works from any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    // v8: the libraries and the Bank's content change less often than the screens, so each gets its own
    // file and stays cached across most updates. The later screens split off on their own (see App.jsx).
    rolldownOptions: { output: { codeSplitting: { groups: [
      {name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|immer)[\\/]/},
      {name: 'content', test: /[\\/]src[\\/]content[\\/]/},
    ] } } },
  },
  test: { include: ['tests/**/*.test.js'] },
});
