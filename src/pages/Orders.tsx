import { useEffect, useState } from 'react'
import { getMyOrders, type OrderListItem } from '../api/orders'
import './Orders.css'

// 구매자용 배송 현황 인디케이터. 판매자 처리 상태(결제완료→상품준비중→배송중→배송완료)에
// '구매 확정'까지 더해 5단계로 보여준다 (OrdersContext.ORDER_STAGES와는 별개 — 이 화면은
// 이제 로컬 목업이 아니라 GET /api/v1/users/me/orders 실데이터로 동작한다).
const TRACK_STAGES = ['결제 완료', '상품 준비중', '배송중', '배송 완료', '구매 확정']

// 백엔드 주문 상태 문자열 → 위 5단계 인디케이터 인덱스 매핑.
// 정확한 status enum 값이 스웨거에 아직 명시되어 있지 않아, 그럴듯한 후보 값들을 폭넓게
// 매핑해두었다. 목록에 없는(=아직 모르는) 값이 오더라도 절대 화면이 깨지지 않도록 항상
// 0단계(결제 완료)로 안전하게 폴백하고, 원본 status 문자열은 날짜 옆에 그대로 노출해서
// 매핑이 실제와 다르면 바로 눈에 띄게 해둔다.
// TODO: 백엔드 status enum이 확정되면 이 매핑 테이블을 정확한 값으로 교체할 것.
const STATUS_STAGE_MAP: Record<string, number> = {
  PAYMENT_COMPLETED: 0,
  PAID: 0,
  ORDER_COMPLETED: 0,
  ORDERED: 0,
  PENDING: 0,
  PREPARING: 1,
  PRODUCT_PREPARING: 1,
  IN_PREPARATION: 1,
  READY_TO_SHIP: 1,
  SHIPPING: 2,
  SHIPPED: 2,
  IN_DELIVERY: 2,
  DELIVERING: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
  SHIPPING_COMPLETED: 3,
  DELIVERY_COMPLETED: 3,
  COMPLETED: 3,
  CONFIRMED: 4,
  PURCHASE_CONFIRMED: 4,
  ORDER_CONFIRMED: 4,
}

function mapStatusToStage(status: string): number {
  const stage = STATUS_STAGE_MAP[status?.toUpperCase?.() ?? '']
  return typeof stage === 'number' ? stage : 0
}

function fmtDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// SEEAT-_3.HTM renderOrders()/.order-track 구조 참고
function Orders() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 주문내역 화면 진입 시 1회 조회. GET /api/v1/users/me/orders는 page/size 파라미터를 받고,
  // 로그인한 사용자는 Authorization 헤더(JWT)로 서버가 식별한다.
  useEffect(() => {
    const controller = new AbortController()

    async function fetchOrders() {
      setIsLoading(true)
      setLoadError(null)

      if (!localStorage.getItem('accessToken')) {
        setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      const result = await getMyOrders({ page: 0, size: 20 }, controller.signal)
      if (controller.signal.aborted) return

      if (result.ok) {
        setOrders(result.data ?? [])
      } else {
        setLoadError(result.message || '주문내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
      setIsLoading(false)
    }

    fetchOrders()
    return () => controller.abort()
  }, [])

  return (
    <div className="orders">
      <h1 className="orders__title fs-title1">주문내역</h1>
      <p className="orders__subtitle fs-body2">주문 내역과 배송 진행 상태를 확인하세요</p>

      {isLoading && <div className="orders__status fs-body2">주문내역을 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="orders__status orders__status--error fs-body2">{loadError}</div>
      )}

      {!isLoading && !loadError && orders.length === 0 && (
        <div className="orders__empty fs-body1">주문 내역이 없습니다</div>
      )}

      {!isLoading && !loadError && orders.length > 0 && (
        <div className="orders__timeline">
          {orders.map((order) => {
            const stageIndex = mapStatusToStage(order.status)

            return (
              <div className="orders__item" key={order.orderId}>
                <div className="orders__item-head">
                  <b>{order.productName}</b>
                </div>
                <div className="orders__item-date fs-caption">
                  {fmtDate(order.orderedAt)} · {order.status}
                </div>
                <div className="orders__track">
                  {TRACK_STAGES.map((label, index) => {
                    const state =
                      index < stageIndex ? 'done' : index === stageIndex ? 'now' : 'pending'
                    return (
                      <div className={`orders__step orders__step--${state}`} key={label}>
                        <div className="orders__dot">{index < stageIndex ? '✓' : ''}</div>
                        <span className="orders__label">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Orders
