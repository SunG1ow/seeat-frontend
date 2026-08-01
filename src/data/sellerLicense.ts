// 가입 심사 시 검증이 완료된 판매자(조합/어선) 허가증 정보의 목업.
// 실제 서비스에서는 로그인한 판매자 계정에 매핑된 백엔드 값을 그대로 읽어와야 하며,
// 원산지 위변조를 막기 위해 프런트에서 이 값을 사용자가 직접 수정할 수 없도록 한다
// (ProductRegistration.tsx의 원산지 입력은 이 값을 read-only로만 노출한다).
export interface VesselLicense {
  vesselName: string
  licenseNo: string
  /** 선적항 — 원산지 자동 고정의 기준이 되는 값 */
  homePort: string
  coopName: string
}

export const APPROVED_VESSEL_LICENSE: VesselLicense = {
  vesselName: '제7 해성호',
  licenseNo: '통영-2024-00532',
  homePort: '통영항',
  coopName: '통영수산업협동조합',
}
