import type { Product } from '../components/ProductCard'

// SEEAT-_3.HTM 의 products 배열(10건) + mkTrend()를 그대로 참고한 공용 데모 데이터.
// Home / Search / Detail 화면이 동일한 id 체계를 공유해야 카드 클릭 → 상세 이동이 맞물린다.
function mkTrend(base: number): number[] {
  const arr: number[] = []
  let v = base
  for (let i = 0; i < 7; i++) {
    v = Math.round(v * (0.97 + Math.random() * 0.06))
    arr.push(v)
  }
  return arr
}

export function buildInitialProducts(): Product[] {
  const now = Date.now()
  return [
    { id: 1, species: '활전복', region: '통영', seller: '김만수 선장', price: 38000, total: 120, remain: 22, grade: '특', deadlineMs: now + 9 * 60 * 1000, emoji: '🦪', storage: '냉장', mandatory: false, trend: mkTrend(37000) },
    { id: 2, species: '참돔', region: '부산', seller: '이영호 선장', price: 24500, total: 200, remain: 96, grade: '상', deadlineMs: now + 42 * 60 * 1000, emoji: '🐟', storage: '냉장', mandatory: false, trend: mkTrend(23800) },
    { id: 3, species: '갯벌낙지', region: '여수', seller: '박기수 선장', price: 15900, total: 80, remain: 14, grade: '특', deadlineMs: now + 6 * 60 * 1000, emoji: '🐙', storage: '냉장', mandatory: false, trend: mkTrend(15500) },
    { id: 4, species: '병어', region: '목포', seller: '정태식 선장', price: 19800, total: 150, remain: 150, grade: '중', deadlineMs: now + 75 * 60 * 1000, emoji: '🐠', storage: '냉장', mandatory: false, trend: mkTrend(19500) },
    { id: 5, species: '활전복', region: '완도', seller: '한상철 선장', price: 41000, total: 100, remain: 0, grade: '특', deadlineMs: now - 60 * 1000, emoji: '🦪', storage: '냉장', mandatory: false, trend: mkTrend(40500) },
    { id: 6, species: '방어', region: '제주', seller: '오순재 선장', price: 22000, total: 90, remain: 63, grade: '상', deadlineMs: now + 130 * 60 * 1000, emoji: '🐡', storage: '냉장', mandatory: false, trend: mkTrend(21500) },
    { id: 7, species: '전어', region: '여수', seller: '박기수 선장', price: 12000, total: 60, remain: 8, grade: '상', deadlineMs: now + 4 * 60 * 1000, emoji: '🐟', storage: '냉장', mandatory: false, trend: mkTrend(11800) },
    { id: 8, species: '광어', region: '제주', seller: '오순재 선장', price: 27500, total: 110, remain: 70, grade: '특', deadlineMs: now + 95 * 60 * 1000, emoji: '🐟', storage: '냉장', mandatory: false, trend: mkTrend(27000) },
    { id: 9, species: '참치', region: '부산', seller: '이영호 선장', price: 52000, total: 40, remain: 9, grade: '특', deadlineMs: now + 20 * 60 * 1000, emoji: '🐟', storage: '냉동', mandatory: true, trend: mkTrend(51000) },
    { id: 10, species: '고등어', region: '통영', seller: '김만수 선장', price: 9800, total: 300, remain: 210, grade: '상', deadlineMs: now + 150 * 60 * 1000, emoji: '🐟', storage: '냉장', mandatory: true, trend: mkTrend(9400) },
  ]
}
