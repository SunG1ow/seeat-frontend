import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// SEEAT-_3.HTM의 cart 배열({cartId, productId, qty}) 구조를 그대로 참고한다.
// 상품 상세(가격/재고 등)는 여기서 스냅샷으로 들고 있지 않고, 화면에서 ProductsContext를
// 조회해 항상 최신 상태(가격/잔여수량 변동 등)를 반영하도록 한다.
export interface CartItem {
  cartId: number
  productId: number
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (productId: number, qty: number) => void
  removeItem: (cartId: number) => void
  updateQty: (cartId: number, qty: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const nextCartId = useRef(1)

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (productId, qty) => {
        setItems((prev) => {
          const existing = prev.find((item) => item.productId === productId)
          if (existing) {
            return prev.map((item) =>
              item.productId === productId ? { ...item, qty: item.qty + qty } : item,
            )
          }
          return [...prev, { cartId: nextCartId.current++, productId, qty }]
        })
      },
      removeItem: (cartId) => {
        setItems((prev) => prev.filter((item) => item.cartId !== cartId))
      },
      updateQty: (cartId, qty) => {
        setItems((prev) =>
          prev.map((item) => (item.cartId === cartId ? { ...item, qty: Math.max(1, qty) } : item)),
        )
      },
      clearCart: () => setItems([]),
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
