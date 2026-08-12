import type { ApiProduct } from '../api/products'
import { useCountdown } from '../hooks/useCountdown'
import './ProductResultCard.css'

interface ProductResultCardProps {
  product: ApiProduct
  onAddToCart: (product: ApiProduct) => void
  onViewDetail: (product: ApiProduct) => void
  /** 장바구니 담기 요청이 진행 중이면 버튼을 잠깐 비활성화한다 (중복 클릭 방지) */
  isAddingToCart?: boolean
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// GET /api/v1/products/search 연동 상품 카드 — Home 캐러셀·Search 그리드 공용.
// (ProductCard.tsx는 판매자 상품관리 데모용 목업 Product 타입에 묶여 있어 그대로 재사용할 수
//  없다. 실제 API 필드(ApiProduct)만으로 동작하는 카드를 별도로 두고 여기서 공유한다.)
function ProductResultCard({
  product,
  onAddToCart,
  onViewDetail,
  isAddingToCart = false,
}: ProductResultCardProps) {
  // /search 응답의 auctionDeadline·stockQuantity를 그대로 쓴다 — 카드마다 상세 API를
  // 따로 호출하지 않는다(N+1 방지). 남은 시간만 이 훅이 1초마다 재계산해서 보여준다.
  const countdown = useCountdown(product.auctionDeadline)

  return (
    <div
      className="product-result-card"
      onClick={() => onViewDetail(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onViewDetail(product)
      }}
    >
      <div className="product-result-card__thumb">
        {product.thumbnailUrl && (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>

      {product.tags?.length > 0 && (
        <div className="product-result-card__tags">
          {product.tags.map((tag) => (
            <span className="product-result-card__tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="product-result-card__name fs-body1">{product.name}</div>
      <div className="product-result-card__origin fs-caption">
        {product.origin} · {product.weight}
        {product.weightUnit}
      </div>
      <div className="product-result-card__price fs-body1 mono">{won(product.price)}</div>

      <div className="product-result-card__meta">
        <span
          className={
            'product-result-card__countdown mono' +
            (countdown.isExpired
              ? ' product-result-card__countdown--expired'
              : countdown.isUrgent
                ? ' product-result-card__countdown--urgent'
                : '')
          }
        >
          {countdown.isExpired ? '마감' : `⏱ ${countdown.label}`}
        </span>
        <span className="product-result-card__stock fs-caption mono">
          {product.stockQuantity}
          {product.weightUnit} 남음
        </span>
      </div>

      <div className="product-result-card__actions">
        <button
          type="button"
          className="product-result-card__btn product-result-card__btn--outline"
          disabled={isAddingToCart}
          onClick={(event) => {
            event.stopPropagation()
            onAddToCart(product)
          }}
        >
          {isAddingToCart ? '담는 중...' : '장바구니'}
        </button>
        <button
          type="button"
          className="product-result-card__btn product-result-card__btn--primary"
          onClick={(event) => {
            event.stopPropagation()
            onViewDetail(product)
          }}
        >
          구매하기
        </button>
      </div>
    </div>
  )
}

export default ProductResultCard
