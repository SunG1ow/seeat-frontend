import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// GET /api/v1/products/search 응답 항목 구조 (스웨거 명세 기준).
// 목록(Home/Search)과 상세(Detail) 화면이 공통으로 쓰는 상품 필드.
export interface ApiProduct {
  productId: number
  name: string
  price: number
  origin: string
  weight: number
  weightUnit: string
  tags: string[]
  thumbnailUrl: string
}

interface ProductSearchResponse {
  content: ApiProduct[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
}

export interface ProductSearchParams {
  page?: number
  size?: number
}

// GET /api/v1/products/search — 상품 목록/검색 공용 조회 (Home 캐러셀 · Search 화면에서 재사용)
export async function searchProducts(
  params: ProductSearchParams = {},
  signal?: AbortSignal,
): Promise<ApiProduct[]> {
  const response = await api.get<ProductSearchResponse>('/api/v1/products/search', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
    signal,
    // 공통 클라이언트 기본 타임아웃(10s)보다 응답이 느릴 때가 있어 이 요청만 여유를 둔다.
    timeout: 20_000,
  })
  return response.data.content
}

// GET /api/v1/products/{productId} 응답(data) 스펙 (2026-08-10 스웨거 확정, 401 버그 수정됨).
// 목록 조회(ApiProduct)와 필드 구성이 달라(썸네일 1장 대신 imageUrls 배열, 재고 total 없음 등)
// 더 이상 ApiProduct를 상속하지 않고 독립된 타입으로 둔다.
export interface ApiProductDetail {
  productId: number
  sellerId: number
  sellerNickname: string
  categoryId: number
  categoryName: string
  name: string
  origin: string
  storageType: string
  weight: number
  weightUnit: string
  isMandatoryAuction: boolean
  price: number
  stockQuantity: number
  status: string
  tags: string[]
  imageUrls: string[]
}

interface ProductDetailApiResponse {
  success: boolean
  data: ApiProductDetail
  message: string
}

// GET /api/v1/products/{productId}
// ⚠️ 예전에 있던 401 버그(TEMP MOCK 우회) 백엔드에서 수정 완료 — 실제 API를 그대로 호출한다.
export async function getProductDetail(
  productId: number,
  signal?: AbortSignal,
): Promise<ApiProductDetail> {
  const response = await api.get<ProductDetailApiResponse>(`/api/v1/products/${productId}`, {
    signal,
    timeout: 20_000,
  })
  if (response.data?.success !== true || !response.data.data) {
    throw new Error(response.data?.message || '상품 정보를 불러오지 못했습니다.')
  }
  return response.data.data
}

// ============================================================
// POST /api/v1/products — 판매자 상품 등록 (2026-08-10 스웨거 확정)
// 텍스트 필드는 JSON 바디가 아니라 Query Parameter로 전달하고, Request Body(multipart/form-data)에는
// images(파일 배열)만 담는다.
//   - 필수 쿼리: categoryId(number), name, origin, storageType, price(number), stockQuantity(number)
//   - 선택 쿼리: weight(number), weightUnit, isMandatoryAuction(boolean), tags(string 배열)
// ============================================================

export interface CreateProductRequest {
  categoryId: number
  name: string
  origin: string
  storageType: string
  price: number
  stockQuantity: number
  weight?: number
  weightUnit?: string
  isMandatoryAuction?: boolean
  tags?: string[]
}

export interface CreateProductResult {
  productId: number
  status: string
  imageUrls: string[]
}

interface CreateProductApiResponse {
  success: boolean
  data: CreateProductResult
  message: string
}

// POST /api/v1/products
// - 텍스트 필드: Query Parameter(?categoryId=...&name=...)
// - Request Body: multipart/form-data, "images" 파트(파일 배열)만 포함
// Content-Type 헤더는 axios/브라우저가 FormData를 보고 boundary까지 포함해 자동으로 채우므로
// 여기서 직접 지정하지 않는다(직접 지정하면 boundary가 빠져 오히려 요청이 깨진다).
export async function createProduct(
  request: CreateProductRequest,
  images: File[],
): Promise<ApiResult<CreateProductResult>> {
  try {
    const formData = new FormData()
    images.forEach((file) => {
      formData.append('images', file)
    })

    const params: Record<string, string | number | boolean | string[]> = {
      categoryId: request.categoryId,
      name: request.name,
      origin: request.origin,
      storageType: request.storageType,
      price: request.price,
      stockQuantity: request.stockQuantity,
    }
    if (request.weight !== undefined) params.weight = request.weight
    if (request.weightUnit !== undefined) params.weightUnit = request.weightUnit
    if (request.isMandatoryAuction !== undefined) params.isMandatoryAuction = request.isMandatoryAuction
    if (request.tags !== undefined && request.tags.length > 0) params.tags = request.tags

    const response = await api.post<CreateProductApiResponse>('/api/v1/products', formData, {
      params,
      // tags 같은 배열 쿼리 파라미터를 axios 기본값인 tags[]=a&tags[]=b가 아니라
      // Spring @RequestParam List<String>이 기대하는 tags=a&tags=b 형태로 보낸다.
      paramsSerializer: { indexes: null },
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[products] 상품 등록 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// GET /api/v1/products/categories — 상품 등록 폼의 카테고리 선택 드롭다운용 (2026-08-10)
// 다른 목록 API(products/search)와 달리 success/data 래퍼가 있는 형태로 명세됨에 유의.
// ============================================================

export interface ApiCategory {
  categoryId: number
  categoryName: string
  parentCategoryId: number | null
}

interface CategoryListApiResponse {
  success: boolean
  data: ApiCategory[]
  message: string
}

// GET /api/v1/products/categories
export async function getCategories(signal?: AbortSignal): Promise<ApiResult<ApiCategory[]>> {
  try {
    const response = await api.get<CategoryListApiResponse>('/api/v1/products/categories', {
      signal,
    })
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data ?? [] }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[products] 카테고리 목록 조회 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
