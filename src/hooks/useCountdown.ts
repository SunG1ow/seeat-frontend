import { useEffect, useState } from 'react'

export interface CountdownState {
  /** "HH:MM:SS" (24시간을 넘으면 시(H) 부분이 그만큼 늘어난다, 예: "102:03:11") 또는 마감 시 "마감" */
  label: string
  /** 마감 시각을 이미 지났거나(auctionDeadline이 없거나 파싱 불가한 경우도 포함) true */
  isExpired: boolean
  /** 마감까지 1시간 이내로 남은 경우 true — UI에서 강조색 등으로 위판 마감임박을 알리는 용도 */
  isUrgent: boolean
}

const EXPIRED: CountdownState = { label: '마감', isExpired: true, isUrgent: false }
const URGENT_THRESHOLD_MS = 60 * 60 * 1000 // 1시간

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// auctionDeadline → 지금부터 남은 시간을 계산한다. new Date()가 그대로 받아들이는 값이면
// (ISO 8601 "...Z"든, 백엔드가 실제로 내려주는 타임존 없는 LocalDateTime 문자열
// "YYYY-MM-DDTHH:mm:ss"든) 상관없이 동작한다 — 단, 타임존이 없는 문자열은 브라우저 로컬
// 시간대로 해석되는데, 서비스 대상이 KST 사용자라 서버가 의도한 시각과 일치한다.
function calc(auctionDeadline: string | null | undefined, now: number): CountdownState {
  if (!auctionDeadline) return EXPIRED

  const deadlineMs = new Date(auctionDeadline).getTime()
  if (Number.isNaN(deadlineMs)) return EXPIRED

  const diffMs = deadlineMs - now
  if (diffMs <= 0) return EXPIRED

  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    label: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    isExpired: false,
    isUrgent: diffMs <= URGENT_THRESHOLD_MS,
  }
}

// 위판 마감(auctionDeadline)까지 남은 시간을 1초마다 갱신해 HH:MM:SS로 돌려주는 커스텀 훅.
// 상품 리스트 카드(ProductResultCard)·상세 페이지(Detail) 양쪽에서 그대로 재사용한다.
//
// ⚠️ 카드마다 이 훅을 각각 붙이면 카드 수만큼 setInterval이 개별로 돈다. 지금 규모(위판장
// 상품 수십 건)에서는 문제 없지만, 리스트가 훨씬 커지면 상위에서 공유 tick(예: Context로
// 1초마다 갱신되는 now 값 하나를 내려주는 방식)으로 바꾸는 게 낫다.
export function useCountdown(auctionDeadline: string | null | undefined): CountdownState {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!auctionDeadline) return
    const deadlineMs = new Date(auctionDeadline).getTime()
    if (Number.isNaN(deadlineMs)) return

    // 이미 지난 시각이면 굳이 매초 재계산할 필요가 없다.
    if (deadlineMs - Date.now() <= 0) return

    const timer = window.setInterval(() => {
      const tickNow = Date.now()
      setNow(tickNow)
      // 이번 틱에서 마감을 넘겼으면 더 이상 돌 필요가 없으니 스스로 정리한다.
      if (deadlineMs - tickNow <= 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [auctionDeadline])

  return calc(auctionDeadline, now)
}
