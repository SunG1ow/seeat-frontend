import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

// §4.2.2 GNB: 구매자 모드 vs 판매자 모드는 계정 유형에 따라 결정되며,
// 판매자 모드에서는 GNB에 상품등록/상품관리 메뉴가 추가로 노출된다.
// 모드는 더 이상 GNB에서 수동으로 전환하지 않고, /login 화면에서 로그인한
// 역할(AuthContext)을 그대로 구독한다.
interface NavItem {
  id: string
  label: string
  path?: string
}

const COMMON_NAV: NavItem[] = [
  { id: 'home', label: '홈', path: '/' },
  { id: 'search', label: '상품검색', path: '/search' },
  { id: 'orders', label: '주문내역', path: '/orders' },
]

const SELLER_ONLY_NAV: NavItem[] = [
  { id: 'register', label: '상품등록' },
  { id: 'manage', label: '상품관리', path: '/manage' },
  { id: 'register', label: '상품등록', path: '/register' },
  { id: 'manage', label: '상품관리' },
  { id: 'order-management', label: '주문관리', path: '/seller/orders' },
  { id: 'shipping-management', label: '배송/클레임 관리', path: '/seller/shipping' },
  { id: 'settlement-management', label: '정산 관리', path: '/seller/settlement' },
]

const NOTICE_NAV: NavItem = { id: 'notice', label: '공지사항', path: '/notice' }

function Header() {
  const { role, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems =
    role === 'seller' ? [...COMMON_NAV, ...SELLER_ONLY_NAV, NOTICE_NAV] : [...COMMON_NAV, NOTICE_NAV]

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className={`topbar topbar--${role}`}>
      <div className="ticker">
        <div className="ticker-track mono">
          🐟 LIVE 통영 활전복 위판 12분 남음 · 부산공동어시장 참돔 신규 등록 · 여수 갯벌낙지 82% 소진 · 목포 병어 위판 마감 임박 · 완도 활전복 정산 완료
        </div>
      </div>

      <div className="nav-row container">
        <div className="logo">
          <span className="logo-dot" />
          SEEAT
        </div>

        <nav className="mainnav">
          {navItems.map((item) =>
            item.path ? (
              <Link
                key={item.id}
                to={item.path}
                className={location.pathname === item.path ? 'active' : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <button key={item.id} type="button">
                {item.label}
              </button>
            ),
          )}
        </nav>

        <div className="header-actions">
          <Link to="/mypage" className="link-btn">
            마이페이지
          </Link>
          {isAuthenticated ? (
            <button type="button" className="link-btn" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <>
              <button type="button" className="link-btn" onClick={() => navigate('/signup')}>
                회원가입
              </button>
              <Link to="/login" className="link-btn">
                로그인
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
