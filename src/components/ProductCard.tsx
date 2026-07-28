import { useEffect, useState } from 'react'
import './ProductCard.css'

export type ProductStatus = 'onsale' | 'urgent' | 'soldout'

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
  product: Pick<Product, 'remain' | 'total'>,
  remainMs: number,
): ProductStatus {
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
  const percent = Math.max(0, Math.min(100, Math.round((product.remain / product.total) * 100)))

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
        <span>{product.remain}kg 남음</span>
        <span>{percent}%</span>
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
            🛒 담기
          </button>
          <button
            type="button"
            className="product-card__btn product-card__btn--primary"
            disabled={isSoldOut}
            onClick={(event) => {
              event.stopPropagation()
              onBuyNow?.(product)
            }}
          >
            구매하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
