import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './AdminDashboard.css'

interface PendingVerification {
  id: number
  name: string
  bizRegNumber: string
  appliedDate: string
}

const INITIAL_PENDING_VERIFICATIONS: PendingVerification[] = [
  { id: 1, name: '이정훈 선장 (거제)', bizRegNumber: '607-81-52931', appliedDate: '2026.07.30' },
  { id: 2, name: '박민수 선장 (남해)', bizRegNumber: '108-22-77406', appliedDate: '2026.08.02' },
]

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// SEEAT 관리자 대시보드: 회원 현황 요약 + 사업자 인증 대기 승인/거절
function AdminDashboard() {
  const { role } = useAuth()
  const [pendingList, setPendingList] = useState(INITIAL_PENDING_VERIFICATIONS)
  const [toast, setToast] = useState<string | null>(null)

  if (role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__empty fs-body1">관리자 전용 페이지입니다</div>
      </div>
    )
  }

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  function handleApprove(item: PendingVerification) {
    setPendingList((prev) => prev.filter((row) => row.id !== item.id))
    flashToast(`${item.name}의 사업자 인증을 승인했습니다`)
  }

  function handleReject(item: PendingVerification) {
    setPendingList((prev) => prev.filter((row) => row.id !== item.id))
    flashToast(`${item.name}의 사업자 인증을 거절했습니다`)
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__head">
        <h1 className="admin-dashboard__title fs-title1">관리자 대시보드</h1>
        <p className="admin-dashboard__subtitle fs-body2">회원 검증과 거래 모니터링을 관리합니다</p>
      </div>

      <div className="admin-dashboard__summary">
        <div className="admin-dashboard__card">
          <span className="admin-dashboard__card-label fs-caption">총 회원수</span>
          <span className="admin-dashboard__card-value mono">4,812</span>
          <span className="admin-dashboard__card-delta admin-dashboard__card-delta--up">
            ▲ 38명 (오늘)
          </span>
        </div>
        <div className="admin-dashboard__card">
          <span className="admin-dashboard__card-label fs-caption">오늘 거래액</span>
          <span className="admin-dashboard__card-value mono">{won(16233400)}</span>
          <span className="admin-dashboard__card-delta admin-dashboard__card-delta--up">
            ▲ 9.1%
          </span>
        </div>
        <div className="admin-dashboard__card">
          <span className="admin-dashboard__card-label fs-caption">사업자 인증 대기</span>
          <span className="admin-dashboard__card-value mono">{pendingList.length}</span>
        </div>
      </div>

      <h2 className="admin-dashboard__section-title fs-title2">사업자 인증 대기 목록</h2>

      {pendingList.length === 0 ? (
        <div className="admin-dashboard__empty fs-body1">인증 대기 중인 사업자가 없습니다</div>
      ) : (
        <table className="admin-dashboard__table">
          <thead>
            <tr>
              <th>성명/선박명</th>
              <th>사업자등록번호</th>
              <th>신청일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="mono">{item.bizRegNumber}</td>
                <td className="fs-caption">{item.appliedDate}</td>
                <td>
                  <div className="admin-dashboard__row-actions">
                    <button
                      type="button"
                      className="admin-dashboard__approve-btn"
                      onClick={() => handleApprove(item)}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="admin-dashboard__reject-btn"
                      onClick={() => handleReject(item)}
                    >
                      거절
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {toast && <div className="admin-dashboard__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default AdminDashboard
