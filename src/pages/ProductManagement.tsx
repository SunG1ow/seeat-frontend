import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getSellerProducts,
  getProductDetail,
  updateProduct,
  updateProductStatus,
  type SellerProductListItem,
  type ApiProductDetail,
  type ProductStatus,
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

// 판매 상태 변경 셀렉트의 선택지 — PATCH /api/v1/products/{productId}/status가 허용하는 값과
// 정확히 동일한 4개뿐이다(스웨거 enum). STATUS_LABEL_MAP과 같은 순서로 맞춰 라벨을 재사용한다.
const STATUS_OPTIONS: ProductStatus[] = ['PENDING_REVIEW', 'ON_SALE', 'SOLD_OUT', 'HIDDEN']

// GET 상세 응답의 status는 방어적으로 string 타입이라(알 수 없는 값이 와도 화면이 깨지지 않게),
// 셀렉트에 넣기 전 4개 허용값 중 하나인지 확인한다.
function isProductStatus(value: string): value is ProductStatus {
  return (STATUS_OPTIONS as string[]).includes(value)
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

// 백엔드 auctionDeadline은 타임존 오프셋이 없는 date-time 문자열로 내려온다(예: "2026-07-23T11:00:00",
// GET 상세 응답의 createdAt과 동일한 포맷). Date 객체/toISOString()을 거치면 로컬 타임존이 UTC로
// 변환되며 사용자가 고른 시각이 밀려버리므로, <input type="datetime-local"> 값("YYYY-MM-DDTHH:mm")과는
// 문자열을 그대로 자르고 붙이는 방식으로만 변환한다.
function isoToDatetimeLocalInput(iso: string | null): string {
  if (!iso) return ''
  return iso.length >= 16 ? iso.slice(0, 16) : iso
}

function datetimeLocalInputToIso(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  // datetime-local 값은 보통 초 없이 "YYYY-MM-DDTHH:mm" 형태로 내려온다 — 백엔드 포맷에 맞춰 초를 붙인다.
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
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
  // datetime-local input 값("YYYY-MM-DDTHH:mm") 그대로 보관 — ISO 변환은 저장 시점에만 한다.
  const [draftAuctionDeadline, setDraftAuctionDeadline] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 판매 상태 변경 — PUT(수정 폼)과는 별개의 PATCH 호출이라 draft/에러/로딩 상태를 따로 둔다.
  const [draftStatus, setDraftStatus] = useState<ProductStatus | ''>('')
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

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
        setDraftAuctionDeadline(isoToDatetimeLocalInput(data.auctionDeadline))
        setDraftDescription(data.description ?? '')
        setDraftStatus(isProductStatus(data.status) ? data.status : '')
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
    setStatusError(null)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailError(null)
    setFormError(null)
    setStatusError(null)
  }

  // PATCH /api/v1/products/{productId}/status 호출 → success: true일 때만 상태를 반영한다.
  // 수정 폼(handleSave, PUT)과는 별개의 API라 실패해도 상품명 등 나머지 필드에는 영향이 없다.
  // 성공 시 상세 모달(detail)과 목록(items) 양쪽의 상태를 그 자리에서 갱신해 재조회 없이 바로
  // 화면에 반영한다.
  async function handleStatusChange() {
    if (!detail) return
    if (isStatusUpdating) return
    if (!draftStatus || draftStatus === detail.status) return

    setIsStatusUpdating(true)
    setStatusError(null)
    try {
      const result = await updateProductStatus(detail.productId, { status: draftStatus })
      if (result.ok && result.data) {
        const nextStatus = result.data.status
        setDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev))
        setItems((prev) =>
          prev.map((item) =>
            item.productId === detail.productId ? { ...item, status: nextStatus } : item,
          ),
        )
        flashToast('판매 상태가 변경되었습니다')
      } else {
        setStatusError(result.message || '판매 상태 변경에 실패했습니다')
      }
    } finally {
      setIsStatusUpdating(false)
    }
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
        auctionDeadline: datetimeLocalInputToIso(draftAuctionDeadline),
        description: draftDescription.trim() || null,
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

                {/* 판매자·카테고리·의무위판 여부·이미지는 PUT /api/v1/products/{id}가 받지 않는
                    필드라 이 화면에서 수정할 수 없다 — 읽기 전용으로만 보여준다. 판매 상태 배지도
                    그대로 유지하되, 바로 아래에 PATCH .../status로 변경하는 별도 컨트롤을 둔다. */}
                <div className="manage__modal-readonly-grid">
                  <div className="manage__modal-readonly-item">
                    <span className="fs-caption">판매자</span>
                    <span>{detail.sellerName}</span>
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

                {/* PUT(상품 수정)과는 별개의 PATCH /api/v1/products/{id}/status 호출 — 위 배지는
                    건드리지 않고, 별도 셀렉트+버튼으로만 상태를 바꾼다. */}
                <div className="manage__modal-field">
                  <label>판매 상태 변경</label>
                  <div className="manage__modal-status-row">
                    <select
                      value={draftStatus}
                      onChange={(event) => setDraftStatus(event.target.value as ProductStatus)}
                      disabled={isStatusUpdating}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="manage__edit-btn"
                      onClick={handleStatusChange}
                      disabled={isStatusUpdating || !draftStatus || draftStatus === detail.status}
                    >
                      {isStatusUpdating ? '변경 중...' : '상태 변경'}
                    </button>
                  </div>
                  {statusError && <p className="manage__modal-error fs-body2">{statusError}</p>}
                </div>

                <p className="manage__modal-hint fs-caption">
                  판매자·카테고리·의무위판 여부·이미지는 이 화면에서 수정할 수 없습니다.
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

                <div className="manage__modal-field">
                  <label>위판 마감시간</label>
                  <input
                    type="datetime-local"
                    value={draftAuctionDeadline}
                    onChange={(event) => setDraftAuctionDeadline(event.target.value)}
                  />
                </div>

                <div className="manage__modal-field">
                  <label>상품 상세 설명</label>
                  <textarea
                    rows={4}
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    placeholder="상품에 대한 상세 설명을 입력하세요"
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
