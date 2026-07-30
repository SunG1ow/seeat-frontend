import { useAuth } from '../context/AuthContext'
import { ORDER_STAGES, useOrders, type Order } from '../context/OrdersContext'
import './SettlementManagement.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

const FINAL_STAGE = ORDER_STAGES.length - 1

// 데모용 플랫폼 수수료율. 실제 정산 금액은 서버에서 계산되어 내려오는 값을 사용해야 하며,
// 이 화면에서는 어떤 방식으로도 재계산·수정할 수 없다 (읽기 전용 가드레일)
const PLATFORM_FEE_RATE = 0.05

interface SettlementRow {
  order: Order
  fee: number
  settlementAmount: number
}

function toSettlementRow(order: Order): SettlementRow {
  const fee = Math.round(order.amount * PLATFORM_FEE_RATE)
  return { order, fee, settlementAmount: order.amount - fee }
}

// 판매자 전용 정산 및 매출 조회 화면
// 핵심 비즈니스 로직: 정산 데이터는 플랫폼이 자동 계산하는 값이므로 이 화면은
// 어떤 입력/수정/삭제 컨트롤도 두지 않는 철저한 읽기 전용(Read-only) 화면이다
function SettlementManagement() {
  const { role } = useAuth()
  const { orders } = useOrders()

  if (role !== 'seller') {
    return (
      <div className="settlement-mgmt">
        <div className="settlement-mgmt__empty fs-body1">판매자 전용 페이지입니다</div>
      </div>
    )
  }

  // 정산 대상: '배송 완료' 또는 '구매 확정' 상태가 된 주문만 집계한다
  const settlementRows = orders
    .filter((order) => order.stage === FINAL_STAGE)
    .map(toSettlementRow)

  const totalRevenue = settlementRows.reduce((sum, row) => sum + row.order.amount, 0)
  const settledAmount = settlementRows
    .filter((row) => row.order.confirmed)
    .reduce((sum, row) => sum + row.settlementAmount, 0)
  const pendingAmount = settlementRows
    .filter((row) => !row.order.confirmed)
    .reduce((sum, row) => sum + row.settlementAmount, 0)

  return (
    <div className="settlement-mgmt">
      <h1 className="settlement-mgmt__title fs-title1">정산 및 매출 조회</h1>
      <p className="settlement-mgmt__subtitle fs-body2">
        플랫폼이 자동으로 계산한 정산 내역을 확인하세요
      </p>

      <div className="settlement-mgmt__summary">
        <div className="settlement-mgmt__card">
          <span className="settlement-mgmt__card-label fs-caption">총 누적 매출액</span>
          <span className="settlement-mgmt__card-value mono">{won(totalRevenue)}</span>
        </div>
        <div className="settlement-mgmt__card">
          <span className="settlement-mgmt__card-label fs-caption">정산 완료 금액</span>
          <span className="settlement-mgmt__card-value settlement-mgmt__card-value--done mono">
            {won(settledAmount)}
          </span>
        </div>
        <div className="settlement-mgmt__card">
          <span className="settlement-mgmt__card-label fs-caption">정산 예정 금액</span>
          <span className="settlement-mgmt__card-value settlement-mgmt__card-value--pending mono">
            {won(pendingAmount)}
          </span>
        </div>
      </div>

      <p className="settlement-mgmt__guardrail fs-caption">
        🔒 정산 데이터는 플랫폼에서 자동으로 계산되며, 판매자는 이 화면에서 데이터를 직접
        수정하거나 삭제할 수 없습니다
      </p>

      {settlementRows.length === 0 ? (
        <div className="settlement-mgmt__empty fs-body1">정산 대상 주문이 없습니다</div>
      ) : (
        <table className="settlement-mgmt__table">
          <thead>
            <tr>
              <th>주문일자</th>
              <th>상품명</th>
              <th>결제금액</th>
              <th>플랫폼 수수료</th>
              <th>최종 정산 금액</th>
              <th>주문 상태</th>
              <th>정산 상태</th>
            </tr>
          </thead>
          <tbody>
            {settlementRows.map(({ order, fee, settlementAmount }) => (
              <tr key={order.id}>
                <td className="fs-caption">{order.date}</td>
                <td>{order.species}</td>
                <td className="mono">{won(order.amount)}</td>
                <td className="mono settlement-mgmt__fee">
                  -{won(fee)}
                  <span className="settlement-mgmt__fee-rate">
                    ({Math.round(PLATFORM_FEE_RATE * 100)}%)
                  </span>
                </td>
                <td className="mono">{won(settlementAmount)}</td>
                <td>
                  <span className="settlement-mgmt__badge">
                    {order.confirmed ? '구매 확정' : '배송 완료'}
                  </span>
                </td>
                <td>
                  <span
                    className={`settlement-mgmt__badge settlement-mgmt__badge--${
                      order.confirmed ? 'done' : 'pending'
                    }`}
                  >
                    {order.confirmed ? '정산 완료' : '정산 예정'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default SettlementManagement
