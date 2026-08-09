import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product, SellerListingStatus } from '../components/ProductCard'

// 구매자 화면(Home/Search/Detail)은 실제 GET /api/v1/products/search·/{id} API로,
// 판매자 상품등록(ProductRegistration)은 POST /api/v1/products(src/api/products.ts)로 각각
// 전환되어 이 컨텍스트를 더 이상 쓰지 않는다. 판매자 상품관리(ProductManagement) 화면의
// 로컬 데모 상태만 남아 있고, 예전에 구매자 화면에서 쓰던 목업 시드 데이터(data/products.ts)는
// 제거했다.

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
  /** 판매자 상품관리(ProductManagement) 화면 전용 — 가격/재고/판매상태만 수정 가능 */
  updateProduct: (id: number, patch: Partial<ProductEditableFields>) => void
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      updateProduct: (id, patch) => {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
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
