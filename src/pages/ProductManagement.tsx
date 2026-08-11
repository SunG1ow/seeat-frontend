import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getSellerProducts,
  getProductDetail,
  updateProduct,
  type SellerProductListItem,
  type ApiProductDetail,
} from '../api/products'
import './ProductManagement.css'

const PAGE_SIZE = 10

// 백엔드 상품 상태(status) → 화면 표시 라벨. 라이브 스웨거(/v3/api-docs)의
// SellerProductResponseDto.status enum(PENDING_REVIEW/ON_SALE/SOLD_OUT/HIDDEN)을
// 2026-08-10 직접 확인해 그대로 매핑했다. 모르는 값이 와도 원본 문자열을 그대로 보여줘
// 화면이 깨지지 않게 한다.
const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING_REVIEW: '심사중',
  ON_SALE: '판매중',
  SOLD_OUT: '품절',
  HIDDEN: '숨김',
}

function statusLabel(status: string) {
  return STATUS_LABEL_MAP[status?.toUpperCase?.() ?? ''] ?? status
}

// 배지 색상만 상태 성격(심사 대기/매진·숨김)에 따라 구분하고, 판매중은 기본 배지 색을 쓴다.
function statusBadgeClass(status: string) {
  const normalized = status?.toUpperCase?.() ?? ''
  if (normalized === 'SOLD_OUT' || normalized === 'HIDDEN') {
    return ' manage__badge--soldout'
  }
  if (normalized === 'PENDING_REVIEW') {
    return ' manage__badge--pending'
  }
  return ''
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function fmtDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function ProductManagement() {
  const { role } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState<SellerProductListItem[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // 상세/수정 저장 성공 시 목록을 다시 불러오기 위한 트리거 (page 변경 없이 같은 페이지 재조회)
  const [refreshTick, setRefreshTick] = useState(0)

  // 상세보기 모달 — 선택된 productId, GET /api/v1/products/{id} 응답, 로딩/에러 상태
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ApiProductDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  // 수정 폼 draft — ProductUpdateRequest 스펙에 있는 필드만 둔다(상품명/원산지/보관방식/
  // 중량/중량단위/가격/재고/태그). sellerId·categoryId·status·imageUrls 등은 절대 여기 없다.
  const [draftName, setDraftName] = useState('')
  const [draftOrigin, setDraftOrigin] = useState('')
  const [draftStorageType, setDraftStorageType] = useState('')
  const [draftWeight, setDraftWeight] = useState('')
  const [draftWeightUnit, setDraftWeightUnit] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftStock, setDraftStock] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // GET /api/v1/seller/products — 화면 진입/페이지 변경/수정 저장 후 재조회. 로그인한 판매자는
  // Authorization 헤더(JWT)로 서버가 식별하므로 별도 파라미터 없이 page/size만 넘긴다.
  useEffect(() => {
    if (role !== 'seller') return

    const controller = new AbortController()

    async function fetchSellerProducts() {
      setIsLoading(true)
      setLoadError(null)

      if (!localStorage.getItem('accessToken')) {
        setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      const result = await getSellerProducts({ page, size: PAGE_SIZE }, controller.signal)
      if (controller.signal.aborted) return

      if (result.ok && result.data) {
        setItems(result.data.content)
        setTotalPages(result.data.totalPages)
        setTotalElements(result.data.totalElements)
      } else {
        setLoadError(result.message || '상품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
      setIsLoading(false)
    }

    fetchSellerProducts()
    return () => controller.abort()
  }, [role, page, refreshTick])

  // GET /api/v1/products/{productId} — 목록에서 상품을 선택했을 때 상세 조회.
  // Detail.tsx(구매자 상세 화면)와 동일한 호출/에러 처리 패턴을 그대로 따른다.
  useEffect(() => {
    if (selectedId === null) return
    const productId = selectedId

    const controller = new AbortController()

    async function fetchDetail() {
      setIsDetailLoading(true)
      setDetailError(null)
      try {
        const data = await getProductDetail(productId, controller.signal)
        if (controller.signal.aborted) return
        setDetail(data)
        setDraftName(data.name)
        setDraftOrigin(data.origin)
        setDraftStorageType(data.storageType)
        setDraftWeight(String(data.weight))
        setDraftWeightUnit(data.weightUnit)
        setDraftPrice(String(data.price))
        setDraftStock(String(data.stockQuantity))
        setDraftTags(data.tags.join(', '))
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[manage] 상품 상세 조회 실패:', error)
        setDetailError('상품 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!controller.signal.aborted) setIsDetailLoading(false)
      }
    }

    fetchDetail()
    return () => controller.abort()
  }, [selectedId])

  function goToPage(next: number) {
    if (next < 0 || next >= totalPages || next === page) return
    setPage(next)
  }

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2000)
  }

  function openDetail(productId: number) {
    setSelectedId(productId)
    setDetail(null)
    setDetailError(null)
    setFormError(null)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailError(null)
    setFormError(null)
  }

  // PUT /api/v1/products/{productId} 호출 → success: true일 때만 "수정 완료" 처리.
  // Request body는 ProductUpdateRequest 스펙에 있는 8개 필드만 담는다.
  async function handleSave() {
    if (!detail) return
    if (isSaving) return

    const weightNum = Number(draftWeight)
    const priceNum = Number(draftPrice)
    const stockNum = Number(draftStock)

    if (!draftName.trim()) return setFormError('상품명을 입력해주세요')
    if (!draftOrigin.trim()) return setFormError('원산지를 입력해주세요')
    if (!draftStorageType.trim()) return setFormError('보관 방식을 입력해주세요')
    if (!draftWeight || Number.isNaN(weightNum) || weightNum <= 0) {
      return setFormError('중량을 올바르게 입력해주세요')
    }
    if (!draftWeightUnit.trim()) return setFormError('중량 단위를 입력해주세요')
    if (!draftPrice || Number.isNaN(priceNum) || priceNum <= 0) {
      return setFormError('가격을 올바르게 입력해주세요')
    }
    if (!draftStock || Number.isNaN(stockNum) || stockNum < 0) {
      return setFormError('재고를 올바르게 입력해주세요')
    }
    setFormError(null)

    const tags = draftTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    setIsSaving(true)
    try {
      const result = await updateProduct(detail.productId, {
        name: draftName.trim(),
        origin: draftOrigin.trim(),
        storageType: draftStorageType.trim(),
        weight: weightNum,
        weightUnit: draftWeightUnit.trim(),
        price: priceNum,
        stockQuantity: stockNum,
        tags,
      })

      if (result.ok) {
        flashToast('상품 정보가 수정되었습니다')
        closeDetail()
        setRefreshTick((n) => n + 1)
      } else {
        setFormError(result.message || '상품 수정에 실패했습니다')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (role !== 'seller') {
    return (
      <div className="manage__denied fs-body1">
        판매자 계정으로 로그인해야 상품을 관리할 수 있습니다.
        <button type="button" onClick={() => navigate('/login')}>
          로그인 하러가기
        </button>
      </div>
    )
  }

  return (
    <div className="manage">
      <h1 className="manage__title fs-title1">수산물 상품 관리</h1>
      <p className="manage__subtitle fs-body2">내가 등록한 상품의 목록과 상태를 확인합니다</p>

      <div className="manage__summary">
        <div className="manage__stat-card">
          <div className="manage__stat-card-label fs-caption">등록 상품 수</div>
          <div className="manage__stat-card-value mono">{totalElements}</div>
        </div>
      </div>

      <div className="manage__section-head">
        <h2 className="fs-title2">등록 상품 목록</h2>
      </div>

      {isLoading && <div className="manage__status fs-body2">상품 목록을 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="manage__status manage__status--error fs-body2">{loadError}</div>
      )}

      {!isLoading && !loadError && items.length === 0 && (
        <div className="manage__empty fs-body2">등록된 상품이 없습니다</div>
      )}

      {!isLoading && !loadError && items.length > 0 && (
        <>
          <table className="manage__table">
            <thead>
              <tr>
                <th>상품 ID</th>
                <th>상품명</th>
                <th>가격</th>
                <th>재고</th>
                <th>상태</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.productId}>
                  <td className="mono">{product.productId}</td>
                  <td>{product.name}</td>
                  <td className="mono">{won(product.price)}</td>
                  <td className="mono">{product.stockQuantity.toLocaleString('ko-KR')}</td>
                  <td>
                    <span className={`manage__badge${statusBadgeClass(product.status)}`}>
                      {statusLabel(product.status)}
                    </span>
                  </td>
                  <td className="mono">{fmtDate(product.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="manage__edit-btn"
                      onClick={() => openDetail(product.productId)}
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="manage__pagination">
              <button
                type="button"
                className="manage__page-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 0}
              >
                이전
              </button>
              <span className="manage__page-info fs-caption mono">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                className="manage__page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {selectedId !== null && (
        <div className="manage__modal-overlay" onClick={closeDetail}>
          <div className="manage__modal" onClick={(event) => event.stopPropagation()}>
            {isDetailLoading && (
              <p className="manage__status fs-body2">상품 정보를 불러오는 중입니다...</p>
            )}

            {!isDetailLoading && detailError && (
              <>
                <p className="manage__status manage__status--error fs-body2">{detailError}</p>
                <div className="manage__modal-actions">
                  <button
                    type="button"
                    className="manage__modal-btn manage__modal-btn--cancel"
                    onClick={closeDetail}
                  >
                    닫기
                  </button>
                </div>
              </>
            )}

            {!isDetailLoading && !detailError && detail && (
              <>
                <h3 className="manage__modal-title">{detail.name} 상세/수정</h3>

                {detail.imageUrls.length > 0 && (
                  <div className="manage__modal-images">
                    {detail.imageUrls.map((url) => (
                      <img key={url} src={url} alt={detail.name} />
                    ))}
                  </div>
                )}

                {/* 판매자·카테고리·상태·의무위판 여부·이미지는 PUT /api/v1/products/{id}가
                    받지 않는 필드라 이 화면에서 수정할 수 없다 — 읽기 전용으로만 보여준다. */}
                <div className="manage__modal-readonly-grid">
                  <div className="manage__modal-readonly-item">
                    <span className="fs-caption">판매자</span>
                    <span>{detail.sellerNickname}</span>
                  </div>
                  <div className="manage__modal-readonly-item">
                    <span className="fs-caption">카테고리</span>
                    <span>{detail.categoryName}</span>
                  </div>
                  <div className="manage__modal-readonly-item">
                    <span className="fs-caption">판매 상태</span>
                    <span className={`manage__badge${statusBadgeClass(detail.status)}`}>
                      {statusLabel(detail.status)}
                    </span>
                  </div>
                  <div className="manage__modal-readonly-item">
                    <span className="fs-caption">의무위판</span>
                    <span>{detail.isMandatoryAuction ? '해당' : '해당 없음'}</span>
                  </div>
                </div>

                <p className="manage__modal-hint fs-caption">
                  판매자·카테고리·판매 상태·의무위판 여부·이미지는 이 화면에서 수정할 수 없습니다.
                </p>

                <div className="manage__modal-field">
                  <label>상품명</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </div>

                <div className="manage__modal-field">
                  <label>원산지</label>
                  <input
                    type="text"
                    value={draftOrigin}
                    onChange={(event) => setDraftOrigin(event.target.value)}
                  />
                </div>

                <div className="manage__modal-field">
                  <label>보관 방식</label>
                  <input
                    type="text"
                    value={draftStorageType}
                    onChange={(event) => setDraftStorageType(event.target.value)}
                  />
                </div>

                <div className="manage__modal-grid-2">
                  <div className="manage__modal-field">
                    <label>중량</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={draftWeight}
                      onChange={(event) => setDraftWeight(event.target.value)}
                    />
                  </div>
                  <div className="manage__modal-field">
                    <label>중량 단위</label>
                    <input
                      type="text"
                      value={draftWeightUnit}
                      onChange={(event) => setDraftWeightUnit(event.target.value)}
                    />
                  </div>
                </div>

                <div className="manage__modal-grid-2">
                  <div className="manage__modal-field">
                    <label>가격 (원)</label>
                    <input
                      type="number"
                      min={0}
                      value={draftPrice}
                      onChange={(event) => setDraftPrice(event.target.value)}
                    />
                  </div>
                  <div className="manage__modal-field">
                    <label>재고</label>
                    <input
                      type="number"
                      min={0}
                      value={draftStock}
                      onChange={(event) => setDraftStock(event.target.value)}
                    />
                  </div>
                </div>

                <div className="manage__modal-field">
                  <label>태그 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(event) => setDraftTags(event.target.value)}
                    placeholder="예: 냉장직송, 당일조업"
                  />
                </div>

                {formError && <p className="manage__modal-error fs-body2">{formError}</p>}

                <div className="manage__modal-actions">
                  <button
                    type="button"
                    className="manage__modal-btn manage__modal-btn--cancel"
                    onClick={closeDetail}
                    disabled={isSaving}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="manage__modal-btn manage__modal-btn--confirm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className="manage__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default ProductManagement
