import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Cart.css'

// GET /api/v1/cart 응답 항목 구조 (API 명세 기준)
interface CartApiItem {
  cartProductId: number
  productName: string
  price: number
  quantity: number
}

interface CartApiResponse {
  success: boolean
  data: {
    items: CartApiItem[]
  }
  message: string
}

// GET /api/v1/users/me 응답 중 이 화면에서 쓰는 부분만 (Login.tsx MeApiResponse 참고).
// 실제 서버 응답 필드명은 memberId가 아니라 userId다 (2026-08-08 실응답으로 확인).
interface MeApiResponse {
  success: boolean
  data: {
    userId: number
  }
  message: string
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

// SEEAT-_3.HTM #screen-mypage(.cart-item, .total-line) 참고
function Cart() {
  const { user } = useAuth()
  const [items, setItems] = useState<CartApiItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  // 장바구니 화면 진입 시 1회 조회. memberId는 로그인 시 GET /api/v1/users/me로 받아
  // localStorage에 저장해둔 값을 사용한다 (Login.tsx 참고).
  useEffect(() => {
    const controller = new AbortController()

    // memberId를 구하는 순서:
    //  1) 현재 로그인 세션(AuthContext) — 로그인 직후라면 이미 메모리에 있어 가장 신뢰도가 높다.
    //  2) 과거 로그인에서 캐시해둔 localStorage 값.
    //  3) accessToken(로그인 토큰)은 있는데 위 둘 다 없는 경우 — 로그인 시 /me 조회가 실패해
    //     memberId만 비어있는 상태일 수 있으므로, 토큰으로 /me를 다시 한번 조회해 자가복구한다.
    // accessToken 자체가 없을 때만 "로그인 정보를 확인할 수 없다"고 판단한다 — 진짜 미로그인 상태다.
    async function resolveMemberId(): Promise<number | null> {
      if (typeof user?.memberId === 'number') return user.memberId

      const cached = localStorage.getItem('memberId')
      if (cached) return Number(cached)

      if (!localStorage.getItem('accessToken')) return null

      try {
        const meResponse = await api.get<MeApiResponse>('/api/v1/users/me', {
          signal: controller.signal,
        })
        const memberId = meResponse.data.data.userId
        if (typeof memberId !== 'number') return null
        localStorage.setItem('memberId', String(memberId))
        return memberId
      } catch (meError) {
        if (!controller.signal.aborted) {
          console.error('[cart] 사용자 정보(/me) 재조회 실패:', meError)
        }
        return null
      }
    }

    async function fetchCart() {
      setIsLoading(true)
      setLoadError(null)

      const memberId = await resolveMemberId()
      if (controller.signal.aborted) return
      if (memberId === null) {
        setLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      try {
        const response = await api.get<CartApiResponse>('/api/v1/cart', {
          params: { memberId },
          signal: controller.signal,
          // 공통 클라이언트 기본 타임아웃(10s)보다 응답이 느릴 때가 있어 이 요청만 여유를 둔다.
          timeout: 20_000,
        })
        setItems(response.data.data.items)
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
  }, [user?.memberId])

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
                  onClick={() => flashToast('삭제 기능은 준비 중입니다')}
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
            onClick={() => flashToast('결제 기능은 준비 중입니다')}
          >
            모두 구매하기
          </button>
        </>
      )}

      {toast && <div className="cart__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Cart
