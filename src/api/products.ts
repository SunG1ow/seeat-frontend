import { api } from './client'
import { extractErrorMessage, type ApiResult } from './result'

// GET /api/v1/products/search 응답 항목 구조 (스웨거 명세 기준).
// 목록(Home/Search)과 상세(Detail) 화면이 공통으로 쓰는 상품 필드.
// ⚠️ auctionDeadline·stockQuantity는 2026-08-12 실 API 재확인 기준으로 새로 추가됨(과거엔
// 목록 응답에 없어서 상세를 따로 호출해야 했다). auctionDeadline은 상세(ApiProductDetail)와
// 마찬가지로 타임존 표기가 없는 LocalDateTime 문자열("YYYY-MM-DDTHH:mm:ss")로 내려온다.
export interface ApiProduct {
  productId: number
  name: string
  price: number
  origin: string
  weight: number
  weightUnit: string
  tags: string[]
  thumbnailUrl: string
  auctionDeadline: string | null
  stockQuantity: number
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

// GET /api/v1/products/{productId} 응답(data) 원본 스펙 (2026-08-11 실제 API 재검증 기준).
// 목록 조회(ApiProduct)와 필드 구성이 달라(이미지는 그룹 배열, 재고 total 없음 등)
// 더 이상 ApiProduct를 상속하지 않고 독립된 타입으로 둔다.
// ⚠️ 예전엔 imageUrls(string[])·sellerNickname으로 알려져 있었으나, 실제 백엔드 응답은
// images([{ imageUrls: string[] }])·sellerName이다 — 아래 RawProductDetail이 실제 응답 그대로다.
interface ProductDetailImageGroup {
  imageUrls: string[]
}

interface RawProductDetail {
  productId: number
  sellerId: number
  sellerName: string
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
  auctionDeadline: string | null
  description: string | null
  status: string
  images: ProductDetailImageGroup[]
  tags: string[]
  createdAt: string
}

// 화면(Detail.tsx, ProductManagement.tsx)에서 쓰는 상세 타입. 기존 UI가 imageUrls를 평탄화된
// string[]로 다뤘던 구조를 그대로 유지하기 위해, images 그룹 배열은 getProductDetail()에서
// imageUrls로 펼쳐서 내려준다. sellerNickname은 실제 응답에 없는 필드라 sellerName으로 교체했다.
export interface ApiProductDetail {
  productId: number
  sellerId: number
  sellerName: string
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
  auctionDeadline: string | null
  description: string | null
  status: string
  tags: string[]
  imageUrls: string[]
  createdAt: string
}

interface ProductDetailApiResponse {
  success: boolean
  data: RawProductDetail
  message: string
}

// GET /api/v1/products/{productId}
// ⚠️ 예전에 있던 401/500 버그 백엔드에서 수정 완료 — 실제 API를 그대로 호출한다.
// 응답의 images([{ imageUrls: [...] }, ...])는 화면에서 쓰기 편하도록 imageUrls(string[])로 펼쳐서 반환한다.
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
  const raw = response.data.data
  return {
    productId: raw.productId,
    sellerId: raw.sellerId,
    sellerName: raw.sellerName,
    categoryId: raw.categoryId,
    categoryName: raw.categoryName,
    name: raw.name,
    origin: raw.origin,
    storageType: raw.storageType,
    weight: raw.weight,
    weightUnit: raw.weightUnit,
    isMandatoryAuction: raw.isMandatoryAuction,
    price: raw.price,
    stockQuantity: raw.stockQuantity,
    auctionDeadline: raw.auctionDeadline,
    description: raw.description,
    status: raw.status,
    tags: raw.tags,
    createdAt: raw.createdAt,
    imageUrls: raw.images?.flatMap((group) => group.imageUrls) ?? [],
  }
}

// ============================================================
// POST /api/v1/products — 판매자 상품 등록
// 백엔드 컨트롤러 시그니처(API 담당자 확인, 2026-08-11):
//   @PostMapping(consumes = MULTIPART_FORM_DATA_VALUE)
//   createProduct(@CurrentMemberId Long sellerId,
//                 @Valid @ModelAttribute ProductCreateRequest request,
//                 @RequestParam List<MultipartFile> images)
// → 상품 정보는 JSON request 파트가 아니라 @ModelAttribute로 바인딩되고, images는 별도 파일
//   배열 파트로 전달된다. @ModelAttribute는 Servlet이 병합해주는 요청 파라미터(쿼리스트링 +
//   멀티파트 폼 필드)를 가리지 않고 그대로 바인딩하므로, 기존처럼 상품 정보를 axios params(쿼리
//   스트링)로, images만 multipart 파일 파트로 보내는 방식을 그대로 유지해도 정상 바인딩된다 —
//   JSON request 파트로 바꿀 필요 없음.
//   - 필수: categoryId(number), name, origin, storageType, price(number), stockQuantity(number)
//   - 선택: weight(number), weightUnit, isMandatoryAuction(boolean), tags(string 배열),
//           auctionDeadline(LocalDateTime 문자열, "YYYY-MM-DDTHH:mm:ss"), description(string)
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
  /** LocalDateTime 문자열, "YYYY-MM-DDTHH:mm:ss" 형식(예: 2026-08-15T10:00:00). 선택값. */
  auctionDeadline?: string
  description?: string
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
// - 텍스트 필드: Query Parameter(?categoryId=...&name=...) — @ModelAttribute가 그대로 바인딩
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
    // 둘 다 선택값 — 값이 없으면(undefined) 파라미터 자체를 보내지 않는다(기존 선택 필드들과 동일한 컨벤션).
    if (request.auctionDeadline !== undefined) params.auctionDeadline = request.auctionDeadline
    if (request.description !== undefined) params.description = request.description

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
// PUT /api/v1/products/{productId} — 판매자 상품 수정 (2026-08-11 라이브 스웨거 재확인)
// multipart가 아니라 application/json 바디이며, ProductUpdateRequest 스펙에 있는 필드만 받는다.
// productId/sellerId/categoryId/categoryName/status/imageUrls/isMandatoryAuction은 이 API로
// 수정할 수 없으니 절대 body에 넣지 않는다.
// auctionDeadline(date-time 문자열)·description은 둘 다 스펙상 선택 필드이며, GET 상세 응답과
// 동일하게 값이 없을 때는 null로 표현한다(필드 자체를 생략하지 않고 명시적으로 null을 보낸다).
// ============================================================

export interface UpdateProductRequest {
  name: string
  origin: string
  storageType: string
  weight: number
  weightUnit: string
  price: number
  stockQuantity: number
  tags: string[]
  auctionDeadline: string | null
  description: string | null
}

export interface UpdateProductResult {
  productId: number
  name: string
}

interface UpdateProductApiResponse {
  success: boolean
  data: UpdateProductResult
  message: string
}

// PUT /api/v1/products/{productId}
export async function updateProduct(
  productId: number,
  request: UpdateProductRequest,
): Promise<ApiResult<UpdateProductResult>> {
  try {
    const response = await api.put<UpdateProductApiResponse>(
      `/api/v1/products/${productId}`,
      request,
    )
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[products] 상품 수정 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}

// ============================================================
// PATCH /api/v1/products/{productId}/status — 판매자 상품 판매 상태 변경 (2026-08-11 라이브 스웨거 확인)
// application/json 바디에 status 하나만 담는다. 허용 값은 4가지뿐이며(스웨거 enum), 그 외 값은
// 절대 임의로 만들어 보내지 않는다.
// ============================================================

export type ProductStatus = 'PENDING_REVIEW' | 'ON_SALE' | 'SOLD_OUT' | 'HIDDEN'

export interface UpdateStatusRequest {
  status: ProductStatus
}

export interface UpdateStatusResult {
  productId: number
  status: ProductStatus
}

interface UpdateStatusApiResponse {
  success: boolean
  data: UpdateStatusResult
  message: string
}

// PATCH /api/v1/products/{productId}/status
export async function updateProductStatus(
  productId: number,
  request: UpdateStatusRequest,
): Promise<ApiResult<UpdateStatusResult>> {
  try {
    const response = await api.patch<UpdateStatusApiResponse>(
      `/api/v1/products/${productId}/status`,
      request,
    )
    if (response.data?.success === true) {
      return { ok: true, data: response.data.data }
    }
    return { ok: false, message: response.data?.message }
  } catch (error) {
    console.error('[products] 판매 상태 변경 실패:', error)
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

// ============================================================
// GET /api/v1/seller/products — 판매자 상품 관리(ProductManagement) 화면용 내 상품 목록 조회
// (2026-08-11 실 API 재확인) 로그인한 판매자는 Authorization 헤더(JWT)로 서버가 식별하므로
// 별도 sellerId 파라미터는 필요 없다.
// ⚠️ success/data 래퍼는 없지만, products/search·users/me/delivery와 동일하게 totalPages/
// totalElements가 최상단이 아니라 page 객체 안에 중첩되어 온다({content, page: {number, size,
// totalElements, totalPages}}). 예전엔 최상단 flat 필드로 잘못 알려져 있었고, 그 탓에 목록은
// 정상 표시되면서 "등록 상품 수"(totalElements)만 항상 0으로 보이는 버그가 있었다.
// ============================================================

export interface SellerProductListItem {
  productId: number
  name: string
  price: number
  stockQuantity: number
  status: string
  createdAt: string
}

interface SellerProductPageResponse {
  content: SellerProductListItem[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
}

export interface GetSellerProductsParams {
  /** 0부터 시작하는 백엔드 페이지 번호 */
  page?: number
  size?: number
}

export interface SellerProductPage {
  content: SellerProductListItem[]
  totalPages: number
  totalElements: number
  size: number
  number: number
}

// GET /api/v1/seller/products
export async function getSellerProducts(
  params: GetSellerProductsParams = {},
  signal?: AbortSignal,
): Promise<ApiResult<SellerProductPage>> {
  try {
    const response = await api.get<SellerProductPageResponse>('/api/v1/seller/products', {
      params: { page: params.page ?? 0, size: params.size ?? 10 },
      signal,
    })
    return {
      ok: true,
      data: {
        content: response.data?.content ?? [],
        totalPages: response.data?.page?.totalPages ?? 0,
        totalElements: response.data?.page?.totalElements ?? 0,
        size: response.data?.page?.size ?? params.size ?? 10,
        number: response.data?.page?.number ?? params.page ?? 0,
      },
    }
  } catch (error) {
    console.error('[products] 판매자 상품 목록 조회 실패:', error)
    return { ok: false, message: extractErrorMessage(error) }
  }
}
