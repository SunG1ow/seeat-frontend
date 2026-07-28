import { ORDER_STAGES, useOrders } from '../context/OrdersContext'
import './Orders.css'

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
          {orders.map((order) => (
            <div className="orders__item" key={order.id}>
              <div className="orders__item-head">
                <b>{order.species}</b>
                <span className="mono">{won(order.amount)}</span>
              </div>
              <div className="orders__item-date fs-caption">{order.date}</div>
              <div className="orders__track">
                {ORDER_STAGES.map((label, index) => {
                  const state =
                    index < order.stage ? 'done' : index === order.stage ? 'now' : 'pending'
                  return (
                    <div className={`orders__step orders__step--${state}`} key={label}>
                      <div className="orders__dot">{index < order.stage ? '✓' : ''}</div>
                      <span className="orders__label">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders
