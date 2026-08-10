import axios, { AxiosHeaders } from 'axios'

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

// 요청 인터셉터: 로그인 토큰이 있으면 모든 요청에 Authorization 헤더를 자동 첨부한다.
// (401이 계속 발생한다면 우선 이 인터셉터가 실제로 헤더를 붙이고 있는지,
//  accessToken 자체가 비어있거나 만료된 건 아닌지부터 의심할 것.)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')?.trim()

  if (!token) {
    // eslint-disable-next-line no-console
    console.warn(`[api] accessToken이 없어 Authorization 헤더 없이 요청합니다: ${config.url}`)
    return config
  }

  // axios 1.x는 config.headers를 AxiosHeaders 인스턴스로 넘겨준다. 인터셉터 체이닝이나
  // 요청 옵션에 따라 plain object가 섞여 들어오는 경우까지 방어적으로 처리해,
  // 어떤 경로로 요청하든 Authorization 헤더가 확실히 실리도록 한다.
  if (!config.headers) {
    config.headers = new AxiosHeaders()
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
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
