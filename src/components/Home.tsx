import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductCard from './ProductCard'
import { useProducts } from '../context/ProductsContext'
import { useCart } from '../context/CartContext'
import './Home.css'

function Home() {
  const { products } = useProducts()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  // SEEAT-_3.HTM scrollHomeCarousel(dir) 참고 — 뷰포트 폭만큼 좌우로 부드럽게 스크롤한다.
  function scrollCarousel(direction: number) {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="home">
      <div className="home__section-head">
        <h2 className="fs-title2">실시간 위판 특가</h2>
        <p className="fs-body2 home__section-sub">마감 임박 순으로 정렬된 실시간 위판 상품입니다.</p>
      </div>

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
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(p) => {
                  if (p.remain <= 0) return
                  addItem(p.id, 1)
                  flashToast(`🛒 ${p.species}이(가) 장바구니에 담겼습니다`)
                }}
                onBuyNow={(p) => navigate(`/product/${p.id}`)}
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

      {toast && <div className="home__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Home
