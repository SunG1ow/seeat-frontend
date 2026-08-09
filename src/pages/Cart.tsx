import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getMyAddresses } from '../api/addresses'
import { createOrder, payOrder } from '../api/orders'
import './Cart.css'

// GET /api/v1/cart 응답 항목 구조 (스웨거 명세 기준)
interface CartApiItem {
  cartProductId: number
  productId: number
  productName: string
  quantity: number
  price: number
}

interface CartApiResponse {
  success: boolean
  data: {
    cartId: number
    items: CartApiItem[]
  }
  message: string
}

// DELETE /api/v1/cart/items/{cartProductId} 응답 구조 (다른 API와 동일한 공통 래퍼)
interface DeleteCartItemApiResponse {
  success: boolean
  data: unknown
  message: string
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// SEEAT-_3.HTM #screen-mypage(.cart-item, .total-line) 참고
function Cart() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CartApiItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // 삭제 요청이 진행 중인 cartProductId 집합 — 연타로 같은 아이템에 중복 요청이 나가는 것을 막고,
  // 해당 아이템의 삭제 버튼을 잠깐 비활성화하는 데 쓴다.
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  // 주문 생성 → 결제 처리 전체 프로세스가 진행 중인 동안 "모두 구매하기"를 잠근다.
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  // 장바구니 화면 진입 시 1회 조회. GET /api/v1/cart는 요청 파라미터가 없고, 로그인한
  // 사용자는 Authorization 헤더(JWT, api client 인터셉터가 자동 첨부)로 서버가 식별한다.
  useEffect(() => {
    const controller = new AbortController()

    async function fetchCart() {
      setIsLoading(true)
      setLoadError(null)

      if (!localStorage.getItem('accessToken')) {
        setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      try {
        const response = await api.get<CartApiResponse>('/api/v1/cart', {
          signal: controller.signal,
          // 공통 클라이언트 기본 타임아웃(10s)보다 응답이 느릴 때가 있어 이 요청만 여유를 둔다.
          timeout: 20_000,
        })
        setItems(response.data.data.items ?? [])
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[cart] 장바구니 조회 실패:', error)
        setLoadError('장바구니 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchCart()
    return () => controller.abort()
  }, [])

  // DELETE /api/v1/cart/items/{cartProductId} 호출 → success: true일 때만 화면 상태에서
  // 해당 아이템을 필터링해 지운다. 전체 목록을 다시 불러오지 않고 그 자리에서 즉시 반영한다.
  async function handleRemove(cartProductId: number) {
    if (removingIds.has(cartProductId)) return

    setRemovingIds((prev) => new Set(prev).add(cartProductId))
    try {
      const response = await api.delete<DeleteCartItemApiResponse>(
        `/api/v1/cart/items/${cartProductId}`,
      )
      if (response.data?.success === true) {
        setItems((prev) => prev.filter((item) => item.cartProductId !== cartProductId))
      } else {
        flashToast(response.data?.message || '삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('[cart] 아이템 삭제 실패:', error)
      const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message
      flashToast(serverMessage || '삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(cartProductId)
        return next
      })
    }
  }

  // "모두 구매하기": 배송지 확보 → 주문 생성 → 결제 처리 3단계를 순서대로 진행한다.
  // 각 단계는 api/addresses.ts·api/orders.ts에서 이미 success:true 여부를 확인해
  // { ok, data?, message? } 형태로 돌려주므로, 여기서는 ok만 보고 다음 단계로 넘어갈지
  // 중단하고 에러 토스트를 띄울지만 판단하면 된다 — 어느 단계든 실패하면 절대 진행하지 않는다.
  async function handleCheckout() {
    if (items.length === 0 || isCheckingOut) return

    setIsCheckingOut(true)
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

      // 2) 주문 생성 — 장바구니에 담긴 항목 전부를 보낸다(개별 선택 UI는 아직 없음)
      const orderResult = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
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

      // 4) 전체 성공: 서버 장바구니에서도 방금 주문한 항목을 실제로 지운다.
      // (주문/결제 API가 서버 장바구니를 자동으로 비워주지 않는 것으로 확인됨 — 그대로 두면
      //  다음에 장바구니에 들어왔을 때 이미 주문한 상품이 또 남아있는 것처럼 보인다.)
      // 개별 삭제 중 일부가 실패해도 주문·결제 자체는 이미 완료된 상태이므로 흐름을 막지 않고,
      // 화면 상태는 항상 비운 뒤 주문내역으로 이동한다.
      const deleteResults = await Promise.allSettled(
        items.map((item) => api.delete(`/api/v1/cart/items/${item.cartProductId}`)),
      )
      deleteResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `[cart] 결제 완료 후 장바구니 정리 실패 (cartProductId=${items[index].cartProductId}):`,
            result.reason,
          )
        }
      })

      setItems([])
      navigate('/orders')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="cart">
      <h1 className="cart__title fs-title1">장바구니</h1>

      {isLoading && <div className="cart__status fs-body2">장바구니를 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="cart__status cart__status--error fs-body2">{loadError}</div>
      )}

      {!isLoading && !loadError && items.length === 0 && (
        <div className="cart__empty fs-body2">장바구니에 담긴 상품이 없습니다</div>
      )}

      {!isLoading && !loadError && items.length > 0 && (
        <>
          <div className="cart__list">
            {items.map((item) => (
              <div className="cart__item" key={item.cartProductId}>
                {/* 목록 API 응답에 상품 이미지가 없어 기본 플레이스홀더로 대체한다 */}
                <div className="cart__item-thumb" aria-hidden="true">
                  🖼️
                </div>
                <div className="cart__item-info">
                  <b>{item.productName}</b>
                  <div className="cart__item-meta fs-caption">수량 {item.quantity}개</div>
                </div>
                <div className="cart__item-price mono">{won(item.price * item.quantity)}</div>
                <button
                  type="button"
                  className="cart__item-remove"
                  disabled={removingIds.has(item.cartProductId)}
                  onClick={() => handleRemove(item.cartProductId)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="cart__total-line">
            <span>총 결제 예정 금액</span>
            <span className="cart__amount mono">{won(total)}</span>
          </div>

          <button
            type="button"
            className="cart__checkout-btn"
            disabled={isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut ? '주문 처리 중...' : '모두 구매하기'}
          </button>
        </>
      )}

      {toast && <div className="cart__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Cart
