import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductCard, { getProductStatus, type Product } from '../components/ProductCard'
import { useProducts } from '../context/ProductsContext'
import { useCart } from '../context/CartContext'
import './Search.css'

// SEEAT-_3.HTM #screen-search 의 speciesList / regionList / products 데이터셋 그대로 참고
const SPECIES_OPTIONS = ['활전복', '참돔', '갯벌낙지', '병어', '방어', '전어', '광어', '참치', '고등어']
const REGION_OPTIONS = ['통영', '부산', '여수', '목포', '완도', '제주']
const STORAGE_OPTIONS = ['냉장', '냉동', '실온']
const STATUS_OPTIONS = ['판매중', '마감임박', '매진'] as const
const STATUS_LABEL_TO_KEY: Record<string, 'onsale' | 'urgent' | 'soldout'> = {
  판매중: 'onsale',
  마감임박: 'urgent',
  매진: 'soldout',
}

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

function filterAndSortProducts(products: Product[], filters: AppliedFilters, sort: SortOption) {
  const now = Date.now()
  const filtered = products.filter((p) => {
    if (filters.species.size && !filters.species.has(p.species)) return false
    if (filters.region && p.region !== filters.region) return false
    if (filters.min !== null && p.price < filters.min) return false
    if (filters.max !== null && p.price > filters.max) return false
    if (filters.storage.size && !filters.storage.has(p.storage)) return false
    if (filters.status.size) {
      const status = getProductStatus(p, p.deadlineMs - now)
      const wanted = [...filters.status].map((label) => STATUS_LABEL_TO_KEY[label])
      if (!wanted.includes(status)) return false
    }
    return true
  })

  const sorted = [...filtered]
  if (sort === 'deadline') sorted.sort((a, b) => a.deadlineMs - b.deadlineMs)
  else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
  else sorted.sort((a, b) => b.total - b.remain - (a.total - a.remain))
  return sorted
}

function Search() {
  const { products } = useProducts()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<DraftFilters>(emptyDraft)
  const [applied, setApplied] = useState<AppliedFilters>(emptyApplied)
  const [sort, setSort] = useState<SortOption>('popular')
  const [toast, setToast] = useState<string | null>(null)

  const results = useMemo(() => filterAndSortProducts(products, applied, sort), [products, applied, sort])

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

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
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

          {results.length ? (
            <div className="search__grid">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  hideTimer
                  onAddToCart={(p) => {
                    if (p.remain <= 0) return
                    addItem(p.id, 1)
                    flashToast(`${p.species}이(가) 장바구니에 담겼습니다`)
                  }}
                  onBuyNow={(p) => navigate(`/product/${p.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="search__empty fs-body2">조건에 맞는 상품이 없습니다</div>
          )}
        </div>
      </div>

      {toast && <div className="search__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Search
