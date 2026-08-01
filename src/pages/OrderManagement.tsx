import { useAuth } from '../context/AuthContext'
import { ORDER_STAGES, useOrders } from '../context/OrdersContext'
import './OrderManagement.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// 판매자 전용 주문 내역 관리 화면
// 핵심 비즈니스 로직: 주문 처리 상태는 '결제 완료' → '상품 준비중' → '배송중' → '배송 완료'
// 순서로만 한 단계씩 변경 가능하다 (건너뛰기/역행 불가)
function OrderManagement() {
  const { role } = useAuth()
  const { orders, advanceOrderStage } = useOrders()

  if (role !== 'seller') {
    return (
      <div className="order-mgmt">
        <div className="order-mgmt__empty fs-body1">판매자 전용 페이지입니다</div>
      </div>
    )
  }

  return (
    <div className="order-mgmt">
      <h1 className="order-mgmt__title fs-title1">주문 내역 관리</h1>
      <p className="order-mgmt__subtitle fs-body2">
        주문 처리 상태를 확인하고 다음 단계로 변경하세요
      </p>

      {orders.length === 0 ? (
        <div className="order-mgmt__empty fs-body1">접수된 주문이 없습니다</div>
      ) : (
        <table className="order-mgmt__table">
          <thead>
            <tr>
              <th>주문번호</th>
              <th>상품</th>
              <th>주문일</th>
              <th>결제금액</th>
              <th>처리 상태</th>
              <th>상태 변경</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isFinal = order.stage === ORDER_STAGES.length - 1
              return (
                <tr key={order.id}>
                  <td className="mono">#{order.id}</td>
                  <td>{order.species}</td>
                  <td className="fs-caption">{order.date}</td>
                  <td className="mono">{won(order.amount)}</td>
                  <td>
                    <span
                      className={`order-mgmt__badge order-mgmt__badge--stage${order.stage}`}
                    >
                      {ORDER_STAGES[order.stage]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="order-mgmt__advance-btn"
                      disabled={isFinal}
                      onClick={() => advanceOrderStage(order.id)}
                    >
                      {isFinal ? '처리 완료' : `${ORDER_STAGES[order.stage + 1]}(으)로 변경`}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default OrderManagement
