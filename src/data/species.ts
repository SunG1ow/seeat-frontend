// 판매자 상품 등록(ProductRegistration) 화면 전용 어종 카탈로그.
// - mandatoryAuction: true인 어종은 법적으로 산지위판장 의무 상장 대상이라 판매자-구매자 직거래 자체가
//   금지된다. 그래서 카탈로그를 구성하는 이 시점에 아예 배열에서 제외해 등록 화면 드롭다운에
//   노출되지 않도록 한다(사후에 disabled 처리하는 것이 아니라 사전 필터링).
// - closedSeason이 있는 어종은 직거래 자체는 가능하지만, 당일 날짜가 금어기 구간에 포함되면
//   포획/유통이 법으로 금지되므로 드롭다운에서 disabled로만 남겨 사유를 안내한다.
export interface SpeciesOption {
  id: string
  name: string
  emoji: string
  mandatoryAuction: boolean
  closedSeason?: { startMonth: number; startDay: number; endMonth: number; endDay: number }
}

const ALL_SPECIES: SpeciesOption[] = [
  { id: 'red-seabream', name: '참돔', emoji: '🐟', mandatoryAuction: false },
  { id: 'flounder', name: '광어(넙치)', emoji: '🐟', mandatoryAuction: false },
  { id: 'gizzard-shad', name: '전어', emoji: '🐟', mandatoryAuction: false },
  { id: 'yellowtail', name: '방어', emoji: '🐡', mandatoryAuction: false },
  { id: 'abalone', name: '활전복', emoji: '🦪', mandatoryAuction: false },
  { id: 'mud-octopus', name: '갯벌낙지', emoji: '🐙', mandatoryAuction: false },
  { id: 'pomfret', name: '병어', emoji: '🐠', mandatoryAuction: false },
  { id: 'hairtail', name: '갈치', emoji: '🐟', mandatoryAuction: false },
  { id: 'squid', name: '오징어', emoji: '🦑', mandatoryAuction: false },
  {
    id: 'blue-crab',
    name: '꽃게',
    emoji: '🦀',
    mandatoryAuction: false,
    closedSeason: { startMonth: 6, startDay: 21, endMonth: 8, endDay: 20 },
  },
  {
    id: 'snow-crab',
    name: '대게',
    emoji: '🦀',
    mandatoryAuction: false,
    closedSeason: { startMonth: 6, startDay: 1, endMonth: 11, endDay: 30 },
  },
  {
    id: 'webfoot-octopus',
    name: '주꾸미',
    emoji: '🐙',
    mandatoryAuction: false,
    closedSeason: { startMonth: 5, startDay: 11, endMonth: 8, endDay: 31 },
  },
  // 의무 위판 어종 — 직거래 금지 대상이라 SELECTABLE_SPECIES에서 사전 제외된다.
  { id: 'mackerel', name: '고등어', emoji: '🐟', mandatoryAuction: true },
  { id: 'tuna', name: '참치(다랑어)', emoji: '🐟', mandatoryAuction: true },
  { id: 'anchovy', name: '멸치', emoji: '🐟', mandatoryAuction: true },
]

function dateKey(month: number, day: number) {
  return month * 100 + day
}

export function isClosedSeasonNow(species: SpeciesOption, now: Date = new Date()): boolean {
  const season = species.closedSeason
  if (!season) return false

  const today = dateKey(now.getMonth() + 1, now.getDate())
  const start = dateKey(season.startMonth, season.startDay)
  const end = dateKey(season.endMonth, season.endDay)

  // 시작일이 종료일보다 늦으면 연말을 가로지르는 금어기(예: 11월~2월)로 취급한다.
  if (start <= end) return today >= start && today <= end
  return today >= start || today <= end
}

// §요구사항4 후단: 의무 위판 어종은 카테고리 구성 단계에서 사전 제외.
export const SELECTABLE_SPECIES: SpeciesOption[] = ALL_SPECIES.filter((s) => !s.mandatoryAuction)
