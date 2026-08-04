import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductsContext'
import { getProductStatus } from '../components/ProductCard'
import type { Product, SellerListingStatus } from '../components/ProductCard'
import './ProductManagement.css'

// 로그인 시 계정 유형(역할)만 저장하고 개별 판매자(개인 어업인) 성명은 저장하지 않아, 이 화면에서는
// 데모 데이터와 동일한 판매자명을 "현재 로그인한 판매자"로 취급해 본인이 등록한 상품만 걸러낸다.
const CURRENT_SELLER_NAME = '김만수 선장'

const STATUS_OPTIONS: { id: SellerListingStatus; label: string }[] = [
  { id: 'onsale', label: '판매중' },
  { id: 'soldout', label: '품절' },
  { id: 'suspended', label: '판매중지' },
]

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function formatRemaining(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

const LISTING_STATUS_LABEL = {
  onsale: '판매중',
  urgent: '마감임박',
  soldout: '매진',
} as const

function ProductManagement() {
  const { role } = useAuth()
  const { products, updateProduct } = useProducts()
  const navigate = useNavigate()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [stockDraft, setStockDraft] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // '마감' 열의 카운트다운은 실시간으로 흘러야 하므로 1초마다 기준 시각을 다시 잡는다.
  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2000)
  }

  if (role !== 'seller') {
    return (
      <div className="manage__denied fs-body1">
        판매자 계정으로 로그인해야 상품을 관리할 수 있습니다.
        <button type="button" onClick={() => navigate('/login')}>
          로그인 하러가기
        </button>
      </div>
    )
  }

  const myProducts = products.filter((p) => p.seller === CURRENT_SELLER_NAME)
  const editingProduct = myProducts.find((p) => p.id === editingId)

  // 오늘 매출: (전체 - 잔여) × 단가를 상품별로 합산한 판매 완료분 금액
  const todayRevenue = myProducts.reduce((sum, p) => sum + (p.total - p.remain) * p.price, 0)
  const averagePrice = myProducts.length
    ? Math.round(myProducts.reduce((sum, p) => sum + p.price, 0) / myProducts.length)
    : 0
  // 정산 예정 금액: 플랫폼 수수료(5%)를 제외한 익일 정산 예정분 (SettlementManagement와 동일한 수수료율)
  const pendingSettlement = Math.round(todayRevenue * 0.95)

  function openEdit(product: Product) {
    setEditingId(product.id)
    setPriceDraft(String(product.price))
    setStockDraft(String(product.remain))
    setFormError(null)
  }

  function closeEdit() {
    setEditingId(null)
    setFormError(null)
  }

  function handleSave() {
    if (!editingProduct) return
    const nextPrice = Number(priceDraft)
    const nextStock = Number(stockDraft)
    if (!priceDraft || Number.isNaN(nextPrice) || nextPrice <= 0) {
      setFormError('가격을 올바르게 입력해주세요')
      return
    }
    if (!stockDraft || Number.isNaN(nextStock) || nextStock < 0) {
      setFormError('판매 수량을 올바르게 입력해주세요')
      return
    }

    // 재고 수정은 "현재 판매 가능 수량을 이 값으로 다시 맞춘다"는 의미로 total/remain을 함께 갱신한다.
    updateProduct(editingProduct.id, { price: nextPrice, total: nextStock, remain: nextStock })
    flashToast(`${editingProduct.species} 상품 정보가 수정되었습니다`)
    closeEdit()
  }

  function handleStatusChange(product: Product, status: SellerListingStatus) {
    updateProduct(product.id, { sellerStatus: status })
    flashToast(`${product.species} 상품이 '${STATUS_OPTIONS.find((s) => s.id === status)?.label}' 상태로 변경되었습니다`)
  }

  return (
    <div className="manage">
      <h1 className="manage__title fs-title1">수산물 상품 관리</h1>
      <p className="manage__subtitle fs-body2">
        {CURRENT_SELLER_NAME}님이 등록한 상품의 가격·재고·판매 상태를 관리합니다
      </p>

      <div className="manage__summary">
        <div className="manage__stat-card">
          <div className="manage__stat-card-label fs-caption">오늘 매출</div>
          <div className="manage__stat-card-value mono">{won(todayRevenue)}</div>
        </div>
        <div className="manage__stat-card">
          <div className="manage__stat-card-label fs-caption">등록 상품 수</div>
          <div className="manage__stat-card-value mono">{myProducts.length}</div>
        </div>
        <div className="manage__stat-card">
          <div className="manage__stat-card-label fs-caption">평균 낙찰가</div>
          <div className="manage__stat-card-value mono">{won(averagePrice)}</div>
        </div>
        <div className="manage__stat-card">
          <div className="manage__stat-card-label fs-caption">정산 예정 금액</div>
          <div className="manage__stat-card-value mono">{won(pendingSettlement)}</div>
          <div className="manage__stat-card-delta fs-caption">익일 정산</div>
        </div>
      </div>

      <div className="manage__section-head">
        <h2 className="fs-title2">등록 상품 목록</h2>
      </div>

      {myProducts.length === 0 ? (
        <div className="manage__empty fs-body2">등록된 상품이 없습니다</div>
      ) : (
        <table className="manage__table">
          <thead>
            <tr>
              <th>어종</th>
              <th>지역</th>
              <th>보관</th>
              <th>단가</th>
              <th>잔여/전체</th>
              <th>마감</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {myProducts.map((product) => {
              const currentStatus = product.sellerStatus ?? 'onsale'
              const remainMs = product.deadlineMs - now
              // 잔여 수량 소진 또는 판매 기한 종료(+ 판매자가 직접 품절/중지 처리한 경우)를 모두 '매진'으로 취급한다
              const listingStatus = getProductStatus(product, remainMs)
              const isClosed = listingStatus === 'soldout'

              return (
                <tr key={product.id}>
                  <td>{product.species}</td>
                  <td>{product.region}</td>
                  <td>{product.storage}</td>
                  <td className="mono">{won(product.price)}</td>
                  <td className="mono">
                    {product.remain}/{product.total}kg
                  </td>
                  <td className="mono">{isClosed ? '마감' : formatRemaining(remainMs)}</td>
                  <td>
                    <span className={`manage__badge manage__badge--${listingStatus}`}>
                      {LISTING_STATUS_LABEL[listingStatus]}
                    </span>
                  </td>
                  <td>
                    <div className="manage__row-actions">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`manage__status-btn manage__status-btn--${option.id}${
                            currentStatus === option.id ? ' manage__status-btn--active' : ''
                          }`}
                          onClick={() => handleStatusChange(product, option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                      <button type="button" className="manage__edit-btn" onClick={() => openEdit(product)}>
                        가격·재고 수정
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {editingProduct && (
        <div className="manage__modal-overlay" onClick={closeEdit}>
          <div className="manage__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="manage__modal-title">{editingProduct.species} 정보 수정</h3>

            <div className="manage__modal-field">
              <label>어종 (수정 불가)</label>
              <input type="text" value={editingProduct.species} readOnly disabled />
            </div>

            <div className="manage__modal-field">
              <label>원산지 (수정 불가)</label>
              <input type="text" value={editingProduct.region} readOnly disabled />
            </div>

            <p className="manage__modal-hint fs-caption">
              수산업법상 원산지 위조 및 허위 등록을 막기 위해 최초 등록된 어종·원산지는 어떤
              경우에도 수정할 수 없습니다. 가격과 판매 수량만 변경할 수 있습니다.
            </p>

            <div className="manage__modal-field">
              <label>가격 (원/kg)</label>
              <input
                type="number"
                min={0}
                value={priceDraft}
                onChange={(event) => setPriceDraft(event.target.value)}
              />
            </div>

            <div className="manage__modal-field">
              <label>판매 수량 (kg)</label>
              <input
                type="number"
                min={0}
                value={stockDraft}
                onChange={(event) => setStockDraft(event.target.value)}
              />
            </div>

            {formError && <p className="manage__modal-error fs-body2">{formError}</p>}

            <div className="manage__modal-actions">
              <button
                type="button"
                className="manage__modal-btn manage__modal-btn--cancel"
                onClick={closeEdit}
              >
                취소
              </button>
              <button
                type="button"
                className="manage__modal-btn manage__modal-btn--confirm"
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="manage__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default ProductManagement
