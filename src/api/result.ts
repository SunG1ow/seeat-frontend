// api/cart.ts·orders.ts·addresses.ts가 공유하는 결과 형태.
// success:true일 때만 ok:true, 그 외(success:false / 네트워크·서버 에러)는 전부 ok:false +
// 서버 메시지로 반환해서 호출부가 실수로 "가짜 성공"을 띄우지 못하게 방어한다.
export interface ApiResult<T = undefined> {
  ok: boolean
  data?: T
  message?: string
}

export function extractErrorMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
}
