// 판매자 정산 관리 화면(SettlementManagement)용 데모 주문 데이터.
// OrdersContext의 ORDER_STAGES(0=결제완료 1=배송준비중 2=배송중 3=배송완료 4=구매확정)와
// 동일한 단계 체계를 공유한다. 정산 대상은 화면단에서 stage 3/4만 필터링해 사용한다.
export interface SellerOrderRecord {
  id: number
  productName: string
  orderDate: string // 'YYYY.MM.DD'
  paymentAmount: number
  stage: number
}

export function buildSellerOrderRecords(): SellerOrderRecord[] {
  return [
    { id: 1, productName: '활전복 1kg', orderDate: '2026.07.28', paymentAmount: 38000, stage: 4 },
    { id: 2, productName: '참돔 3kg', orderDate: '2026.07.26', paymentAmount: 73500, stage: 4 },
    { id: 3, productName: '갯벌낙지 2kg', orderDate: '2026.07.24', paymentAmount: 31800, stage: 3 },
    { id: 4, productName: '병어 5kg', orderDate: '2026.07.21', paymentAmount: 99000, stage: 4 },
    { id: 5, productName: '방어 2kg', orderDate: '2026.07.19', paymentAmount: 44000, stage: 3 },
    { id: 6, productName: '전어 1kg', orderDate: '2026.07.15', paymentAmount: 12000, stage: 4 },
    { id: 7, productName: '광어 2kg', orderDate: '2026.07.12', paymentAmount: 55000, stage: 3 },
    { id: 8, productName: '참치 1kg', orderDate: '2026.06.27', paymentAmount: 52000, stage: 4 },
    { id: 9, productName: '고등어 3kg', orderDate: '2026.06.20', paymentAmount: 29400, stage: 4 },
    { id: 10, productName: '활전복 1kg', orderDate: '2026.06.14', paymentAmount: 38000, stage: 3 },
    // 아직 정산 대상이 아닌(배송중 이전 단계) 주문 — 정산 내역 테이블에서는 제외되어야 한다.
    { id: 11, productName: '참돔 2kg', orderDate: '2026.07.29', paymentAmount: 49000, stage: 1 },
    { id: 12, productName: '갯벌낙지 1kg', orderDate: '2026.07.30', paymentAmount: 15900, stage: 2 },
  ]
}
