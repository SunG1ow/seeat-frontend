import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductResultCard from './ProductResultCard'
import { searchProducts, type ApiProduct } from '../api/products'
import { addCartItem } from '../api/cart'
import { useCart } from '../context/CartContext'
import WholesaleAveragePrice from './WholesaleAveragePrice'
import './Home.css'

// SEEAT-_3.HTM noticePosts 시드 데이터 중 최신 3건 참고 (공지사항 화면과는 별개의 홈 미리보기용 더미)
const NOTICE_PREVIEW = [
  { id: 1, title: '[공지] 추석 연휴 위판 일정 안내', date: '07.15' },
  { id: 2, title: '[공지] 결제수단 추가 안내 (계좌이체)', date: '07.10' },
  { id: 3, title: '여름철 활어 배송 유의사항 안내', date: '07.05' },
]

function Home() {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  // 같은 상품 카드를 연타해도 요청이 겹쳐 나가지 않도록 진행 중인 productId를 추적한다
  // (Cart.tsx의 removingIds와 동일한 패턴).
  const [addingProductIds, setAddingProductIds] = useState<Set<number>>(new Set())

  // 상품 목록 (GET /api/v1/products/search) — 홈 화면 진입 시 1회 조회
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function fetchProducts() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const content = await searchProducts({ page: 0, size: 20 }, controller.signal)
        setProducts(content)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[home] 상품 목록 조회 실패:', error)
        setLoadError('상품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [])

  // POST /api/v1/cart/items 호출 → success: true일 때만 성공 토스트를 띄운다.
  // success: false거나 통신 자체가 실패(catch)해도 무조건 성공으로 보이는 일이 없도록
  // addCartItem()의 반환값(ok)을 반드시 확인한다.
  async function handleAddToCart(product: ApiProduct) {
    if (addingProductIds.has(product.productId)) return

    setAddingProductIds((prev) => new Set(prev).add(product.productId))
    try {
      const result = await addCartItem(product.productId, 1)
      if (result.ok) {
        addItem(product.productId, 1)
        flashToast(`${product.name}이(가) 장바구니에 담겼습니다`)
      } else {
        flashToast(result.message || '장바구니 담기에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setAddingProductIds((prev) => {
        const next = new Set(prev)
        next.delete(product.productId)
        return next
      })
    }
  }

  // SEEAT-_3.HTM scrollHomeCarousel(dir) 참고 — 뷰포트 폭만큼 좌우로 부드럽게 스크롤한다.
  function scrollCarousel(direction: number) {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="home">
      <WholesaleAveragePrice />

      <div className="home__section-head home__section-head--tight-top">
        <h2 className="fs-title2">실시간 위판 특가</h2>
        <p className="fs-body2 home__section-sub">지금 위판장에 올라온 실시간 상품입니다.</p>
      </div>

      {isLoading && <div className="home__status fs-body2">상품을 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="home__status home__status--error fs-body2">{loadError}</div>
      )}

      {!isLoading && !loadError && products.length === 0 && (
        <div className="home__status fs-body2">등록된 상품이 없습니다</div>
      )}

      {!isLoading && !loadError && products.length > 0 && (
        <div className="home__carousel-row">
          <button
            type="button"
            className="home__carousel-arrow"
            onClick={() => scrollCarousel(-1)}
            aria-label="이전"
          >
            ‹
          </button>

          <div className="home__carousel-viewport" ref={viewportRef}>
            <div className="home__carousel-track">
              {products.map((product) => (
                <ProductResultCard
                  key={product.productId}
                  product={product}
                  isAddingToCart={addingProductIds.has(product.productId)}
                  onAddToCart={handleAddToCart}
                  onViewDetail={(p) => navigate(`/product/${p.productId}`)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="home__carousel-arrow"
            onClick={() => scrollCarousel(1)}
            aria-label="다음"
          >
            ›
          </button>
        </div>
      )}

      <div className="home__section-head home__section-head--row">
        <h2 className="fs-title2">공지사항</h2>
        <Link to="/notice" className="home__more-link">
          더보기 →
        </Link>
      </div>

      <div className="home__notice-list">
        {NOTICE_PREVIEW.map((notice) => (
          <div className="home__notice-row" key={notice.id}>
            <span className="home__notice-title fs-body2">{notice.title}</span>
            <span className="home__notice-date fs-caption mono">{notice.date}</span>
          </div>
        ))}
      </div>

      {toast && <div className="home__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Home
