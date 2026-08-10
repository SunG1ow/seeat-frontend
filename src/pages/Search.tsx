import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProducts, type ApiProduct } from '../api/products'
import { addCartItem } from '../api/cart'
import { useCart } from '../context/CartContext'
import ProductResultCard from '../components/ProductResultCard'
import './Search.css'

// SEEAT-_3.HTM #screen-search 의 speciesList / regionList 데이터셋 그대로 참고
const SPECIES_OPTIONS = ['활전복', '참돔', '갯벌낙지', '병어', '방어', '전어', '광어', '참치', '고등어']
const REGION_OPTIONS = ['통영', '부산', '여수', '목포', '완도', '제주']
const STORAGE_OPTIONS = ['냉장', '냉동', '실온']
const STATUS_OPTIONS = ['판매중', '마감임박', '매진']

type SortOption = 'popular' | 'deadline' | 'price-asc' | 'price-desc'
type ChipGroup = 'species' | 'storage' | 'status'

interface DraftFilters {
  species: Set<string>
  storage: Set<string>
  status: Set<string>
  region: string
  min: string
  max: string
}

interface AppliedFilters {
  species: Set<string>
  storage: Set<string>
  status: Set<string>
  region: string
  min: number | null
  max: number | null
}

function emptyDraft(): DraftFilters {
  return { species: new Set(), storage: new Set(), status: new Set(), region: '', min: '', max: '' }
}

function emptyApplied(): AppliedFilters {
  return { species: new Set(), storage: new Set(), status: new Set(), region: '', min: null, max: null }
}

// 보관 방식·판매 상태는 현재 상품검색 API 응답에 대응 데이터가 없어 필터링에는 반영하지 않는다.
// (어종은 상품명에 포함된 문자열로, 지역은 origin 값으로 매칭한다)
function filterAndSortProducts(products: ApiProduct[], filters: AppliedFilters, sort: SortOption) {
  const filtered = products.filter((p) => {
    if (filters.species.size && ![...filters.species].some((species) => p.name.includes(species))) {
      return false
    }
    if (filters.region && p.origin !== filters.region) return false
    if (filters.min !== null && p.price < filters.min) return false
    if (filters.max !== null && p.price > filters.max) return false
    return true
  })

  const sorted = [...filtered]
  if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
  // 'popular' / 'deadline' 정렬에 필요한 데이터가 API에 없어 서버가 내려준 기본(최신) 순서를 유지한다.
  return sorted
}

function Search() {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [draft, setDraft] = useState<DraftFilters>(emptyDraft)
  const [applied, setApplied] = useState<AppliedFilters>(emptyApplied)
  const [sort, setSort] = useState<SortOption>('popular')

  // 상품 목록 (GET /api/v1/products/search) — 상품검색 화면 진입 시 1회 조회
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // 같은 상품 카드를 연타해도 요청이 겹쳐 나가지 않도록 진행 중인 productId를 추적한다.
  const [addingProductIds, setAddingProductIds] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

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
        console.error('[search] 상품 목록 조회 실패:', error)
        setLoadError('상품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [])

  const results = useMemo(() => filterAndSortProducts(products, applied, sort), [products, applied, sort])

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

  function toggleChip(group: ChipGroup, value: string) {
    setDraft((prev) => {
      const nextSet = new Set(prev[group])
      if (nextSet.has(value)) nextSet.delete(value)
      else nextSet.add(value)
      return { ...prev, [group]: nextSet }
    })
  }

  function handleApply() {
    setApplied({
      species: new Set(draft.species),
      storage: new Set(draft.storage),
      status: new Set(draft.status),
      region: draft.region,
      min: draft.min ? Number(draft.min) : null,
      max: draft.max ? Number(draft.max) : null,
    })
  }

  function handleReset() {
    setDraft(emptyDraft())
    setApplied(emptyApplied())
  }

  return (
    <div className="search">
      <h1 className="search__title fs-title1">상품검색</h1>
      <p className="search__subtitle fs-body2">어종, 지역, 가격대, 판매 상태로 원하는 상품을 찾아보세요</p>

      <div className="search__layout">
        <aside className="search__filter-panel">
          <div className="search__filter-group">
            <h4 className="fs-caption">어종</h4>
            <div className="search__chip-list">
              {SPECIES_OPTIONS.map((species) => (
                <button
                  key={species}
                  type="button"
                  className={`search__chip${draft.species.has(species) ? ' search__chip--selected' : ''}`}
                  onClick={() => toggleChip('species', species)}
                >
                  {species}
                </button>
              ))}
            </div>
          </div>

          <div className="search__filter-group">
            <h4 className="fs-caption">지역</h4>
            <select
              value={draft.region}
              onChange={(event) => setDraft((prev) => ({ ...prev, region: event.target.value }))}
            >
              <option value="">전체</option>
              {REGION_OPTIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="search__filter-group">
            <h4 className="fs-caption">가격대 (원)</h4>
            <div className="search__range-row">
              <input
                type="number"
                placeholder="최소"
                value={draft.min}
                onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))}
              />
              <span>–</span>
              <input
                type="number"
                placeholder="최대"
                value={draft.max}
                onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))}
              />
            </div>
          </div>

          <div className="search__filter-group">
            <h4 className="fs-caption">보관 방식</h4>
            <div className="search__chip-list">
              {STORAGE_OPTIONS.map((storage) => (
                <button
                  key={storage}
                  type="button"
                  className={`search__chip${draft.storage.has(storage) ? ' search__chip--selected' : ''}`}
                  onClick={() => toggleChip('storage', storage)}
                >
                  {storage}
                </button>
              ))}
            </div>
          </div>

          <div className="search__filter-group">
            <h4 className="fs-caption">판매 상태</h4>
            <div className="search__chip-list">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`search__chip${draft.status.has(status) ? ' search__chip--selected' : ''}`}
                  onClick={() => toggleChip('status', status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="search__btn search__btn--primary" onClick={handleApply}>
            필터 적용
          </button>
          <button type="button" className="search__btn search__btn--outline" onClick={handleReset}>
            초기화
          </button>
        </aside>

        <div className="search__content">
          <div className="search__toolbar">
            <div className="search__result-count fs-body2">
              총 <b>{results.length}</b>건
            </div>
            <select
              className="search__sort-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
            >
              <option value="popular">인기순</option>
              <option value="deadline">마감임박순</option>
              <option value="price-asc">가격 낮은순</option>
              <option value="price-desc">가격 높은순</option>
            </select>
          </div>

          {isLoading && <div className="search__status fs-body2">상품을 불러오는 중입니다...</div>}

          {!isLoading && loadError && (
            <div className="search__status search__status--error fs-body2">{loadError}</div>
          )}

          {!isLoading && !loadError && results.length === 0 && (
            <div className="search__empty fs-body2">조건에 맞는 상품이 없습니다</div>
          )}

          {!isLoading && !loadError && results.length > 0 && (
            <div className="search__grid">
              {results.map((product) => (
                <ProductResultCard
                  key={product.productId}
                  product={product}
                  isAddingToCart={addingProductIds.has(product.productId)}
                  onAddToCart={handleAddToCart}
                  onViewDetail={(p) => navigate(`/product/${p.productId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="search__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Search
