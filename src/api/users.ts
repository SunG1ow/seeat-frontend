import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// ============================================================
// PUT /api/v1/users/me — 회원정보(닉네임/연락처) 수정 (2026-08-10 스웨거 확인)
// ⚠️ nickname/phoneNumber는 JSON 바디가 아니라 Query Parameter로 전달된다
// (POST /api/v1/products의 categoryId&name&... 패턴과 동일).
// profileImage는 스웨거상 별도 파일 파트로 받게 되어 있지만, 마이페이지에 파일 선택 UI
// 자체가 없어(type="file" input 없음) 여기서는 다루지 않는다. 업로드 UI가 생기면
// 이 함수에 images: File 파라미터를 추가하고 FormData로 함께 보내야 한다.
// ============================================================

export interface UpdateProfileRequest {
  nickname: string
  phoneNumber: string
}

export interface MemberProfile {
  userId: number
  email: string
  nickname: string
  phoneNumber: string
  role: string
}

interface UpdateProfileApiResponse {
  success: boolean
  data: MemberProfile
  message: string
}

// PUT /api/v1/users/me
export async function updateMemberProfile(
  request: UpdateProfileRequest,
): Promise<ApiResult<MemberProfile>> {
  try {
    const response = await api.put<UpdateProfileApiResponse>('/api/v1/users/me', undefined, {
      params: { nickname: request.nickname, phoneNumber: request.phoneNumber },
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[users] 회원정보 수정 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// PUT /api/v1/users/me/password — 비밀번호 변경 (2026-08-10 스웨거 확인)
// application/json 바디: { currentPassword, newPassword }
// ============================================================

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

interface ChangePasswordApiResponse {
  success: boolean
  data: unknown
  message: string
}

// PUT /api/v1/users/me/password
export async function changeMemberPassword(
  request: ChangePasswordRequest,
): Promise<ApiResult<undefined>> {
  try {
    const response = await api.put<ChangePasswordApiResponse>(
      '/api/v1/users/me/password',
      request,
    )
    if (response.data?.success === true) {
      return { ok: true }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[users] 비밀번호 변경 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// DELETE /api/v1/users/me — 회원 탈퇴 (2026-08-10 스웨거 확인)
// application/json 바디: { password(필수), reason(선택) }
// ============================================================

export interface WithdrawRequest {
  password: string
  reason?: string
}

export interface WithdrawResult {
  userId: number
  isWithdrawn: boolean
  withdrawnAt: string
}

interface WithdrawApiResponse {
  success: boolean
  data: WithdrawResult
  message: string
}

// DELETE /api/v1/users/me
// axios delete()는 body를 config.data로 넘긴다(url 뒤에 바로 못 붙임).
export async function withdrawMember(request: WithdrawRequest): Promise<ApiResult<WithdrawResult>> {
  try {
    const response = await api.delete<WithdrawApiResponse>('/api/v1/users/me', {
      data: { password: request.password, reason: request.reason },
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[users] 회원탈퇴 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
