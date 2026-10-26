import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // 把大型套件拆成獨立檔案：瀏覽器可平行下載、更新程式碼時不必重載 3D 引擎
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) return 'react'; // 否則大廳會被迫連帶下載 3D 套件
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id) || id.includes('@babel/runtime')) return 'react';
          if (id.includes('/three/')) return 'three';
          if (id.includes('@react-three') || id.includes('three-stdlib') || id.includes('/zustand/') || id.includes('/its-fine/')) return 'r3f';
          if (id.includes('@supabase')) return 'supabase';
          return undefined;
        },
      },
    },
  },
});
