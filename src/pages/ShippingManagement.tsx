import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  COURIERS,
  DEFAULT_CLAIM_REJECT_REASON,
  useOrders,
  type ClaimStatus,
  type ClaimType,
  type Order,
} from '../context/OrdersContext'
import './ShippingManagement.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

const PREPARING_STAGE = 1

const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  cancel: '취소',
  refund: '환불',
}

const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  none: '-',
  requested: '요청됨',
  approved: '승인됨',
  rejected: '거절됨',
}

type Tab = 'shipping' | 'claims'

interface TrackingDraft {
  company: string
  number: string
}

const EMPTY_DRAFT: TrackingDraft = { company: COURIERS[0], number: '' }

// 판매자 전용 배송 및 클레임 관리 화면
// 1) 배송 및 송장 관리: '상품 준비중' 주문에 택배사/운송장 번호를 저장하면 '배송중'으로 자동 전환된다
// 2) 클레임(취소/환불) 관리: 수산물(신선식품)은 단순 변심 환불이 불가하므로,
//    거절 시 기본 사유가 자동으로 입력된다 (핵심 가드레일)
function ShippingManagement() {
  const { role } = useAuth()
  const { orders, setTrackingInfo, approveClaim, rejectClaim } = useOrders()
  const [tab, setTab] = useState<Tab>('shipping')
  const [drafts, setDrafts] = useState<Record<number, TrackingDraft>>({})
  const [rejectDrafts, setRejectDrafts] = useState<Record<number, string>>({})

  if (role !== 'seller') {
    return (
      <div className="shipping-mgmt">
        <div className="shipping-mgmt__empty fs-body1">판매자 전용 페이지입니다</div>
      </div>
    )
  }

  const preparingOrders = orders.filter((order) => order.stage === PREPARING_STAGE)
  const claimOrders = orders.filter((order) => order.claimStatus !== 'none')

  function draftFor(order: Order): TrackingDraft {
    return drafts[order.id] ?? EMPTY_DRAFT
  }

  function updateDraft(order: Order, patch: Partial<TrackingDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [order.id]: { ...(prev[order.id] ?? EMPTY_DRAFT), ...patch },
    }))
  }

  function handleSaveTracking(order: Order) {
    const draft = draftFor(order)
    if (!draft.number.trim()) return
    setTrackingInfo(order.id, draft.company, draft.number.trim())
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[order.id]
      return next
    })
  }

  function startReject(id: number) {
    setRejectDrafts((prev) => ({ ...prev, [id]: DEFAULT_CLAIM_REJECT_REASON }))
  }

  function cancelReject(id: number) {
    setRejectDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function confirmReject(id: number) {
    rejectClaim(id, rejectDrafts[id] ?? DEFAULT_CLAIM_REJECT_REASON)
    cancelReject(id)
  }

  return (
    <div className="shipping-mgmt">
      <h1 className="shipping-mgmt__title fs-title1">배송 및 클레임 관리</h1>
      <p className="shipping-mgmt__subtitle fs-body2">
        송장을 등록해 배송을 시작하고, 취소/환불 요청을 처리하세요
      </p>

      <div className="shipping-mgmt__tabs">
        <button
          type="button"
          className={`shipping-mgmt__tab${tab === 'shipping' ? ' shipping-mgmt__tab--active' : ''}`}
          onClick={() => setTab('shipping')}
        >
          배송 및 송장 관리
        </button>
        <button
          type="button"
          className={`shipping-mgmt__tab${tab === 'claims' ? ' shipping-mgmt__tab--active' : ''}`}
          onClick={() => setTab('claims')}
        >
          클레임(취소/환불) 관리
          {claimOrders.some((order) => order.claimStatus === 'requested') && (
            <span className="shipping-mgmt__tab-dot" />
          )}
        </button>
      </div>

      {tab === 'shipping' ? (
        preparingOrders.length === 0 ? (
          <div className="shipping-mgmt__empty fs-body1">송장 등록이 필요한 주문이 없습니다</div>
        ) : (
          <>
            <p className="shipping-mgmt__hint fs-caption">
              운송장 번호를 저장하면 주문 상태가 자동으로 '배송중'으로 변경됩니다
            </p>
            <table className="shipping-mgmt__table">
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>상품</th>
                  <th>주문일</th>
                  <th>결제금액</th>
                  <th>택배사</th>
                  <th>운송장 번호</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preparingOrders.map((order) => {
                  const draft = draftFor(order)
                  return (
                    <tr key={order.id}>
                      <td className="mono">#{order.id}</td>
                      <td>{order.species}</td>
                      <td className="fs-caption">{order.date}</td>
                      <td className="mono">{won(order.amount)}</td>
                      <td>
                        <select
                          className="shipping-mgmt__select"
                          value={draft.company}
                          onChange={(e) => updateDraft(order, { company: e.target.value })}
                        >
                          {COURIERS.map((courier) => (
                            <option key={courier} value={courier}>
                              {courier}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="shipping-mgmt__input"
                          placeholder="운송장 번호 입력"
                          value={draft.number}
                          onChange={(e) => updateDraft(order, { number: e.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="shipping-mgmt__save-btn"
                          disabled={!draft.number.trim()}
                          onClick={() => handleSaveTracking(order)}
                        >
                          저장
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )
      ) : claimOrders.length === 0 ? (
        <div className="shipping-mgmt__empty fs-body1">접수된 취소/환불 요청이 없습니다</div>
      ) : (
        <div className="shipping-mgmt__claims">
          {claimOrders.map((order) => {
            const isRejecting = order.id in rejectDrafts
            return (
              <div className="shipping-mgmt__claim-card" key={order.id}>
                <div className="shipping-mgmt__claim-head">
                  <div>
                    <b>
                      #{order.id} {order.species}
                    </b>
                    <span className="fs-caption shipping-mgmt__claim-date">{order.date}</span>
                  </div>
                  <span className="mono">{won(order.amount)}</span>
                </div>

                <div className="shipping-mgmt__claim-meta">
                  <span className="shipping-mgmt__claim-type">
                    {order.claimType ? CLAIM_TYPE_LABEL[order.claimType] : '-'} 요청
                  </span>
                  <span
                    className={`shipping-mgmt__badge shipping-mgmt__badge--${order.claimStatus}`}
                  >
                    {CLAIM_STATUS_LABEL[order.claimStatus]}
                  </span>
                </div>

                {order.claimReason && (
                  <p className="shipping-mgmt__claim-reason fs-body2">
                    구매자 사유: {order.claimReason}
                  </p>
                )}

                {order.claimStatus === 'rejected' && order.claimRejectReason && (
                  <p className="shipping-mgmt__claim-reason shipping-mgmt__claim-reason--rejected fs-body2">
                    거절 사유: {order.claimRejectReason}
                  </p>
                )}

                {order.claimStatus === 'requested' &&
                  (isRejecting ? (
                    <div className="shipping-mgmt__reject-form">
                      <textarea
                        className="shipping-mgmt__textarea"
                        value={rejectDrafts[order.id]}
                        onChange={(e) =>
                          setRejectDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                      />
                      <div className="shipping-mgmt__reject-form-actions">
                        <button
                          type="button"
                          className="shipping-mgmt__cancel-btn"
                          onClick={() => cancelReject(order.id)}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className="shipping-mgmt__reject-btn"
                          onClick={() => confirmReject(order.id)}
                        >
                          거절 확정
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="shipping-mgmt__claim-actions">
                      <button
                        type="button"
                        className="shipping-mgmt__approve-btn"
                        onClick={() => approveClaim(order.id)}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        className="shipping-mgmt__reject-btn"
                        onClick={() => startReject(order.id)}
                      >
                        거절
                      </button>
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ShippingManagement
