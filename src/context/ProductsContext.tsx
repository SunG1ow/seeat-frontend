import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Product, SellerListingStatus } from '../components/ProductCard'
import { buildInitialProducts } from '../data/products'

// ProductManagement.tsx(상품관리 화면)에서 수정 가능한 필드만 담는 타입.
// 어종(species)·원산지(region) 등 최초 등록 정보는 타입 단계에서부터 아예 받지 않아
// 화면 쪽 실수로도 위변조를 낼 수 없도록 막는다.
export interface ProductEditableFields {
  price: number
  total: number
  remain: number
  sellerStatus: SellerListingStatus
}

interface ProductsContextValue {
  products: Product[]
  getProduct: (id: number) => Product | undefined
  /** 재고보다 많은 수량이면 구매를 거부하고 false를 반환한다 (SEEAT-_3.HTM purchase() 참고) */
  purchase: (id: number, qty: number) => boolean
  /** 판매자 상품관리(ProductManagement) 화면 전용 — 가격/재고/판매상태만 수정 가능 */
  updateProduct: (id: number, patch: Partial<ProductEditableFields>) => void
  /** 판매자 상품 등록(ProductRegistration) 화면에서 신규 등록 시 사용. 생성된 id를 반환한다 */
  addProduct: (input: Omit<Product, 'id'>) => number
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(buildInitialProducts)
  const nextProductId = useRef(1000)

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      getProduct: (id) => products.find((p) => p.id === id),
      purchase: (id, qty) => {
        const target = products.find((p) => p.id === id)
        if (!target || qty > target.remain) return false
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, remain: p.remain - qty } : p)))
        return true
      },
      updateProduct: (id, patch) => {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
      },
      addProduct: (input) => {
        const id = nextProductId.current++
        setProducts((prev) => [...prev, { ...input, id }])
        return id
      },
    }),
    [products],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider')
  return ctx
}
