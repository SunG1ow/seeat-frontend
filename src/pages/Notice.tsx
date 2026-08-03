import { useState } from 'react'
import './Notice.css'

interface NoticePost {
  id: number
  category: string
  title: string
  date: string
  content: string
}

// 데모용 공지사항 더미 데이터 (수산물 직거래 플랫폼 특성 반영)
const NOTICE_POSTS: NoticePost[] = [
  {
    id: 4,
    category: '안내',
    title: '금어기 준수 및 위판장 이용 수칙 안내',
    date: '2026.07.20',
    content:
      '수산자원 보호를 위한 금어기 동안에는 대상 어종의 신규 등록 및 위판이 제한됩니다. 위판장 이용 시 안전수칙과 위생수칙을 반드시 준수해주시기 바라며, 미준수 적발 시 판매자 계정 이용이 제한될 수 있습니다.',
  },
  {
    id: 3,
    category: '이벤트',
    title: '당일 조업 특가 안내',
    date: '2026.07.16',
    content:
      '매일 새벽 위판장에서 갓 들어온 당일 조업 수산물을 특가로 만나보세요. 마감임박 상품은 실시간 카운트다운으로 확인하실 수 있으며, 재고 소진 시 자동으로 마감 처리됩니다.',
  },
  {
    id: 2,
    category: '점검',
    title: '시스템 정기 점검 안내',
    date: '2026.07.10',
    content:
      '서비스 품질 향상을 위해 매주 수요일 새벽 2시~4시 정기 점검이 진행됩니다. 점검 시간 동안 일시적으로 서비스 이용이 제한될 수 있는 점 양해 부탁드립니다.',
  },
  {
    id: 1,
    category: '공지',
    title: '결제수단 추가 안내 (계좌이체)',
    date: '2026.07.05',
    content:
      '보다 편리한 이용을 위해 계좌이체 결제수단이 추가되었습니다. 마이페이지 > 정보수정에서 결제수단을 확인하실 수 있습니다.',
  },
]

function Notice() {
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <div className="notice">
      <h1 className="notice__title fs-title1">공지사항</h1>
      <p className="notice__subtitle fs-body2">SEEAT의 새 소식과 안내를 확인하세요</p>

      <div className="notice__list">
        {NOTICE_POSTS.map((post) => {
          const isOpen = openId === post.id
          return (
            <div className="notice__item" key={post.id}>
              <button
                type="button"
                className="notice__row"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : post.id)}
              >
                <span className="notice__category">{post.category}</span>
                <span className="notice__row-title fs-body1">{post.title}</span>
                <span className="notice__date fs-caption mono">{post.date}</span>
                <span
                  className={`notice__chevron${isOpen ? ' notice__chevron--open' : ''}`}
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>
              {isOpen && <div className="notice__content fs-body2">{post.content}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Notice
