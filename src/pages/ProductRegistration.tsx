import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createProduct, updateProductStatus, getCategories, type ApiCategory } from '../api/products'
import { isClosedSeasonNow, SELECTABLE_SPECIES } from '../data/species'
import { APPROVED_VESSEL_LICENSE } from '../data/sellerLicense'
import './ProductRegistration.css'

const MAX_IMAGES = 5
const PACKAGING_UNITS = ['kg (벌크)', '박스', '마리', '세트']
const STORAGE_OPTIONS = ['냉장', '냉동', '실온'] as const

interface ImagePreview {
  file: File
  url: string
}

// 원산지 표시는 항상 "선적항 · 선장명" 형태의 고정 문자열이며 사용자가 직접 편집할 수 없다.
function buildOriginLabel() {
  return `${APPROVED_VESSEL_LICENSE.homePort} · ${APPROVED_VESSEL_LICENSE.captainName}`
}

// <input type="datetime-local"> 값("YYYY-MM-DDTHH:mm")을 백엔드가 요구하는 LocalDateTime
// 문자열("YYYY-MM-DDTHH:mm:ss")로 변환한다. 비어있으면 선택 필드이므로 undefined를 반환해
// createProduct()가 아예 파라미터를 보내지 않게 한다.
function datetimeLocalInputToIso(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function ProductRegistration() {
  const { role } = useAuth()
  const navigate = useNavigate()

  const [images, setImages] = useState<ImagePreview[]>([])
  const imagesRef = useRef(images)
  imagesRef.current = images

  const [speciesId, setSpeciesId] = useState('')
  const [weight, setWeight] = useState('')
  const [packagingUnit, setPackagingUnit] = useState(PACKAGING_UNITS[0])
  const [storage, setStorage] = useState<(typeof STORAGE_OPTIONS)[number] | ''>('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  // 위판 마감시간 / 상세 설명 — 둘 다 선택 입력 (ProductCreateRequest 선택 필드)
  const [auctionDeadline, setAuctionDeadline] = useState('')
  const [description, setDescription] = useState('')

  // 카테고리 목록 (GET /api/v1/products/categories) — 상품 등록 화면 진입 시 1회 조회
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [pledgeModalOpen, setPledgeModalOpen] = useState(false)
  const [pledgeChecked, setPledgeChecked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 컴포넌트가 언마운트될 때만 남아 있는 미리보기 URL을 정리한다
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.url))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      setIsLoadingCategories(true)
      setCategoryLoadError(null)

      const result = await getCategories(controller.signal)
      if (controller.signal.aborted) return

      if (result.ok) {
        setCategories(result.data ?? [])
      } else {
        setCategoryLoadError(
          result.message || '카테고리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
        )
      }
      setIsLoadingCategories(false)
    }

    fetchCategories()
    return () => controller.abort()
  }, [])

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  if (role !== 'seller') {
    return (
      <div className="register__denied fs-body1">
        판매자 계정으로 로그인해야 상품을 등록할 수 있습니다.
        <button type="button" onClick={() => navigate('/login')}>
          로그인 하러가기
        </button>
      </div>
    )
  }

  const selectedSpecies = SELECTABLE_SPECIES.find((s) => s.id === speciesId)
  const closedSeasonSpecies = SELECTABLE_SPECIES.filter((s) => isClosedSeasonNow(s))

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    setImages((prev) => {
      const merged = [...prev, ...selected.map((file) => ({ file, url: URL.createObjectURL(file) }))]
      if (merged.length > MAX_IMAGES) {
        flashToast(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있습니다`)
        return merged.slice(0, MAX_IMAGES)
      }
      return merged
    })
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  function resetForm() {
    images.forEach((img) => URL.revokeObjectURL(img.url))
    setImages([])
    setSpeciesId('')
    setWeight('')
    setPackagingUnit(PACKAGING_UNITS[0])
    setStorage('')
    setPrice('')
    setQuantity('')
    setCategoryId('')
    setAuctionDeadline('')
    setDescription('')
  }

  function validate(): string | null {
    if (images.length === 0) return '상품 이미지를 최소 1장 이상 등록해주세요'
    if (!selectedSpecies) return '품목명(어종)을 선택해주세요'
    if (isClosedSeasonNow(selectedSpecies)) return '현재 포획 및 유통이 금지된 금어기 어종입니다'
    if (!categoryId) return '카테고리를 선택해주세요'
    if (!weight || Number(weight) <= 0) return '중량을 입력해주세요'
    if (!storage) return '보관 형태를 선택해주세요'
    if (!price || Number(price) <= 0) return '가격을 입력해주세요'
    if (!quantity || Number(quantity) <= 0) return '판매 수량을 입력해주세요'
    return null
  }

  function handleRegisterClick() {
    const error = validate()
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setPledgeChecked(false)
    setPledgeModalOpen(true)
  }

  // POST /api/v1/products(multipart, 텍스트 필드는 쿼리 파라미터) 호출 → success: true일 때만
  // "등록 완료" 처리. success: false거나 통신 자체가 실패(catch)해도 무조건 성공으로 보이는 일이
  // 없도록 createProduct()의 반환값(ok)을 반드시 확인한다. 400 등 실패 시에도 화면이 멈추지 않고
  // 에러 토스트로 안내한 뒤 모달은 열어둬 재시도할 수 있게 한다.
  //
  // ⚠️ PM 결정(관리자 승인 없이 즉시 게시): 새 상품은 백엔드 정책상 PENDING_REVIEW로 생성되므로,
  // 등록(POST) 성공 직후 PATCH /api/v1/products/{productId}/status로 ON_SALE 전환을 자동 호출한다.
  // POST가 실패하면 PATCH는 절대 호출하지 않는다. PATCH가 실패해도 상품 자체는 이미 등록된
  // 상태이므로(PENDING_REVIEW로 남음) 등록 실패로 되돌리지 않고, 토스트로 정확한 상태를 안내한다.
  async function handlePledgeConfirm() {
    if (!pledgeChecked || !selectedSpecies || !storage || !categoryId) return
    if (isSubmitting) return

    const weightNum = Number(weight)
    const quantityNum = Number(quantity)
    const priceNum = Number(price)

    setIsSubmitting(true)
    try {
      const result = await createProduct(
        {
          categoryId: Number(categoryId),
          name: selectedSpecies.name,
          origin: buildOriginLabel(),
          storageType: storage,
          price: priceNum,
          stockQuantity: quantityNum,
          weight: weightNum,
          weightUnit: packagingUnit,
          auctionDeadline: datetimeLocalInputToIso(auctionDeadline),
          description: description.trim() || undefined,
        },
        images.map((img) => img.file),
      )

      if (result.ok && result.data) {
        setPledgeModalOpen(false)
        resetForm()

        const statusResult = await updateProductStatus(result.data.productId, {
          status: 'ON_SALE',
        })
        if (statusResult.ok) {
          flashToast('상품이 등록되어 바로 판매중 상태로 게시되었습니다')
        } else {
          console.error('[register] 등록 직후 판매중 전환 실패:', statusResult.message)
          flashToast(
            statusResult.message ||
              '상품은 등록되었지만 판매중 전환에 실패해 심사중 상태로 남아있습니다. 상품관리에서 확인해주세요.',
          )
        }
        navigate('/manage')
      } else {
        console.error('[register] 상품 등록 실패:', result.message)
        flashToast(result.message || '상품 등록에 실패했습니다')
      }
    } catch (error) {
      console.error('[register] 상품 등록 중 예외 발생:', error)
      flashToast('상품 등록에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register">
      <h1 className="register__title fs-title1">수산물 상품 등록</h1>
      <p className="register__subtitle fs-body2">
        {APPROVED_VESSEL_LICENSE.captainName} · 어선 허가번호 {APPROVED_VESSEL_LICENSE.licenseNo} 기준으로
        등록합니다
      </p>

      <div className="register__layout">
        <div className="register__panel">
          <section className="register__section">
            <h2 className="register__section-title">상품 이미지 (최대 {MAX_IMAGES}장)</h2>
            <div className="register__image-grid">
              {images.map((img, index) => (
                <div className="register__image-thumb" key={img.url}>
                  <img src={img.url} alt={`상품 이미지 ${index + 1}`} />
                  <button
                    type="button"
                    className="register__image-remove"
                    onClick={() => removeImage(index)}
                    aria-label="이미지 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="register__image-add">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    hidden
                  />
                  <span>+ 사진 추가</span>
                  <span className="register__image-count fs-caption">
                    {images.length}/{MAX_IMAGES}
                  </span>
                </label>
              )}
            </div>
          </section>

          <section className="register__section register__notice">
            <h2 className="register__section-title">⚠ 가공 금지 안내 (원물 등록만 가능)</h2>
            <p className="fs-body2">
              무신고 식품 위생 침해를 방지하기 위해 회뜨기·손질 등 사후 가공 옵션은 제공되지
              않습니다. 반드시 자연 그대로의 원물(비가공) 상태 기준으로만 등록해주세요.
            </p>
          </section>

          <section className="register__section">
            <h2 className="register__section-title">품목명 (어종 선택)</h2>
            <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
              <option value="">어종을 선택하세요</option>
              {SELECTABLE_SPECIES.map((species) => {
                const closed = isClosedSeasonNow(species)
                return (
                  <option key={species.id} value={species.id} disabled={closed}>
                    {species.emoji} {species.name}
                    {closed ? ' — 금어기(선택 불가)' : ''}
                  </option>
                )
              })}
            </select>
            {selectedSpecies && isClosedSeasonNow(selectedSpecies) && (
              <p className="register__field-warning">
                현재 포획 및 유통이 금지된 금어기 어종입니다
              </p>
            )}
            {closedSeasonSpecies.length > 0 && (
              <p className="register__field-hint fs-caption">
                현재 금어기 어종: {closedSeasonSpecies.map((s) => s.name).join(', ')} (선택 불가)
              </p>
            )}
            <p className="register__field-hint fs-caption">
              고등어·참치·멸치 등 의무 위판 어종은 직거래가 법으로 금지되어 목록에 표시되지
              않습니다.
            </p>
          </section>

          <section className="register__section">
            <h2 className="register__section-title">카테고리</h2>
            {isLoadingCategories && (
              <p className="register__field-hint fs-caption">카테고리 목록을 불러오는 중입니다...</p>
            )}
            {!isLoadingCategories && categoryLoadError && (
              <p className="register__field-warning">{categoryLoadError}</p>
            )}
            {!isLoadingCategories && !categoryLoadError && (
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">카테고리를 선택하세요</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            )}
          </section>

          <section className="register__section">
            <h2 className="register__section-title">원산지 (자동 고정)</h2>
            <input type="text" value={buildOriginLabel()} readOnly className="register__readonly" />
            <p className="register__field-hint fs-caption">
              가입 시 승인된 어선 허가증({APPROVED_VESSEL_LICENSE.vesselName}, 허가번호{' '}
              {APPROVED_VESSEL_LICENSE.licenseNo})의 선적항 기준으로 자동 고정되며 직접 수정할 수
              없습니다.
            </p>
          </section>

          <section className="register__section register__grid-2">
            <div className="register__field">
              <h2 className="register__section-title">중량 및 포장 단위</h2>
              <div className="register__inline-fields">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="1단위당 중량(kg)"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
                <select value={packagingUnit} onChange={(event) => setPackagingUnit(event.target.value)}>
                  {PACKAGING_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="register__field">
              <h2 className="register__section-title">보관 형태</h2>
              <div className="register__radio-row">
                {STORAGE_OPTIONS.map((option) => (
                  <label key={option} className="register__radio">
                    <input
                      type="radio"
                      name="storage"
                      value={option}
                      checked={storage === option}
                      onChange={() => setStorage(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="register__section register__grid-2">
            <div className="register__field">
              <h2 className="register__section-title">가격 (원/kg)</h2>
              <input
                type="number"
                min={0}
                placeholder="예: 24500"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>

            <div className="register__field">
              <h2 className="register__section-title">판매 수량 ({packagingUnit} 기준)</h2>
              <input
                type="number"
                min={0}
                placeholder="예: 20"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
          </section>

          <section className="register__section">
            <h2 className="register__section-title">위판 마감시간 (선택)</h2>
            <input
              type="datetime-local"
              value={auctionDeadline}
              onChange={(event) => setAuctionDeadline(event.target.value)}
            />
          </section>

          <section className="register__section">
            <h2 className="register__section-title">상품 상세 설명 (선택)</h2>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="상품에 대한 상세 설명을 입력하세요"
            />
          </section>

          {formError && <p className="register__error fs-body2">{formError}</p>}

          <button type="button" className="register__submit" onClick={handleRegisterClick}>
            상품 등록하기
          </button>
        </div>
      </div>

      {pledgeModalOpen && (
        <div className="register__modal-overlay" onClick={() => setPledgeModalOpen(false)}>
          <div className="register__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="register__modal-title">등록 전 법적 가이드라인 서약</h3>
            <p className="register__modal-text">
              「수산자원관리법」등 관계 법령에 따라 규격 미달 어린 물고기 및 포란(알을 밴) 암컷
              수산물은 포획·유통·판매가 금지됩니다.
            </p>
            <label className="register__pledge-check">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={(event) => setPledgeChecked(event.target.checked)}
              />
              본인은 규격 미달 어린 물고기 및 포란 암컷 수산물을 취급하지 않을 것을 서약하며, 위
              내용을 확인했습니다.
            </label>
            <div className="register__modal-actions">
              <button
                type="button"
                className="register__modal-btn register__modal-btn--cancel"
                onClick={() => setPledgeModalOpen(false)}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                className="register__modal-btn register__modal-btn--confirm"
                disabled={!pledgeChecked || isSubmitting}
                onClick={handlePledgeConfirm}
              >
                {isSubmitting ? '등록 중...' : '서약하고 등록 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="register__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default ProductRegistration
