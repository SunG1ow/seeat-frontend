import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// ============================================================
// GET /api/v1/seller/settlements — 판매자 정산 내역 조회 (2026-08-10 스웨거 확인)
// success/data/message 래퍼(다른 API 대다수와 동일). status는 스웨거상 string으로만
// 정의되어 있어 실제 값이 확정되기 전까지 프론트에서 enum을 임의로 만들지 않고
// 백엔드가 내려주는 문자열을 그대로 사용한다.
// ============================================================

export interface SettlementItem {
  settlementId: number
  orderId: number
  amount: number
  status: string
  settledAt: string
}

interface SettlementListApiResponse {
  success: boolean
  data: SettlementItem[]
  message: string
}

export interface GetSellerSettlementsParams {
  /** 선택 필터 — 실제 유효한 status 값이 확정되기 전까지는 호출부에서 넘기지 않는다 */
  status?: string
}

// GET /api/v1/seller/settlements
export async function getSellerSettlements(
  params: GetSellerSettlementsParams = {},
  signal?: AbortSignal,
): Promise<ApiResult<SettlementItem[]>> {
  try {
    const response = await api.get<SettlementListApiResponse>('/api/v1/seller/settlements', {
      params: params.status ? { status: params.status } : undefined,
      signal,
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data ?? [] }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[settlements] 정산 내역 조회 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
