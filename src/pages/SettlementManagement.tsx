import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { buildSellerOrderRecords } from '../data/settlements'
import './SettlementManagement.css'

// 플랫폼 판매 수수료(데모 고정값). 최종 정산 금액은 항상 플랫폼이 자동 계산하며
// 이 화면에서는 그 결과만 조회할 뿐 값을 직접 입력/수정할 수 있는 경로는 없다.
const COMMISSION_RATE = 0.08

// 정산 대상 주문 stage: OrdersContext.ORDER_STAGES 기준 3=배송완료, 4=구매확정.
// 그 이전 단계(결제완료/배송준비중/배송중) 주문은 정산 내역에서 제외된다.
const SETTLEMENT_ELIGIBLE_STAGES = [3, 4]

type SettlementStatus = '정산완료' | '정산예정'

interface SettlementRow {
  id: number
  orderDate: string
  productName: string
  paymentAmount: number
  settlementAmount: number
  status: SettlementStatus
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
}

function toSettlementRow(record: ReturnType<typeof buildSellerOrderRecords>[number]): SettlementRow {
  return {
    id: record.id,
    orderDate: record.orderDate,
    productName: record.productName,
    paymentAmount: record.paymentAmount,
    settlementAmount: Math.round(record.paymentAmount * (1 - COMMISSION_RATE)),
    status: record.stage === 4 ? '정산완료' : '정산예정',
  }
}

// 판매자 전용 정산 및 매출 조회 화면.
// 모든 값은 서버(데모 데이터)에서 자동 계산된 결과를 조회만 하는 Strictly Read-only 화면이며,
// 입력창/수정 버튼/삭제 버튼 등 데이터를 바꿀 수 있는 UI 요소를 일절 두지 않는다.
function SettlementManagement() {
  const { role } = useAuth()

  const rows = useMemo<SettlementRow[]>(() => {
    return buildSellerOrderRecords()
      .filter((record) => SETTLEMENT_ELIGIBLE_STAGES.includes(record.stage))
      .map(toSettlementRow)
      .sort((a, b) => (a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : 0))
  }, [])

  const summary = useMemo(() => {
    const thisMonth = currentYearMonth()
    return rows.reduce(
      (acc, row) => {
        acc.totalRevenue += row.paymentAmount
        if (row.status === '정산완료') {
          if (row.orderDate.startsWith(thisMonth)) {
            acc.completedThisMonth += row.settlementAmount
          }
        } else {
          acc.pendingSettlement += row.settlementAmount
        }
        return acc
      },
      { totalRevenue: 0, completedThisMonth: 0, pendingSettlement: 0 },
    )
  }, [rows])

  if (role !== 'seller') {
    return (
      <div className="settlement">
        <div className="settlement__empty fs-body1">판매자 전용 화면입니다</div>
      </div>
    )
  }

  return (
    <div className="settlement">
      <h1 className="settlement__title fs-title1">정산 및 매출 조회</h1>
      <p className="settlement__subtitle fs-body2">
        배송완료·구매확정 주문의 정산 내역이에요. 모든 금액은 플랫폼이 자동으로 계산하며, 이 화면에서
        직접 수정하거나 삭제할 수 없어요.
      </p>

      <div className="settlement__summary">
        <div className="settlement__summary-card">
          <span className="settlement__summary-label fs-body2">총 누적 매출액</span>
          <span className="settlement__summary-value mono">{won(summary.totalRevenue)}</span>
        </div>
        <div className="settlement__summary-card">
          <span className="settlement__summary-label fs-body2">이번 달 정산 완료 금액</span>
          <span className="settlement__summary-value settlement__summary-value--done mono">
            {won(summary.completedThisMonth)}
          </span>
        </div>
        <div className="settlement__summary-card">
          <span className="settlement__summary-label fs-body2">정산 예정 금액</span>
          <span className="settlement__summary-value settlement__summary-value--pending mono">
            {won(summary.pendingSettlement)}
          </span>
        </div>
      </div>

      <div className="settlement__table-wrap">
        {rows.length === 0 ? (
          <div className="settlement__empty fs-body1">정산 대상 주문이 없습니다</div>
        ) : (
          <table className="settlement__table">
            <thead>
              <tr>
                <th>주문일자</th>
                <th>상품명</th>
                <th>결제금액</th>
                <th>최종 정산 금액</th>
                <th>정산 상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="fs-caption">{row.orderDate}</td>
                  <td>{row.productName}</td>
                  <td className="mono">{won(row.paymentAmount)}</td>
                  <td className="mono">{won(row.settlementAmount)}</td>
                  <td>
                    <span
                      className={`settlement__badge settlement__badge--${
                        row.status === '정산완료' ? 'done' : 'pending'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default SettlementManagement
