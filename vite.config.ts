import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // 빌드 시각(한국 시간)을 앱에 심어 둔다.
  // 휴대폰에 옛 버전이 남아 있는지 화면에서 바로 확인할 수 있게 하기 위함이다.
  const buildTime = new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);

  return {
    define: {
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
