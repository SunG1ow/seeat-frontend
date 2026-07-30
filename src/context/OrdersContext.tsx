import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// 판매자 주문 처리 상태(핵심 비즈니스 로직): 아래 순서로만 순차 진행 가능
// stage index: 0=결제 완료 1=상품 준비중 2=배송중 3=배송 완료
export const ORDER_STAGES = ['결제 완료', '상품 준비중', '배송중', '배송 완료']
const FINAL_STAGE = ORDER_STAGES.length - 1

export interface Order {
  id: number
  species: string
  date: string
  amount: number
  stage: number
}

interface OrdersContextValue {
  orders: Order[]
  addOrder: (order: Omit<Order, 'id'>) => void
  advanceOrderStage: (id: number) => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

// 데모용 초기 주문 내역 (SEEAT-_3.HTM 시드 데이터 그대로)
function buildInitialOrders(): Order[] {
  return [
    { id: 1, species: '참돔 3kg', date: '2026.07.14', amount: 73500, stage: 3 },
    { id: 2, species: '활전복 1kg', date: '2026.07.10', amount: 38000, stage: 3 },
    { id: 3, species: '갯벌낙지 2kg', date: '2026.07.16', amount: 31800, stage: 2 },
  ]
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(buildInitialOrders)
  const nextOrderId = useRef(orders.length + 1)

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      addOrder: (order) => {
        setOrders((prev) => [{ ...order, id: nextOrderId.current++ }, ...prev])
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
