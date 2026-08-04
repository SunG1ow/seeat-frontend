import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 상위 폴더(frontend-app/)에 별도 프로젝트의 postcss.config.js(Tailwind v3)가 있어
  // Vite가 postcss 설정을 검색할 때 그걸 잘못 주워온다. 이 프로젝트는 @tailwindcss/vite
  // 플러그인만으로 충분하므로 postcss 설정을 빈 값으로 명시해 상위 탐색을 막는다.
  css: {
    postcss: {},
  },
})
