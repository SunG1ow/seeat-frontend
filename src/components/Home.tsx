import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard, { type Product } from './ProductCard'
import { useProducts } from '../context/ProductsContext'
import { useCart } from '../context/CartContext'
import './Home.css'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

interface PriceTrendItem {
  species: string
  currentPrice: number
  changePercent: number
  trend: number[]
}

// SEEAT-_3.HTM renderPriceWidget() 참고: 어종별 첫 상품의 7일 시세 추이(trend)에서
// 시작값 대비 최근값의 등락률을 계산한다. 최대 5개 어종만 노출한다.
function buildPriceTrends(products: Product[]): PriceTrendItem[] {
  const seenSpecies = new Set<string>()
  const items: PriceTrendItem[] = []

  for (const product of products) {
    if (seenSpecies.has(product.species)) continue
    seenSpecies.add(product.species)

    const trend = product.trend && product.trend.length > 0 ? product.trend : [product.price]
    const delta = trend[trend.length - 1] - trend[0]
    const changePercent = trend[0] !== 0 ? Math.round((delta / trend[0]) * 1000) / 10 : 0

    items.push({ species: product.species, currentPrice: trend[trend.length - 1], changePercent, trend })
    if (items.length === 5) break
  }

  return items
}

function Sparkline({ trend }: { trend: number[] }) {
  const max = Math.max(...trend)
  const min = Math.min(...trend)
  const range = max - min || 1

  return (
    <div className="home__sparkline">
      {trend.map((value, index) => {
        const height = 8 + Math.round(((value - min) / range) * 26)
        const isLast = index === trend.length - 1
        return (
          <div
            key={index}
            className={`home__sparkline-bar${isLast ? ' home__sparkline-bar--last' : ''}`}
            style={{ height: `${height}px` }}
            title={won(value)}
          />
        )
      })}
    </div>
  )
}

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

  const priceTrends = useMemo(() => buildPriceTrends(products), [products])

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
      <div className="home__section-head home__section-head--row">
        <h2 className="fs-title2">오늘의 평균 도매 시세</h2>
        <span className="fs-caption home__section-note">전국 수산시장 공공데이터 연동 (모의)</span>
      </div>

      <div className="home__price-widget">
        {priceTrends.map((item) => {
          const isUp = item.changePercent >= 0
          return (
            <div className="home__price-card" key={item.species}>
              <div className="home__price-card-top">
                <span className="home__price-card-name fs-body2">{item.species}</span>
                <span
                  className={`home__price-card-delta mono${
                    isUp ? ' home__price-card-delta--up' : ' home__price-card-delta--down'
                  }`}
                >
                  {isUp ? '▲' : '▼'} {Math.abs(item.changePercent)}%
                </span>
              </div>
              <div className="home__price-card-value mono">
                {won(item.currentPrice)}
                <small>/kg</small>
              </div>
              <Sparkline trend={item.trend} />
            </div>
          )
        })}
      </div>

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
