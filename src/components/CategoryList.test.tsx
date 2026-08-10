import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoryList from './CategoryList'
import { api } from '../api/client'

// 공용 axios 인스턴스(api)를 통째로 모킹해서, 실제 ngrok 서버를 타지 않고
// GET /api/v1/products/categories 응답만 시나리오별로 바꿔가며 검증한다.
vi.mock('../api/client', () => ({
  api: { get: vi.fn() },
}))

// AxiosResponse의 status/headers 등 나머지 필드는 컴포넌트가 전혀 읽지 않으므로,
// 엄격한 AxiosResponse 타입 대신 permissive한 Mock으로 다뤄 테스트를 단순하게 유지한다.
const mockedGet = api.get as unknown as Mock

beforeEach(() => {
  mockedGet.mockReset()
})

// CategoryList.tsx에 하드코딩된 문구를 그대로 상수로 옮겨, 오타로 테스트가
// 실제 화면 문구와 어긋나는 일이 없게 한다.
const LOADING_TEXT = '카테고리를 불러오는 중입니다...'
const EMPTY_TEXT = '등록된 카테고리가 없습니다'
const ERROR_TEXT = '카테고리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'

describe('CategoryList', () => {
  it('1) 정상 응답을 받으면 대분류/소분류를 화면에 렌더링한다', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'OK',
        data: [
          {
            categoryId: 1,
            categoryName: '어류',
            parentCategoryId: null,
            children: [
              { categoryId: 5, categoryName: '광어', parentCategoryId: 1, children: [] },
              { categoryId: 6, categoryName: '우럭', parentCategoryId: 1, children: [] },
            ],
          },
          {
            categoryId: 2,
            categoryName: '패류',
            parentCategoryId: null,
            children: [{ categoryId: 9, categoryName: '전복', parentCategoryId: 2, children: [] }],
          },
        ],
      },
    })

    render(<CategoryList />)

    // 응답이 오기 전에는 로딩 문구가 보인다
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()

    // 응답이 오면 대분류/소분류 텍스트로 교체된다
    expect(await screen.findByText('어류')).toBeInTheDocument()
    expect(screen.getByText('패류')).toBeInTheDocument()
    expect(screen.getByText('광어')).toBeInTheDocument()
    expect(screen.getByText('우럭')).toBeInTheDocument()
    expect(screen.getByText('전복')).toBeInTheDocument()
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument()
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()

    // 정확한 엔드포인트로, 정확히 1번만 호출됐는지 확인 — 마운트당 반복 호출이 없어야 한다
    expect(mockedGet).toHaveBeenCalledTimes(1)
    expect(mockedGet).toHaveBeenCalledWith(
      '/api/v1/products/categories',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('2) 카테고리가 빈 배열이면 빈 상태 문구만 보여준다', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, message: 'OK', data: [] },
    })

    render(<CategoryList />)

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    // 빈 상태에서는 카드 그리드 자체가 렌더링되지 않아야 한다 (빈 껍데기 그리드 방지)
    expect(document.querySelector('.category-list__grid')).not.toBeInTheDocument()
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['네트워크 자체가 실패하는 경우 (오프라인/타임아웃 등)', () => Promise.reject(new Error('Network Error'))],
    [
      'HTTP는 200이지만 서버가 success:false로 응답하는 경우',
      () =>
        Promise.resolve({
          data: { success: false, message: '카테고리 서비스 점검 중', data: [] },
        }),
    ],
  ])('3) %s → 원인과 무관하게 동일한 고정 에러 문구를 보여준다', async (_label, mockImpl) => {
    mockedGet.mockImplementationOnce(mockImpl)

    render(<CategoryList />)

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
    // 에러 상태에서 로딩 문구나 카드 그리드가 함께 남아있으면 안 된다
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument()
    expect(document.querySelector('.category-list__grid')).not.toBeInTheDocument()
  })

  it('children 필드가 누락된 항목이 있어도 죽지 않고 나머지를 렌더링한다 (방어 로직 검증)', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'OK',
        data: [
          // 백엔드가 children을 누락해서 내려주는 경우를 흉내낸다
          { categoryId: 1, categoryName: '어류', parentCategoryId: null },
        ],
      },
    })

    render(<CategoryList />)

    expect(await screen.findByText('어류')).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()
  })
})
