import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// GET /api/v1/users/me/addresses 응답 항목 구조 (스웨거 명세 기준, 2026-08-09/10 확인).
// MyPage.tsx가 이 타입 그대로 화면에 렌더링한다(예전 AddressContext 로컬 목업의
// recipient/zipcode/address1/address2 구조와는 다르다 — 그 컨텍스트는 더 이상 쓰지 않는다).
export interface ApiAddress {
  addressId: number
  alias: string
  receiverName: string
  receiverPhone: string
  address: string
  isDefault: boolean
}

interface AddressListApiResponse {
  success: boolean
  data: ApiAddress[]
  message: string
}

// GET /api/v1/users/me/addresses — 로그인한 사용자의 배송지 목록
export async function getMyAddresses(signal?: AbortSignal): Promise<ApiResult<ApiAddress[]>> {
  try {
    const response = await api.get<AddressListApiResponse>('/api/v1/users/me/addresses', {
      signal,
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data ?? [] }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[addresses] 배송지 목록 조회 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// POST /api/v1/users/me/addresses 요청 바디
export interface AddAddressRequest {
  alias: string
  receiverName: string
  receiverPhone: string
  address: string
  isDefault: boolean
}

interface AddAddressApiResponse {
  success: boolean
  data: ApiAddress
  message: string
}

// POST /api/v1/users/me/addresses — 새 배송지를 추가한다.
export async function addAddress(request: AddAddressRequest): Promise<ApiResult<ApiAddress>> {
  try {
    const response = await api.post<AddAddressApiResponse>('/api/v1/users/me/addresses', request)
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[addresses] 배송지 추가 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// DELETE /api/v1/users/me/addresses/{addressId} 응답 구조 (다른 API와 동일한 공통 래퍼)
interface DeleteAddressApiResponse {
  success: boolean
  data: unknown
  message: string
}

// DELETE /api/v1/users/me/addresses/{addressId} — 배송지를 삭제한다.
export async function deleteAddress(addressId: number): Promise<ApiResult<undefined>> {
  try {
    const response = await api.delete<DeleteAddressApiResponse>(
      `/api/v1/users/me/addresses/${addressId}`,
    )
    if (response.data?.success === true) {
      return { ok: true }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[addresses] 배송지 삭제 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
