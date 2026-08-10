import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// ============================================================
// POST /api/v1/orders — 주문 생성 (스웨거 명세 기준, 2026-08-09 확인)
// 장바구니 "전체"가 아니라 선택한 항목(items) 기준으로 주문하며, 배송지는 저장된
// addressId만 참조한다 (addressId 조회는 api/addresses.ts 참고, Cart.tsx에서 연동).
// ============================================================

export interface CreateOrderItem {
  productId: number
  quantity: number
}

export interface CreateOrderRequest {
  items: CreateOrderItem[]
  addressId: number
  /** 배송 요청사항 등 — 스웨거 예시상 필수 필드지만 실제로는 빈 문자열이 허용될 가능성이 높다 */
  requestMessage: string
}

export interface OrderSummary {
  orderId: number
  orderStatus: string
  totalAmount: number
  createdAt: string
}

interface CreateOrderApiResponse {
  success: boolean
  data: OrderSummary
  message: string
}

// ============================================================
// POST /api/v1/orders/{orderId}/payment — 결제 처리 (주문 생성과 분리된 별도 API)
// ============================================================

export interface CreatePaymentRequest {
  paymentMethod: string
  pgTransactionId: string
}

export interface PaymentResult {
  paymentId: number
  orderId: number
  orderStatus: string
  paymentMethod: string
  pgTransactionId: string
}

interface CreatePaymentApiResponse {
  success: boolean
  data: PaymentResult
  message: string
}

// POST /api/v1/orders — 장바구니에서 선택한 항목(items)과 배송지(addressId)로 주문을 생성한다.
export async function createOrder(request: CreateOrderRequest): Promise<ApiResult<OrderSummary>> {
  try {
    const response = await api.post<CreateOrderApiResponse>('/api/v1/orders', request)
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[orders] 주문 생성 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// POST /api/v1/orders/{orderId}/payment — createOrder()로 만든 주문을 결제 처리한다.
export async function payOrder(
  orderId: number,
  request: CreatePaymentRequest,
): Promise<ApiResult<PaymentResult>> {
  try {
    const response = await api.post<CreatePaymentApiResponse>(
      `/api/v1/orders/${orderId}/payment`,
      request,
    )
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[orders] 결제 처리 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// POST /api/v1/orders/{orderId}/cancel — 구매자 주문 취소 (스웨거 명세 기준, 2026-08-11 확인)
// reason은 선택값이라 입력하지 않아도 요청 가능하다(빈 문자열/공백만 입력 시 아예 보내지 않는다).
// ============================================================

export interface CancelOrderResult {
  orderId: number
  orderStatus: string
}

interface CancelOrderApiResponse {
  success: boolean
  data: CancelOrderResult
  message: string
}

// POST /api/v1/orders/{orderId}/cancel
export async function cancelOrder(
  orderId: number,
  reason?: string,
): Promise<ApiResult<CancelOrderResult>> {
  try {
    const response = await api.post<CancelOrderApiResponse>(`/api/v1/orders/${orderId}/cancel`, {
      reason: reason?.trim() || undefined,
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[orders] 주문 취소 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// GET /api/v1/users/me/orders — 내 주문 목록 조회 (스웨거 명세 기준, 2026-08-10 확인)
// ⚠️ 다른 API들과 달리 success/data 래퍼가 없고, GET /api/v1/products/search와 동일하게
// 응답 최상단에 바로 { content, page }가 온다. 여기서 흡수해서 createOrder/payOrder와
// 동일한 { ok, data, message } 형태로 맞춰 반환하므로, 호출부는 래퍼 차이를 신경 쓸 필요 없다.
// ============================================================

export interface OrderListItem {
  orderId: number
  productName: string
  status: string
  orderedAt: string
}

interface OrderListResponse {
  content: OrderListItem[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
}

export interface GetMyOrdersParams {
  page?: number
  size?: number
}

// GET /api/v1/users/me/orders
export async function getMyOrders(
  params: GetMyOrdersParams = {},
  signal?: AbortSignal,
): Promise<ApiResult<OrderListItem[]>> {
  try {
    const response = await api.get<OrderListResponse>('/api/v1/users/me/orders', {
      params: { page: params.page ?? 0, size: params.size ?? 20 },
      signal,
      timeout: 20_000,
    })
    return { ok: true, data: response.data.content ?? [] }
  } catch (error) {
    console.error('[orders] 주문 목록 조회 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
