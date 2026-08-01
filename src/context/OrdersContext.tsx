import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// SEEAT-_3.HTM의 orders 배열 + orderStages 구조 참고
// stage index: 0=결제완료 1=배송준비중 2=배송중 3=배송완료 4=구매확정
export const ORDER_STAGES = ['결제완료', '배송준비중', '배송중', '배송완료', '구매확정']

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
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

// 데모용 초기 주문 내역 (SEEAT-_3.HTM 시드 데이터 그대로)
function buildInitialOrders(): Order[] {
  return [
    { id: 1, species: '참돔 3kg', date: '2026.07.14', amount: 73500, stage: 4 },
    { id: 2, species: '활전복 1kg', date: '2026.07.10', amount: 38000, stage: 4 },
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
