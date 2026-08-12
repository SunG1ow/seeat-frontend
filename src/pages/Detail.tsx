import { useEffect, useState, type WheelEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProductDetail, type ApiProductDetail } from '../api/products'
import { addCartItem } from '../api/cart'
import { getMyAddresses } from '../api/addresses'
import { createOrder, payOrder } from '../api/orders'
import { useCart } from '../context/CartContext'
import { useCountdown } from '../hooks/useCountdown'
import './Detail.css'

const MANDATORY_BLOCK_MESSAGE = '수협 의무위판 대상 어종으로 직거래가 불가합니다'

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const productId = Number(id)

  const [product, setProduct] = useState<ApiProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  // "다시 시도" 버튼이 navigate(0)(전체 새로고침)을 쓰지 않도록, 이 값을 증가시켜
  // 아래 useEffect를 다시 실행시킨다 — SPA 라우팅을 벗어나지 않는 순수 재조회.
  const [retryTick, setRetryTick] = useState(0)

  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  // product가 아직 없을 때(로딩/에러 중)는 auctionDeadline이 undefined로 들어가고
  // useCountdown은 그 경우 "마감" 상태를 돌려준다 — 어차피 이 값은 로딩/에러 화면에서는
  // 쓰지 않지만, 훅 규칙상 조건부 return(아래) 이전에 호출해야 해서 여기 둔다.
  const countdown = useCountdown(product?.auctionDeadline)

  // GET /api/v1/products/{productId} — 상세 화면 진입/id 변경 시 조회
  useEffect(() => {
    const controller = new AbortController()

    if (!Number.isFinite(productId)) {
      setIsLoading(false)
      setNotFound(true)
      return
    }

    async function fetchDetail() {
      setIsLoading(true)
      setLoadError(null)
      setIsAuthError(false)
      setNotFound(false)
      try {
        const detail = await getProductDetail(productId, controller.signal)
        setProduct(detail)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[detail] 상품 상세 조회 실패:', error)
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setNotFound(true)
        } else if (status === 401) {
          // 서버가 거부한 토큰은 이미 만료/무효한 것이 확실하므로 로컬에 남겨두지 않는다.
          // 지우지 않으면 이후의 모든 인증 요청이 같은 무효 토큰으로 계속 401을 반복한다.
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('userId')
          setIsAuthError(true)
          setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        } else {
          setLoadError('상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchDetail()
    return () => controller.abort()
  }, [productId, retryTick])

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  function changeQty(delta: number) {
    setQty((prev) => Math.max(1, prev + delta))
  }

  function handleQtyInput(value: string) {
    const parsed = Math.floor(Number(value))
    setQty(Number.isFinite(parsed) && parsed >= 1 ? parsed : 1)
  }

  // §4.3.5: 숫자 입력창은 마우스 스크롤 휠 이벤트로도 수량을 조절할 수 있어야 한다
  function handleWheel(event: WheelEvent<HTMLInputElement>) {
    changeQty(event.deltaY < 0 ? 1 : -1)
  }

  if (isLoading) {
    return <div className="detail__status fs-body2">상품 정보를 불러오는 중입니다...</div>
  }

  // notFound(404)와 loadError(그 외 실패)를 먼저 각각 구분해서 보여준 다음에만 "!product"로
  // 폴백한다. 순서를 바꾸면 401 등 다른 에러도 product가 비어 있다는 이유만으로 전부
  // "상품을 찾을 수 없습니다"로 잘못 표시된다.
  if (notFound) {
    return (
      <div className="detail__not-found fs-body1">
        상품을 찾을 수 없습니다.
        <button type="button" onClick={() => navigate('/')}>
          홈으로
        </button>
      </div>
    )
  }

  if (loadError || !product) {
    return (
      <div className="detail__status detail__status--error fs-body2">
        {loadError ?? '상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}
        {isAuthError ? (
          // 401은 페이지를 새로고침한다고 없어지지 않으므로(토큰 자체가 무효) 로그인 화면으로
          // 안내한다. 사용자가 직접 누르는 명시적 이동이라 렌더링 중 자동 리다이렉트가 아니고,
          // 다른 페이지의 라우팅과 충돌하지 않는다.
          <button type="button" onClick={() => navigate('/login', { state: { from: `/product/${id}` } })}>
            로그인 하러 가기
          </button>
        ) : (
          // 전체 새로고침(navigate(0))은 쓰지 않는다 — SPA 라우팅을 벗어나면 배포 환경의
          // rewrite 설정에 좌우되고 불필요하게 앱 전체를 다시 로드한다. 재조회만 다시 트리거한다.
          <button type="button" onClick={() => setRetryTick((tick) => tick + 1)}>
            다시 시도
          </button>
        )}
      </div>
    )
  }

  // 상세 API 스펙(2026-08-10 확정)에는 잔여수량(stockQuantity)만 내려오고 초기 재고(total)는
  // 없어 퍼센트 게이지는 계산하지 않는다. status가 품절을 뜻하는 값(SOLD_OUT)이거나 재고가
  // 0 이하면 매진으로 취급한다.
  const isSoldOut = product.stockQuantity <= 0 || product.status === 'SOLD_OUT'
  const total = qty * product.price

  // POST /api/v1/cart/items 호출 → success: true일 때만 성공 토스트를 띄운다.
  // success: false거나 통신 자체가 실패(catch)해도 무조건 성공으로 보이는 일이 없도록
  // addCartItem()의 반환값(ok)을 반드시 확인한다.
  async function handleAddToCart() {
    if (!product) return
    if (qty > product.stockQuantity) {
      flashToast('재고보다 많은 수량은 담을 수 없습니다')
      return
    }
    if (isAddingToCart) return

    setIsAddingToCart(true)
    try {
      const result = await addCartItem(product.productId, qty)
      if (result.ok) {
        addItem(product.productId, qty)
        flashToast(`${product.name}이(가) 장바구니에 담겼습니다`)
      } else {
        flashToast(result.message || '장바구니 담기에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setIsAddingToCart(false)
    }
  }

  // 즉시 구매: 장바구니를 거치지 않고 이 상품 1건만 주문 생성 → 결제까지 바로 진행한다.
  // Cart.tsx의 handleCheckout()과 동일한 3단계(배송지 확보 → 주문 생성 → 결제)를 그대로 따른다.
  // 어느 단계든 실패하면 절대 다음 단계로 진행하지 않고 정확한 에러 토스트만 띄운다.
  async function handlePurchase() {
    if (!product) return
    if (qty > product.stockQuantity) {
      flashToast('재고보다 많은 수량은 구매할 수 없습니다')
      return
    }
    if (isPurchasing) return

    setIsPurchasing(true)
    try {
      // 1) 기본 배송지 확보
      const addressResult = await getMyAddresses()
      if (!addressResult.ok) {
        flashToast(addressResult.message || '배송지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const addresses = addressResult.data ?? []
      if (addresses.length === 0) {
        flashToast('등록된 배송지가 없습니다. 마이페이지에서 배송지를 먼저 등록해주세요.')
        return
      }
      const defaultAddress = addresses.find((address) => address.isDefault)
      if (!defaultAddress) {
        flashToast('기본 배송지가 설정되어 있지 않습니다. 마이페이지에서 기본 배송지를 지정해주세요.')
        return
      }

      // 2) 주문 생성 — 이 상품 1건만 즉시 주문(장바구니 미경유)
      const orderResult = await createOrder({
        items: [{ productId: product.productId, quantity: qty }],
        addressId: defaultAddress.addressId,
        requestMessage: '',
      })
      if (!orderResult.ok || !orderResult.data) {
        flashToast(
          orderResult.message || '주문 생성에 실패했습니다. 재고 상태를 확인 후 다시 시도해주세요.',
        )
        return
      }

      // 3) 결제 처리 — 실제 결제수단 선택 UI가 아직 없어 테스트용 값으로 하드코딩한다.
      // TODO: 결제수단 선택 화면이 생기면 paymentMethod/pgTransactionId를 실제 값으로 교체할 것.
      const paymentResult = await payOrder(orderResult.data.orderId, {
        paymentMethod: 'CARD',
        pgTransactionId: `TEST-${orderResult.data.orderId}-${Date.now()}`,
      })
      if (!paymentResult.ok) {
        flashToast(
          paymentResult.message ||
            '결제 처리에 실패했습니다. 주문은 생성되었으니 주문내역에서 다시 시도해주세요.',
        )
        return
      }

      // 4) 전체 성공: 주문내역 화면으로 이동한다.
      navigate('/orders')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className="detail">
      <button type="button" className="detail__back fs-body2" onClick={() => navigate(-1)}>
        ← 목록으로
      </button>

      <div className="detail__layout">
        <div className="detail__thumb">
          {product.imageUrls[0] && (
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          )}
        </div>

        <div className="detail__panel">
          <div className="detail__badges">
            <span className="detail__badge detail__badge--region">{product.origin}</span>
            <span className="detail__badge">{product.categoryName}</span>
            {product.isMandatoryAuction && (
              <span className="detail__badge detail__badge--mandatory">의무위판 어종</span>
            )}
          </div>
          <h1 className="detail__title">{product.name}</h1>
          <div className="detail__seller fs-body2">{product.sellerName}</div>

          <div className="detail__stat-row">
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">현재가</div>
              <div className="detail__stat-value mono">
                {won(product.price)} / {product.weight}
                {product.weightUnit}
              </div>
            </div>
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">잔여수량</div>
              <div className="detail__stat-value mono">
                {product.stockQuantity}
                {product.weightUnit} 남음
              </div>
            </div>
            <div className="detail__stat-item">
              <div className="detail__stat-label fs-caption">마감까지</div>
              <div
                className={
                  'detail__big-timer' +
                  (countdown.isExpired
                    ? ' detail__big-timer--expired'
                    : countdown.isUrgent
                      ? ' detail__big-timer--urgent'
                      : '')
                }
              >
                {countdown.label}
              </div>
            </div>
          </div>

          <div className="detail__qty-control">
            <button type="button" onClick={() => changeQty(-1)} aria-label="수량 감소">
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(event) => handleQtyInput(event.target.value)}
              onWheel={handleWheel}
            />
            <button type="button" onClick={() => changeQty(1)} aria-label="수량 증가">
              +
            </button>
            <span className="detail__storage fs-caption">
              {product.storageType} · {product.weight}
              {product.weightUnit} 단위
            </span>
          </div>

          <div className="detail__total-line">
            <span>결제 예정 금액</span>
            <span className="detail__amount mono">{won(total)}</span>
          </div>

          <div className="detail__actions">
            <button
              type="button"
              className="detail__cart-btn"
              disabled={isSoldOut || isAddingToCart}
              onClick={handleAddToCart}
            >
              {isAddingToCart ? '담는 중...' : '장바구니 담기'}
            </button>
            <button
              type="button"
              className={`detail__buy-btn${product.isMandatoryAuction ? ' detail__buy-btn--mandatory' : ''}`}
              disabled={isSoldOut || product.isMandatoryAuction || isPurchasing}
              title={product.isMandatoryAuction ? MANDATORY_BLOCK_MESSAGE : undefined}
              onClick={handlePurchase}
            >
              {isPurchasing
                ? '주문 처리 중...'
                : isSoldOut
                  ? '매진되었습니다'
                  : product.isMandatoryAuction
                    ? '직거래 불가'
                    : '구매하기'}
            </button>
          </div>

          <div className="detail__seller-box fs-caption">
            판매자: {product.sellerName} · 원산지 직송 · 위판 낙찰 즉시 발송됩니다. 교환/환불은
            수산물 특성상 신선도 이상 시에만 가능하며, 결제 후 7일 이내 청약철회가 가능합니다.
          </div>
        </div>
      </div>

      {toast && <div className="detail__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Detail
