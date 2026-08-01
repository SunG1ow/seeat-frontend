import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart, type CartItem } from '../context/CartContext'
import { useProducts } from '../context/ProductsContext'
import { useOrders } from '../context/OrdersContext'
import type { Product } from '../components/ProductCard'
import './MyPage.css'

interface CartRow {
  item: CartItem
  product: Product
  subtotal: number
}

function won(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

function today() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '.')
}

type MypageTab = 'cart' | 'address' | 'edit'

const TABS: { id: MypageTab; label: string }[] = [
  { id: 'cart', label: '장바구니' },
  { id: 'address', label: '배송지 관리' },
  { id: 'edit', label: '정보수정' },
]

// SEEAT-_3.HTM #screen-mypage(.mypage-layout, cart-item) + checkoutCart() 참고
function MyPage() {
  const [activeTab, setActiveTab] = useState<MypageTab>('cart')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { items, removeItem, clearCart } = useCart()
  const { getProduct, purchase } = useProducts()
  const { addOrder } = useOrders()
  const navigate = useNavigate()

  const rows = useMemo<CartRow[]>(() => {
    const result: CartRow[] = []
    for (const item of items) {
      const product = getProduct(item.productId)
      if (product) result.push({ item, product, subtotal: product.price * item.qty })
    }
    return result
  }, [items, getProduct])

  const total = rows.reduce((sum, row) => sum + row.subtotal, 0)

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  function handleCheckoutConfirm() {
    const insufficient = rows.some((row) => row.item.qty > row.product.remain)
    if (insufficient) {
      setModalOpen(false)
      flashToast('일부 상품의 재고가 부족합니다. 수량을 확인해주세요')
      return
    }

    let totalAmount = 0
    rows.forEach((row) => {
      purchase(row.product.id, row.item.qty)
      totalAmount += row.subtotal
      addOrder({
        species: `${row.product.species} ${row.item.qty}kg`,
        date: today(),
        amount: row.subtotal,
        stage: 0,
      })
    })

    clearCart()
    setModalOpen(false)
    flashToast(`장바구니 상품 결제가 완료되었습니다 (총 ${won(totalAmount)}) · 배송 준비 중`)
    navigate('/orders')
  }

  return (
    <div className="mypage">
      <h1 className="mypage__title fs-title1">마이페이지</h1>

      <div className="mypage__layout">
        <div className="mypage__side-menu">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'mypage__tab mypage__tab--active' : 'mypage__tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mypage__content">
          {activeTab === 'cart' &&
            (rows.length === 0 ? (
              <div className="mypage__empty fs-body2">장바구니에 담긴 상품이 없습니다</div>
            ) : (
              <>
                <div className="mypage__cart-list">
                  {rows.map(({ item, product, subtotal }) => (
                    <div className="mypage__cart-item" key={item.cartId}>
                      <div className="mypage__ci-thumb" aria-hidden="true">
                        {product.emoji}
                      </div>
                      <div className="mypage__ci-info">
                        <b>{product.species}</b>
                        <div className="mypage__ci-meta fs-caption">
                          {product.seller} · {product.storage} · {item.qty}kg
                        </div>
                      </div>
                      <div className="mypage__ci-price mono">{won(subtotal)}</div>
                      <button
                        type="button"
                        className="mypage__ci-remove"
                        onClick={() => removeItem(item.cartId)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mypage__total-line">
                  <span>총 결제 예정 금액</span>
                  <span className="mypage__amount mono">{won(total)}</span>
                </div>

                <button
                  type="button"
                  className="mypage__checkout-btn"
                  onClick={() => setModalOpen(true)}
                >
                  모두 구매하기
                </button>
              </>
            ))}

          {activeTab === 'address' && (
            <div className="mypage__empty fs-body2">배송지 관리는 준비 중입니다</div>
          )}

          {activeTab === 'edit' && (
            <div className="mypage__empty fs-body2">정보수정은 준비 중입니다</div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="mypage__modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="mypage__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="mypage__modal-title">결제 전 꼭 확인해주세요</h3>
            <p className="mypage__modal-text">
              신선수산물 특성상 결제 완료 후 단순 변심에 의한 환불이 불가합니다.
            </p>
            <p className="mypage__modal-text">
              결제 진행 시 타 사용자가 구매하지 못하도록 10분간 해당 재고가 잠금 처리됩니다.
            </p>
            <div className="mypage__modal-actions">
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--cancel"
                onClick={() => setModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--confirm"
                onClick={handleCheckoutConfirm}
              >
                확인(동의)
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="mypage__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default MyPage
