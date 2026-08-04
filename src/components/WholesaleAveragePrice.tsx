// "오늘의 평균 도매 시세" 섹션.
// 카드 규격은 디자인 초기안 공식 스펙을 그대로 따른다:
//   - 카드: padding 14px / border-radius 12px / border 1px solid #E4E9F0 / 배경 흰색
//   - 가격 숫자: Monospace 폰트, "숫자원/kg" 표기
//   - 막대: 기본 #00A3C4→#00839E(Aqua Blue 그라데이션), 최근 막대만 #FF5C35→#E14620(Coral Orange 그라데이션),
//     직사각형(라운드 없음), gap 2px
// items를 prop으로 주입받는 구조이므로, 실제 API 연동 시에는
// <WholesaleAveragePrice items={apiResponse} /> 형태로 더미 데이터만 교체하면 된다.

export interface WholesalePriceItem {
  /** 어종명 */
  name: string
  /** 원/kg, 콤마가 포함된 표시용 문자열 (예: "38,909") */
  price: string
  /** 등락률, 부호(+/-)와 %가 포함된 표시용 문자열 (예: "+6.4%") */
  change: string
  /** 최근 6일 추이 — 각 값을 그대로 바 높이(px)로 사용한다 */
  trend: number[]
}

export interface WholesaleAveragePriceProps {
  /** API 응답 등 외부 데이터로 교체 가능한 아이템 목록. 미전달 시 데모용 더미 데이터를 사용한다. */
  items?: WholesalePriceItem[]
}

// 백엔드 연동 전 임시 더미 데이터. 컴포넌트 로직과 분리되어 있어
// 이 상수를 지우고 API 응답을 items prop으로 흘려보내기만 하면 된다.
const DEFAULT_PRICE_DATA: WholesalePriceItem[] = [
  { name: '전복', price: '49,600', change: '+6.4%', trend: [20, 25, 30, 40, 35, 50] },
  { name: '문어', price: '36,500', change: '-13.2%', trend: [50, 45, 40, 35, 30, 20] },
  { name: '대방어', price: '35,000', change: '-5.2%', trend: [35, 30, 25, 20, 15, 10] },
  { name: '광어', price: '27,500', change: '-7.9%', trend: [30, 28, 25, 20, 15, 12] },
  { name: '새우', price: '25,300', change: '-0.7%', trend: [25, 22, 20, 18, 15, 14] },
]

function ChangeBadge({ change }: { change: string }) {
  if (change.startsWith('+')) {
    return (
      <span className="flex items-center gap-0.5 text-sm font-semibold text-red-500">
        <span aria-hidden="true">▲</span>
        {change}
      </span>
    )
  }

  if (change.startsWith('-')) {
    return (
      <span className="flex items-center gap-0.5 text-sm font-semibold text-[#00A3C4]">
        <span aria-hidden="true">▼</span>
        {change}
      </span>
    )
  }

  // "0.0%"처럼 부호가 없는 값이 API에서 내려와도 깨지지 않도록 하는 기본 상태
  return <span className="text-sm font-semibold text-gray-400">{change}</span>
}

const BAR_GRADIENT = 'linear-gradient(180deg, #00A3C4, #00839E)'
const BAR_GRADIENT_LATEST = 'linear-gradient(180deg, #FF5C35, #E14620)'

function TrendBars({ trend }: { trend: number[] }) {
  const lastIndex = trend.length - 1

  return (
    <div className="flex h-[44px] items-end gap-[2px]">
      {trend.map((value, index) => (
        <span
          key={index}
          className="flex-1"
          style={{
            height: `${Math.max(0, value)}px`,
            backgroundImage: index === lastIndex ? BAR_GRADIENT_LATEST : BAR_GRADIENT,
          }}
        />
      ))}
    </div>
  )
}

function PriceCard({ item }: { item: WholesalePriceItem }) {
  return (
    <div className="rounded-[12px] border border-[#E4E9F0] bg-white p-[14px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{item.name}</span>
        <ChangeBadge change={item.change} />
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="mono text-2xl font-bold text-gray-900">{item.price}</span>
        <span className="text-sm font-normal text-gray-500">원/kg</span>
      </div>

      <div className="mt-3">
        <TrendBars trend={item.trend} />
      </div>
    </div>
  )
}

function WholesaleAveragePrice({ items = DEFAULT_PRICE_DATA }: WholesaleAveragePriceProps) {
  return (
    <section className="py-8">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-bold text-gray-900">오늘의 평균 도매 시세</h2>
        <span className="text-sm text-gray-400">전국 수산시장 공공데이터 연동 (모의)</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">표시할 시세 데이터가 없습니다</p>
      ) : (
        // 5칸 고정 그리드 — flex-wrap과 달리 카드 수가 줄어도(마지막 줄에 카드가 하나만
        // 남아도) 한 칸이 멋대로 늘어나지 않아 항상 안정적인 비율을 유지한다.
        <div className="mt-4 grid grid-cols-5 gap-4">
          {items.map((item) => (
            <PriceCard key={item.name} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

export default WholesaleAveragePrice
