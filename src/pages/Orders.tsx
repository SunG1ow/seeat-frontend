import { ORDER_STAGES, useOrders } from '../context/OrdersContext'
import './Orders.css'

// 구매자용 배송 현황 인디케이터 — 판매자 처리 상태(ORDER_STAGES, 4단계)는 그대로 두고,
// 이미 존재하는 order.confirmed(구매확정 여부)를 이어 붙여 이 화면에서만 5단계로 보여준다.
const TRACK_STAGES = [...ORDER_STAGES, '구매 확정']

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// SEEAT-_3.HTM renderOrders()/.order-track 구조 참고
function Orders() {
  const { orders } = useOrders()

  return (
    <div className="orders">
      <h1 className="orders__title fs-title1">주문내역</h1>
      <p className="orders__subtitle fs-body2">주문 내역과 배송 진행 상태를 확인하세요</p>

      {orders.length === 0 ? (
        <div className="orders__empty fs-body1">주문 내역이 없습니다</div>
      ) : (
        <div className="orders__timeline">
          {orders.map((order) => {
            const stageIndex = order.confirmed ? TRACK_STAGES.length - 1 : order.stage

            return (
              <div className="orders__item" key={order.id}>
                <div className="orders__item-head">
                  <b>{order.species}</b>
                  <span className="mono">{won(order.amount)}</span>
                </div>
                <div className="orders__item-date fs-caption">{order.date}</div>
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
