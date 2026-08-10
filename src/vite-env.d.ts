/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 기본 주소. .env.local / .env.example 참고 */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
