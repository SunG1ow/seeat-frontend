import { useEffect, useState } from 'react'
import { api } from '../api/client'
import './CategoryList.css'

// GET /api/v1/products/categories 응답 구조 (실제 API 응답 기준).
// 대분류(parentCategoryId: null) 아래에 소분류가 children으로 중첩되어 내려온다.
interface ApiCategory {
  categoryId: number
  categoryName: string
  parentCategoryId: number | null
  children: ApiCategory[]
}

interface CategoriesResponse {
  success: boolean
  data: ApiCategory[]
  message: string
}

function CategoryList() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await api.get<CategoriesResponse>('/api/v1/products/categories', {
          signal: controller.signal,
        })
        // success:false 인데 HTTP 상태는 200으로 내려오는 경우도 방어한다
        // (서버가 비즈니스 에러를 200 + success:false로 감싸서 응답하는 케이스).
        if (!response.data?.success) {
          throw new Error(response.data?.message || '카테고리 목록 조회에 실패했습니다.')
        }
        // data/children이 배열이 아닐 수 있는 경우(필드 누락·null)를 방어해
        // .length/.map 호출 시 렌더링이 죽지 않도록 한다.
        const safeData = Array.isArray(response.data.data) ? response.data.data : []
        setCategories(
          safeData.map((category) => ({
            ...category,
            children: Array.isArray(category.children) ? category.children : [],
          })),
        )
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[category-list] 카테고리 목록 조회 실패:', error)
        setLoadError('카테고리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchCategories()
    return () => controller.abort()
  }, [])

  return (
    <div className="category-list">
      {isLoading && <div className="category-list__status fs-body2">카테고리를 불러오는 중입니다...</div>}

      {!isLoading && loadError && (
        <div className="category-list__status category-list__status--error fs-body2">{loadError}</div>
      )}

      {!isLoading && !loadError && categories.length === 0 && (
        <div className="category-list__status fs-body2">등록된 카테고리가 없습니다</div>
      )}

      {!isLoading && !loadError && categories.length > 0 && (
        <div className="category-list__grid">
          {categories.map((category) => (
            <div className="category-list__group" key={category.categoryId}>
              <h4 className="category-list__group-name fs-body1">{category.categoryName}</h4>
              {category.children.length > 0 && (
                <div className="category-list__chip-row">
                  {category.children.map((child) => (
                    <span className="category-list__chip fs-caption" key={child.categoryId}>
                      {child.categoryName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoryList
