import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// 판매자 주문 처리 상태(핵심 비즈니스 로직): 아래 순서로만 순차 진행 가능
// stage index: 0=결제 완료 1=상품 준비중 2=배송중 3=배송 완료
export const ORDER_STAGES = ['결제 완료', '상품 준비중', '배송중', '배송 완료']
const FINAL_STAGE = ORDER_STAGES.length - 1
const PREPARING_STAGE = 1
const SHIPPING_STAGE = 2

export const COURIERS = ['CJ대한통운', '한진택배', '롯데택배', '로젠택배', '우체국택배']

// 수산물(신선식품)은 단순 변심 환불이 불가하므로, 판매자가 클레임을 거절할 때
// 사유를 직접 입력하지 않으면 이 기본 사유가 자동으로 채워진다
export const DEFAULT_CLAIM_REJECT_REASON = '신선식품 특성상 단순 변심 환불 불가'

export type ClaimStatus = 'none' | 'requested' | 'approved' | 'rejected'
export type ClaimType = 'cancel' | 'refund'

export interface Order {
  id: number
  species: string
  date: string
  amount: number
  stage: number
  trackingCompany?: string
  trackingNumber?: string
  claimStatus: ClaimStatus
  claimType?: ClaimType
  claimReason?: string
  claimRejectReason?: string
  // 배송 완료 후 구매자가 구매를 확정했는지 여부('구매 확정'). 판매자가 아닌
  // 구매자만 전환할 수 있는 상태이므로 advanceOrderStage와는 별개로 관리한다
  confirmed: boolean
}

interface OrdersContextValue {
  orders: Order[]
  addOrder: (order: Omit<Order, 'id' | 'claimStatus' | 'confirmed'>) => void
  advanceOrderStage: (id: number) => void
  setTrackingInfo: (id: number, trackingCompany: string, trackingNumber: string) => void
  approveClaim: (id: number) => void
  rejectClaim: (id: number, reason: string) => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

// 데모용 초기 주문 내역 (SEEAT-_3.HTM 시드 데이터 그대로 + 배송/클레임 데모 데이터)
function buildInitialOrders(): Order[] {
  return [
    {
      id: 1,
      species: '참돔 3kg',
      date: '2026.07.14',
      amount: 73500,
      stage: 3,
      claimStatus: 'none',
      confirmed: true,
    },
    {
      id: 2,
      species: '활전복 1kg',
      date: '2026.07.10',
      amount: 38000,
      stage: 3,
      claimStatus: 'none',
      confirmed: false,
    },
    {
      id: 3,
      species: '갯벌낙지 2kg',
      date: '2026.07.16',
      amount: 31800,
      stage: 2,
      trackingCompany: 'CJ대한통운',
      trackingNumber: '1234567890',
      claimStatus: 'none',
      confirmed: false,
    },
    {
      id: 4,
      species: '병어 1kg',
      date: '2026.07.20',
      amount: 22000,
      stage: 1,
      claimStatus: 'none',
      confirmed: false,
    },
    {
      id: 5,
      species: '완도 활전복 1kg',
      date: '2026.07.18',
      amount: 41000,
      stage: 1,
      claimStatus: 'requested',
      claimType: 'refund',
      claimReason: '단순 변심으로 환불을 요청합니다',
      confirmed: false,
    },
  ]
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(buildInitialOrders)
  const nextOrderId = useRef(orders.length + 1)

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      addOrder: (order) => {
        setOrders((prev) => [
          { ...order, id: nextOrderId.current++, claimStatus: 'none', confirmed: false },
          ...prev,
        ])
      },
      // 결제 완료 → 상품 준비중 → 배송중 → 배송 완료 순으로 한 단계씩만 진행
      advanceOrderStage: (id) => {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id && order.stage < FINAL_STAGE
              ? { ...order, stage: order.stage + 1 }
              : order,
          ),
        )
      },
      // 택배사/운송장 번호를 저장하면 '상품 준비중' → '배송중'으로 자동 전환
      setTrackingInfo: (id, trackingCompany, trackingNumber) => {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id
              ? {
                  ...order,
                  trackingCompany,
                  trackingNumber,
                  stage: order.stage === PREPARING_STAGE ? SHIPPING_STAGE : order.stage,
                }
              : order,
          ),
        )
      },
      approveClaim: (id) => {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id && order.claimStatus === 'requested'
              ? { ...order, claimStatus: 'approved', claimRejectReason: undefined }
              : order,
          ),
        )
      },
      // 수산물(신선식품)은 단순 변심 환불 불가: 사유를 비워두면 기본 거절 사유가 채워진다
      rejectClaim: (id, reason) => {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id && order.claimStatus === 'requested'
              ? {
                  ...order,
                  claimStatus: 'rejected',
                  claimRejectReason: reason.trim() || DEFAULT_CLAIM_REJECT_REASON,
                }
              : order,
          ),
        )
      },
    }),
    [orders],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within an OrdersProvider')
  return ctx
}
