import { api } from './client'

// POST /api/v1/cart/items 응답 구조 (스웨거 명세 기준).
// data의 상세 필드는 화면에서 쓰지 않아 unknown으로 둔다.
interface AddCartItemApiResponse {
  success: boolean
  data: unknown
  message: string
}

export interface AddCartItemResult {
  ok: boolean
  /** 실패 시 서버가 내려준 안내 메시지 (없으면 호출부에서 기본 문구를 띄운다) */
  message?: string
}

/**
 * 장바구니에 상품을 담는다 (POST /api/v1/cart/items).
 *
 * 스웨거 명세 기준 request body는 { productId, quantity }만 받는다.
 * userId/memberId는 body나 쿼리로 보내지 않는다 — 로그인 토큰(Authorization 헤더)에서
 * 서버가 @CurrentMemberId로 자동 추출해 처리한다.
 *
 * 응답이 success: true일 때만 ok: true를 반환한다. success: false이거나 통신 자체가
 * 실패(catch)한 경우 모두 ok: false로 반환해, 호출부가 "무조건 성공" 토스트를 띄우는
 * 일이 없도록 한다.
 */
export async function addCartItem(productId: number, quantity: number): Promise<AddCartItemResult> {
  try {
    const response = await api.post<AddCartItemApiResponse>('/api/v1/cart/items', {
      productId,
      quantity,
    })

    if (response.data?.success === true) {
      return { ok: true }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[cart] 장바구니 담기 실패:', error)
    const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message
    return { ok: false, message: serverMessage }
  }
}
