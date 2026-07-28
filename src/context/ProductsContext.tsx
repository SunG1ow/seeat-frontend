import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../components/ProductCard'
import { buildInitialProducts } from '../data/products'

interface ProductsContextValue {
  products: Product[]
  getProduct: (id: number) => Product | undefined
  /** 재고보다 많은 수량이면 구매를 거부하고 false를 반환한다 (SEEAT-_3.HTM purchase() 참고) */
  purchase: (id: number, qty: number) => boolean
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(buildInitialProducts)

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
