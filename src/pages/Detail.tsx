import { useEffect, useState, type WheelEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProductStatus } from '../components/ProductCard'
import { useProducts } from '../context/ProductsContext'
import { useCart } from '../context/CartContext'
import './Detail.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function fmtTime(ms: number) {
  if (ms <= 0) return '마감'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// SEEAT-_3.HTM sparklineHtml(trend, true) 참고 — 상세 화면은 큰 사이즈(최대 60px)로 그린다
function sparklineBars(trend: number[]) {
  const max = Math.max(...trend)
  const min = Math.min(...trend)
  const range = max - min || 1
  return trend.map((value, index) => ({
    value,
    height: 8 + Math.round(((value - min) / range) * 52),
    isLast: index === trend.length - 1,
  }))
}

function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProduct, purchase } = useProducts()
  const { addItem } = useCart()
  const product = getProduct(Number(id))

  const [qty, setQty] = useState(1)
  const [remainMs, setRemainMs] = useState(() => (product ? product.deadlineMs - Date.now() : 0))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    const tick = () => setRemainMs(product.deadlineMs - Date.now())
    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [product?.deadlineMs])

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  if (!product) {
    return (
      <div className="detail__not-found fs-body1">
        상품을 찾을 수 없습니다.
        <button type="button" onClick={() => navigate('/')}>
          홈으로
        </button>
      </div>
    )
  }

  const status = getProductStatus(product, remainMs)
  const isSoldOut = status === 'soldout'
  const percent = Math.max(0, Math.min(100, Math.round((product.remain / product.total) * 100)))
  const total = qty * product.price

  function changeQty(delta: number) {
    setQty((prev) => Math.max(1, prev + delta))
  }

  function handleQtyInput(value: string) {
    const parsed = Math.floor(Number(value))
    setQty(Number.isFinite(parsed) && parsed >= 1 ? parsed : 1)
  }

  // §4.3.5: 숫자 입력창은 마우스 스크롤 휠 이벤트로도 수량을 조절할 수 있어야 한다
  function handleWheel(event: WheelEvent<HTMLInputElement>) {
    changeQty(event.deltaY < 0 ? 1 : -1)
  }

  // TS는 클로저 안에서 앞선 `if (!product) return` 좁히기를 유지하지 않으므로 지역 변수로 다시 고정한다.
  function handlePurchase() {
    const current = product
    if (!current) return
    if (qty > current.remain) {
      flashToast('재고보다 많은 수량은 구매할 수 없습니다')
      return
    }
    purchase(current.id, qty)
    flashToast(`${current.species} ${qty}kg 구매가 완료되었습니다 (${won(qty * current.price)}) · 배송 준비 중`)
  }

  function handleAddToCart() {
    const current = product
    if (!current) return
    if (qty > current.remain) {
      flashToast('재고보다 많은 수량은 담을 수 없습니다')
      return
    }
    addItem(current.id, qty)
    flashToast(`${current.species}이(가) 장바구니에 담겼습니다`)
  }

  return (
    <div className="detail">
      <button type="button" className="detail__back fs-body2" onClick={() => navigate(-1)}>
        ← 목록으로
      </button>

      <div className="detail__layout">
        <div>
          <div className="detail__thumb" aria-hidden="true">
            {product.emoji}
          </div>
          <div className="detail__trend">
            <h4 className="fs-caption">최근 7일 평균 시세 추이 (원/kg)</h4>
            <div className="detail__sparkline">
              {sparklineBars(product.trend ?? []).map((bar, index) => (
                <div
                  key={index}
                  className={`detail__sparkline-bar${bar.isLast ? ' detail__sparkline-bar--last' : ''}`}
                  style={{ height: `${bar.height}px` }}
                  title={won(bar.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="detail__panel">
          <div className="detail__badges">
            <span className="detail__badge detail__badge--region">{product.region}</span>
            {product.mandatory && (
              <span className="detail__badge detail__badge--mandatory">의무위판 어종</span>
            )}
          </div>
          <h1 className="detail__title">
            {product.species} ({product.grade}등급)
          </h1>
          <div className="detail__seller fs-body2">{product.seller}</div>

          <div className="detail__stat-row">
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">현재가</div>
              <div className="detail__stat-value mono">{won(product.price)}/kg</div>
            </div>
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">잔여수량</div>
              <div className="detail__stat-value mono">
                {product.remain} / {product.total}kg
              </div>
            </div>
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">마감까지</div>
              <div className="detail__big-timer mono">{isSoldOut ? '마감' : fmtTime(remainMs)}</div>
            </div>
          </div>

          <div className="detail__gauge">
            <div className="detail__gauge-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="detail__qty-control">
            <button type="button" onClick={() => changeQty(-1)} aria-label="수량 감소">
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(event) => handleQtyInput(event.target.value)}
              onWheel={handleWheel}
            />
            <button type="button" onClick={() => changeQty(1)} aria-label="수량 증가">
              +
            </button>
            <span className="detail__storage fs-caption">{product.storage} · kg 단위</span>
          </div>

          <div className="detail__total-line">
            <span>결제 예정 금액</span>
            <span className="detail__amount mono">{won(total)}</span>
          </div>

          <div className="detail__actions">
            <button
              type="button"
              className="detail__cart-btn"
              disabled={isSoldOut}
              onClick={handleAddToCart}
            >
              장바구니 담기
            </button>
            <button
              type="button"
              className="detail__buy-btn"
              disabled={isSoldOut}
              onClick={handlePurchase}
            >
              {isSoldOut ? '매진되었습니다' : '선착순 구매하기'}
            </button>
          </div>

          <div className="detail__seller-box fs-caption">
            판매자: {product.seller} · 원산지 직송 · 위판 낙찰 즉시 발송됩니다. 교환/환불은 수산물
            특성상 신선도 이상 시에만 가능하며, 결제 후 7일 이내 청약철회가 가능합니다.
          </div>
        </div>
      </div>

      {toast && <div className="detail__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Detail
