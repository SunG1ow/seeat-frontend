import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from './ProductCard'
import { useProducts } from '../context/ProductsContext'
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
      <WholesaleAveragePrice />

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
                  flashToast(`${p.species}이(가) 장바구니에 담겼습니다`)
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
