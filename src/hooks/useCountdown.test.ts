import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T00:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('1) 남은 시간을 HH:MM:SS로 계산해서 돌려준다', () => {
    const { result } = renderHook(() => useCountdown('2026-08-12T01:02:03'))
    expect(result.current.label).toBe('01:02:03')
    expect(result.current.isExpired).toBe(false)
  })

  it('2) 24시간을 넘는 경우 시(H) 자리가 그만큼 늘어난다', () => {
    const { result } = renderHook(() => useCountdown('2026-08-16T06:00:00'))
    // 2026-08-12 00:00:00 → 2026-08-16 06:00:00 = 102시간
    expect(result.current.label).toBe('102:00:00')
  })

  it('3) 1초마다 남은 시간이 줄어든다', () => {
    const { result } = renderHook(() => useCountdown('2026-08-12T00:00:10'))
    expect(result.current.label).toBe('00:00:10')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.label).toBe('00:00:07')
  })

  it('4) 마감 시각이 지나면 "마감"으로 표시되고 isExpired가 true다', () => {
    const { result } = renderHook(() => useCountdown('2026-08-11T23:59:00'))
    expect(result.current.label).toBe('마감')
    expect(result.current.isExpired).toBe(true)
  })

  it('5) 카운트다운 도중 마감 시각을 넘기면 자동으로 "마감"으로 전환된다', () => {
    const { result } = renderHook(() => useCountdown('2026-08-12T00:00:02'))
    expect(result.current.isExpired).toBe(false)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.label).toBe('마감')
    expect(result.current.isExpired).toBe(true)
  })

  it('6) auctionDeadline이 없으면(null/undefined) 곧바로 "마감" 상태다', () => {
    expect(renderHook(() => useCountdown(null)).result.current).toEqual({
      label: '마감',
      isExpired: true,
      isUrgent: false,
    })
    expect(renderHook(() => useCountdown(undefined)).result.current.isExpired).toBe(true)
  })

  it('7) 마감까지 1시간 이내로 남으면 isUrgent가 true다', () => {
    const withinHour = renderHook(() => useCountdown('2026-08-12T00:59:59'))
    expect(withinHour.result.current.isUrgent).toBe(true)

    const overHour = renderHook(() => useCountdown('2026-08-12T01:00:01'))
    expect(overHour.result.current.isUrgent).toBe(false)
  })
})
