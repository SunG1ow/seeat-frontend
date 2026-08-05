import axios from 'axios'

/**
 * 백엔드 API 공통 axios 인스턴스.
 *
 * Base URL은 코드에 하드코딩하지 않고 환경 변수로 관리한다.
 *   .env.local  ->  VITE_API_BASE_URL=https://paralegal-preamble-calm.ngrok-free.dev
 * (.env.example에 안내되어 있고, .env.local은 git에 커밋되지 않는다.
 *  팀원이 ngrok을 껐다 켜서 주소가 바뀌면 .env.local 값만 갱신하면 된다.)
 */
const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn('[api] VITE_API_BASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.')
}

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    // ngrok 무료(free) 도메인은 브라우저가 아닌 요청에도 기본적으로
    // 경고 인터스티셜 HTML 페이지를 응답한다. 이 헤더를 보내면
    // 그 페이지를 건너뛰고 실제 API 응답을 바로 받는다.
    'ngrok-skip-browser-warning': 'true',
  },
})

// 요청 인터셉터: 로그인 토큰이 있으면 Authorization 헤더 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 에러를 한 곳에서 로깅 (추후 401 처리·토스트 등 공통 로직 추가 지점)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[api] ${error.response.status} ${error.config?.url}`, error.response.data)
    } else {
      console.error('[api] 네트워크 오류:', error.message)
    }
    return Promise.reject(error)
  },
)

export default api
