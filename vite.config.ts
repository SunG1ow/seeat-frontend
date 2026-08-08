// vitest의 defineConfig는 vite의 defineConfig를 그대로 감싸면서 `test` 필드 타입만 추가해준다.
// (dev/build 설정은 기존과 완전히 동일하게 동작한다)
import { defineConfig } from 'vitest/config'
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
  test: {
    environment: 'jsdom',
    // describe/it/expect 등은 전역으로 주입하지 않고 각 테스트 파일에서 'vitest'로부터
    // 명시적으로 import한다. globals:true를 켜면 tsconfig.app.json의 types에도
    // "vitest/globals"를 추가해야 하는데, 그러면 프로덕션 빌드(tsc -b) 타입체크에도
    // 테스트 전역이 섞여버려서 명시적 import 방식을 택했다.
    setupFiles: ['./src/test/setup.ts'],
  },
})
