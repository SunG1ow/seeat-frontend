import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSellerSettlements, type SettlementItem } from '../api/settlements'
import './SettlementManagement.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function fmtDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 판매자 전용 정산 및 매출 조회 화면
// 핵심 비즈니스 로직: 정산 데이터는 플랫폼이 자동 계산하는 값이므로 이 화면은
// 어떤 입력/수정/삭제 컨트롤도 두지 않는 철저한 읽기 전용(Read-only) 화면이다
function SettlementManagement() {
  const { role } = useAuth()

  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // GET /api/v1/seller/settlements — 화면 진입 시 1회 조회. 로그인한 판매자는
  // Authorization 헤더(JWT, api client 인터셉터가 자동 첨부)로 서버가 식별한다.
  useEffect(() => {
    if (role !== 'seller') return

    const controller = new AbortController()

    async function fetchSettlements() {
      setIsLoading(true)
      setLoadError(null)

      if (!localStorage.getItem('accessToken')) {
        setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      const result = await getSellerSettlements({}, controller.signal)
      if (controller.signal.aborted) return

      if (result.ok) {
        setSettlements(result.data ?? [])
      } else {
        setLoadError(result.message || '정산 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
      setIsLoading(false)
    }

    fetchSettlements()
    return () => controller.abort()
  }, [role])

  if (role !== 'seller') {
    return (
      <div className="settlement-mgmt">
        <div className="settlement-mgmt__empty fs-body1">판매자 전용 페이지입니다</div>
      </div>
    )
  }

  // 총 정산 건수/금액만 응답에 실제로 있는 값(amount)을 그대로 합산한 것이다.
  // "정산완료/정산예정" 같은 구분이나 플랫폼 수수료는 API 응답에 없는 값이라
  // 임의로 계산해 만들어내지 않는다(status는 스웨거상 string으로만 정의되어 있어
  // 실제 값이 무엇인지 확정되지 않았다).
  const totalCount = settlements.length
  const totalAmount = settlements.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="settlement-mgmt">
      <h1 className="settlement-mgmt__title fs-title1">정산 및 매출 조회</h1>
      <p className="settlement-mgmt__subtitle fs-body2">
        플랫폼이 자동으로 계산한 정산 내역을 확인하세요
      </p>

      <div className="settlement-mgmt__summary">
        <div className="settlement-mgmt__card">
          <span className="settlement-mgmt__card-label fs-caption">총 정산 건수</span>
          <span className="settlement-mgmt__card-value mono">{totalCount}</span>
        </div>
        <div className="settlement-mgmt__card">
          <span className="settlement-mgmt__card-label fs-caption">총 정산 금액</span>
          <span className="settlement-mgmt__card-value mono">{won(totalAmount)}</span>
        </div>
      </div>

      <p className="settlement-mgmt__guardrail fs-caption">
        🔒 정산 데이터는 플랫폼에서 자동으로 계산되며, 판매자는 이 화면에서 데이터를 직접
        수정하거나 삭제할 수 없습니다
      </p>

      {isLoading && <div className="settlement-mgmt__status fs-body2">정산 내역을 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="settlement-mgmt__status settlement-mgmt__status--error fs-body2">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && settlements.length === 0 && (
        <div className="settlement-mgmt__empty fs-body1">정산 대상 주문이 없습니다</div>
      )}

      {!isLoading && !loadError && settlements.length > 0 && (
        <table className="settlement-mgmt__table">
          <thead>
            <tr>
              <th>정산 ID</th>
              <th>주문번호</th>
              <th>정산 금액</th>
              <th>정산 상태</th>
              <th>정산 일시</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((row) => (
              <tr key={row.settlementId}>
                <td className="mono">{row.settlementId}</td>
                <td className="mono">#{row.orderId}</td>
                <td className="mono">{won(row.amount)}</td>
                <td>
                  {/* status는 스웨거상 string으로만 정의되어 있고 실제 값이 확정되지 않아
                      임의로 라벨/색상을 매핑하지 않고 서버가 내려준 문자열을 그대로 보여준다 */}
                  <span className="settlement-mgmt__badge">{row.status}</span>
                </td>
                <td className="fs-caption">{fmtDateTime(row.settledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default SettlementManagement
