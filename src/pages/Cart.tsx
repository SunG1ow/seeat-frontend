import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart, type CartItem } from '../context/CartContext'
import { useProducts } from '../context/ProductsContext'
import { useOrders } from '../context/OrdersContext'
import type { Product } from '../components/ProductCard'
import './Cart.css'

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

// SEEAT-_3.HTM #screen-mypage(.cart-item, .total-line) + checkoutCart() 참고
function Cart() {
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
    <div className="cart">
      <h1 className="cart__title fs-title1">장바구니</h1>

      {rows.length === 0 ? (
        <div className="cart__empty fs-body2">장바구니에 담긴 상품이 없습니다</div>
      ) : (
        <>
          <div className="cart__list">
            {rows.map(({ item, product, subtotal }) => (
              <div className="cart__item" key={item.cartId}>
                <div className="cart__item-thumb" aria-hidden="true">
                  {product.emoji}
                </div>
                <div className="cart__item-info">
                  <b>{product.species}</b>
                  <div className="cart__item-meta fs-caption">
                    {product.seller} · {product.storage} · {item.qty}kg
                  </div>
                </div>
                <div className="cart__item-price mono">{won(subtotal)}</div>
                <button
                  type="button"
                  className="cart__item-remove"
                  onClick={() => removeItem(item.cartId)}
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

          <button type="button" className="cart__checkout-btn" onClick={() => setModalOpen(true)}>
            모두 구매하기
          </button>
        </>
      )}

      {modalOpen && (
        <div className="cart__modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="cart__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="cart__modal-title">결제 전 꼭 확인해주세요</h3>
            <p className="cart__modal-text">
              신선수산물 특성상 결제 완료 후 단순 변심에 의한 환불이 불가합니다.
            </p>
            <p className="cart__modal-text">
              결제 진행 시 타 사용자가 구매하지 못하도록 10분간 해당 재고가 잠금 처리됩니다.
            </p>
            <div className="cart__modal-actions">
              <button
                type="button"
                className="cart__modal-btn cart__modal-btn--cancel"
                onClick={() => setModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="cart__modal-btn cart__modal-btn--confirm"
                onClick={handleCheckoutConfirm}
              >
                확인(동의)
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="cart__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default Cart
