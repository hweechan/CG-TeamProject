import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 배포 시 레포 이름을 base로 설정
  base: '/CG-TeamProject/',
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      // index.html의 main.js만 진입점으로 사용 (리액트 tsx 제외)
      input: 'index.html',
    },
  },
});
