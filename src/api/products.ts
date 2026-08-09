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

// GET /api/v1/products/{productId} 응답 구조는 스웨거에 아직 명확히 없다. 목록 항목(ApiProduct)과
// 동일한 필드는 확정으로 보고, 상세 화면에만 필요한 재고/마감시간 등은 실제로 내려오면 쓰고
// 없으면 undefined로 안전하게 폴백하도록 전부 옵셔널로 열어둔다. 스펙이 확정되면 여기만 좁히면 된다.
export interface ApiProductDetail extends ApiProduct {
  remain?: number
  total?: number
  deadlineMs?: number
  grade?: string
  storage?: string
  seller?: string
  mandatory?: boolean
}

// ⚠️ 임시 우회(TEMP MOCK) — 2026-08-09 확인된 백엔드 버그: GET /api/v1/products/{productId}가
// 유효한 토큰으로도 항상 401을 반환한다(같은 토큰으로 /api/v1/cart·/api/v1/users/me는 정상 200).
// 백엔드 수정 전까지 프론트 작업(M2)이 막히지 않도록, 401일 때만 목록 조회(ApiProduct)와 동일한
// 필드 구조의 가짜 데이터를 만들어 반환한다. 404/500/네트워크 오류 등 다른 실패는 절대 여기서
// 삼키지 않고 그대로 던져 Detail.tsx의 기존 에러 처리(상품 없음/조회 실패)가 정상 동작하게 둔다.
// TODO: 백엔드가 401 버그를 고치면 이 함수의 catch 분기(마킹된 구간)를 통째로 삭제할 것.
function buildTempMockProductDetail(productId: number): ApiProductDetail {
  return {
    productId,
    name: `상품 #${productId} (임시 데이터)`,
    price: 10000,
    origin: '정보 준비중',
    weight: 1,
    weightUnit: 'kg',
    tags: ['임시 데이터'],
    thumbnailUrl: '',
  }
}

// GET /api/v1/products/{productId}
export async function getProductDetail(
  productId: number,
  signal?: AbortSignal,
): Promise<ApiProductDetail> {
  try {
    const response = await api.get<ApiProductDetail>(`/api/v1/products/${productId}`, {
      signal,
      timeout: 20_000,
    })
    return response.data
  } catch (error) {
    // 요청이 취소된 경우(페이지 이탈·id 변경)는 목업으로 덮지 않고 그대로 전파한다.
    if (signal?.aborted) throw error

    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      // ---- TEMP MOCK 시작 ----
      console.warn(
        `[products] ⚠️ TEMP MOCK 사용 중: GET /api/v1/products/${productId} 401 (백엔드 버그 임시 우회). ` +
          '백엔드 수정되면 src/api/products.ts의 이 분기를 제거할 것.',
      )
      return buildTempMockProductDetail(productId)
      // ---- TEMP MOCK 끝 ----
    }
    throw error
  }
}

// ============================================================
// POST /api/v1/products — 판매자 상품 등록 (2026-08-10)
// ⚠️ 스웨거 문서가 multipart/form-data 요청이라 "request" 파트(JSON)의 상세 스키마를 렌더링해
// 주지 못해 필드명이 확정되지 않았다. 실제 400 응답을 여러 번 찍어보며 확인한 결과:
//   - 백엔드 DTO에 실존하는 필드명(에러 메시지가 직접 알려줌): stockQuantity, origin, price,
//     storageType(= "storage" 아님), categoryId
//   - 단, 이 엔드포인트는 검증 실패 시 위반된 필드 "전부"를 동시에 검증하고 그중 하나를
//     비결정적으로(Set 순회 순서에 따라 무작위로) 골라 메시지로 보여준다 — 완전히 동일한
//     요청을 5번 연속 보내도 stockQuantity/origin/price 사이에서 에러 메시지가 매번 바뀌었다.
//     즉 "에러가 사라졌다 = 그 필드가 맞다"는 판단이 신뢰할 수 없어, 필드명 하나씩 순차
//     소거하는 방식으로는 완전히 확정할 수 없었다.
//   - categoryId는 실제 값(1 등)을 넣어도 여전히 null 위반으로 잡히는 경우가 있었는데,
//     이건 폼에 카테고리 선택 UI/API 자체가 없어서 그런 것일 수 있다 — 별도의 카테고리
//     목록 조회 API가 필요할 가능성이 높다. 지금은 임시 고정값(1)을 보낸다.
// 400이 계속 나면 백엔드팀에 이 DTO의 실제 소스(어노테이션 포함)를 요청하는 게 가장 빠르다.
// ============================================================

export interface CreateProductRequest {
  name: string
  origin: string
  price: number
  weight: number
  weightUnit: string
  stockQuantity: number
  storageType: string
  /** 등급 — 등록 폼에 입력 UI가 없어 기존 데모와 동일하게 '상'으로 고정 전송 */
  grade: string
  /** ⚠️ 임시 고정값(1) — 카테고리 선택 UI/조회 API가 아직 없어 실제 유효한 값을 보낼 수 없다 */
  categoryId: number
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

// POST /api/v1/products — multipart/form-data로 "request"(JSON Blob 파트) + "images"(파일 여러 장)를 함께 전송한다.
// Content-Type 헤더는 axios/브라우저가 FormData를 보고 boundary까지 포함해 자동으로 채우므로
// 여기서 직접 지정하지 않는다(직접 지정하면 boundary가 빠져 오히려 요청이 깨진다).
export async function createProduct(
  request: CreateProductRequest,
  images: File[],
): Promise<ApiResult<CreateProductResult>> {
  try {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
    images.forEach((file) => {
      formData.append('images', file)
    })

    const response = await api.post<CreateProductApiResponse>('/api/v1/products', formData)
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
