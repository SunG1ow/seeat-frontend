import { useEffect, useState, type MouseEvent } from 'react'
import './ProductCard.css'

export type ProductStatus = 'onsale' | 'urgent' | 'soldout'

// §요구사항 2: 의무위판 어종은 수협 등 지정 위판장을 거치지 않는 직거래(구매)가 수산업협동조합법상 금지된다.
export const MANDATORY_BLOCK_MESSAGE = '수협 의무위판 대상 어종으로 직거래가 불가합니다'

// ProductManagement.tsx(판매자 상품관리 화면)에서 판매자가 직접 지정하는 수동 판매상태.
// 미지정(undefined)은 'onsale'과 동일하게 취급해 기존 데모 상품과 호환된다.
export type SellerListingStatus = 'onsale' | 'soldout' | 'suspended'

export interface Product {
  id: number
  species: string
  grade: string
  storage: string
  region: string
  seller: string
  price: number
  total: number
  remain: number
  deadlineMs: number
  emoji: string
  mandatory?: boolean
  sellerStatus?: SellerListingStatus
  /** 최근 7일 평균 시세 추이 (상세 화면 스파크라인용) */
  trend?: number[]
}

interface ProductCardProps {
  product: Product
  hideTimer?: boolean
  onAddToCart?: (product: Product) => void
  /** SEEAT-_3.HTM cardHtml처럼 카드 전체 클릭과 '구매하기' 버튼 클릭이 동일하게 상세 화면으로 이동한다 */
  onBuyNow?: (product: Product) => void
}

// 상태 계산 로직: ProductCard 내부(실시간 카운트다운)와 검색 화면의 상태 필터링에서 공유한다.
export function getProductStatus(
  product: Pick<Product, 'remain' | 'total' | 'sellerStatus'>,
  remainMs: number,
): ProductStatus {
  // 판매자가 상품관리 화면에서 '품절' 또는 '판매중지'로 직접 지정한 경우, 재고/마감시간과
  // 무관하게 구매자 화면에서는 매진과 동일하게(구매 불가) 노출한다.
  if (product.sellerStatus === 'soldout' || product.sellerStatus === 'suspended') return 'soldout'
  const isSoldOut = product.remain <= 0 || remainMs <= 0
  if (isSoldOut) return 'soldout'
  const isUrgent = remainMs < 10 * 60 * 1000 || product.remain / product.total < 0.2
  return isUrgent ? 'urgent' : 'onsale'
}

function formatRemaining(ms: number) {
  if (ms <= 0) return '마감'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function ProductCard({ product, hideTimer = false, onAddToCart, onBuyNow }: ProductCardProps) {
  const [remainMs, setRemainMs] = useState(() => product.deadlineMs - Date.now())
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)

  // deadlineMs 기준으로 매초 재계산 — setInterval 누적 오차를 피하기 위해 Date.now()를 다시 기준삼는다.
  useEffect(() => {
    const tick = () => setRemainMs(product.deadlineMs - Date.now())
    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [product.deadlineMs])

  const status = getProductStatus(product, remainMs)
  const isSoldOut = status === 'soldout'
  const isUrgent = status === 'urgent'
  const statusLabel = isSoldOut ? '매진' : isUrgent ? '마감임박' : '판매중'
  // (current_stock / initial_stock) * 100 — product.remain/product.total은 각각 백엔드의
  // current_stock/initial_stock에 대응한다.
  const percent = Math.max(0, Math.min(100, Math.round((product.remain / product.total) * 100)))

  function handleBuyNowClick(event: MouseEvent) {
    event.stopPropagation()
    if (product.mandatory) {
      setBlockedMsg(MANDATORY_BLOCK_MESSAGE)
      window.setTimeout(() => setBlockedMsg(null), 2000)
      return
    }
    onBuyNow?.(product)
  }

  return (
    <div className="product-card" onClick={() => onBuyNow?.(product)}>
      <div className="product-card__thumb" aria-hidden="true">
        {product.emoji}
      </div>

      <div className="product-card__badges">
        <span className="product-card__badge product-card__badge--region">{product.region}</span>
        {product.mandatory && (
          <span className="product-card__badge product-card__badge--mandatory">의무위판</span>
        )}
        <span className={`product-card__badge product-card__badge--status-${status}`}>
          {statusLabel}
        </span>
      </div>

      <div className="product-card__title fs-title2">
        {product.species}
        <span className="product-card__meta fs-body2">
          {' '}
          · {product.grade}등급 · {product.storage}
        </span>
      </div>
      <div className="product-card__seller fs-body2">{product.seller}</div>

      <div className="product-card__price-row">
        <span className="product-card__price fs-body1">
          {won(product.price)} <small>/kg</small>
        </span>
      </div>

      <div className="product-card__gauge">
        <div className="product-card__gauge-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="product-card__gauge-label fs-caption mono">
        {product.remain}kg 남음 · {percent}% 남음
      </div>

      <div
        className={`product-card__footer${hideTimer ? ' product-card__footer--actions-only' : ''}`}
      >
        {!hideTimer && (
          <span
            className={`product-card__timer mono${isUrgent ? ' product-card__timer--blink' : ''}`}
          >
            {isSoldOut ? '마감' : `⏱ ${formatRemaining(remainMs)}`}
          </span>
        )}
        <div className="product-card__actions">
          <button
            type="button"
            className="product-card__btn product-card__btn--outline"
            disabled={isSoldOut}
            onClick={(event) => {
              event.stopPropagation()
              onAddToCart?.(product)
            }}
          >
            장바구니
          </button>
          <button
            type="button"
            className={`product-card__btn product-card__btn--primary${
              product.mandatory ? ' product-card__btn--mandatory' : ''
            }`}
            disabled={isSoldOut}
            title={product.mandatory ? MANDATORY_BLOCK_MESSAGE : undefined}
            onClick={handleBuyNowClick}
          >
            구매하기
          </button>
        </div>
      </div>

      {blockedMsg && <div className="product-card__blocked-toast fs-caption">{blockedMsg}</div>}
    </div>
  )
}

export default ProductCard
