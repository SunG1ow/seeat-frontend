import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type AuthUser, type UserRole } from '../context/AuthContext'
import './Login.css'

// SEEAT-_3.HTM #screen-login 의 .login-tab 구조 참고 (구매자/판매자/관리자 탭 전환)
const LOGIN_TABS: { id: UserRole; label: string }[] = [
  { id: 'buyer', label: '구매자 로그인' },
  { id: 'seller', label: '판매자(조합) 로그인' },
  { id: 'admin', label: '관리자 로그인' },
]

function Login() {
  const [activeTab, setActiveTab] = useState<UserRole>('buyer')
  const { login } = useAuth()
  const navigate = useNavigate()

  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPassword, setBuyerPassword] = useState('')

  const [coopName, setCoopName] = useState('')
  const [sellerBizNumber, setSellerBizNumber] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [sellerPassword, setSellerPassword] = useState('')

  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminOtp, setAdminOtp] = useState('')

  // §4.2.4: 이메일/비밀번호로 로그인하면 선택된 역할이 AuthContext(전역 상태)에
  // 저장되어 구매자/판매자/관리자 모드가 자연스럽게 전환된다.
  function handleLogin(user: AuthUser) {
    login(user)
    navigate('/')
  }

  return (
    <div className="login">
      <h1 className="login__title fs-title1">로그인</h1>
      <p className="login__subtitle fs-body2">SEEAT 서비스 이용을 위해 로그인해주세요</p>

      <div className="login__panel">
        <div className="login__tabs">
          {LOGIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id ? 'login__tab login__tab--active' : 'login__tab'
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'buyer' && (
          <div className="login__form">
            <div className="login__field">
              <label>아이디 / 이메일</label>
              <input
                type="text"
                placeholder="you@example.com"
                value={buyerEmail}
                onChange={(event) => setBuyerEmail(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={buyerPassword}
                onChange={(event) => setBuyerPassword(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="login__submit login__submit--primary"
              onClick={() =>
                handleLogin({
                  email: buyerEmail,
                  name: buyerEmail.split('@')[0] || '구매자',
                  role: 'buyer',
                })
              }
            >
              구매자로 로그인
            </button>
          </div>
        )}

        {activeTab === 'seller' && (
          <div className="login__form">
            <div className="login__field">
              <label>조합명</label>
              <input
                type="text"
                placeholder="예: 통영수산업협동조합"
                value={coopName}
                onChange={(event) => setCoopName(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>사업자등록번호</label>
              <input
                type="text"
                placeholder="000-00-00000"
                value={sellerBizNumber}
                onChange={(event) => setSellerBizNumber(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>아이디 / 이메일</label>
              <input
                type="text"
                placeholder="you@coop.com"
                value={sellerEmail}
                onChange={(event) => setSellerEmail(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={sellerPassword}
                onChange={(event) => setSellerPassword(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="login__submit login__submit--coral"
              onClick={() =>
                handleLogin({
                  email: sellerEmail,
                  name: coopName || '판매자',
                  role: 'seller',
                  sellerVerification: { type: 'business', businessRegNumber: sellerBizNumber },
                })
              }
            >
              판매자로 로그인
            </button>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="login__form">
            <div className="login__field">
              <label>관리자 아이디</label>
              <input
                type="text"
                placeholder="admin"
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
            </div>
            <div className="login__field">
              <label>2차 비밀번호(OTP)</label>
              <input
                type="text"
                placeholder="6자리 숫자"
                value={adminOtp}
                onChange={(event) => setAdminOtp(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="login__submit login__submit--outline"
              onClick={() =>
                handleLogin({
                  email: adminId,
                  name: '관리자',
                  role: 'admin',
                })
              }
            >
              관리자로 로그인
            </button>
          </div>
        )}

        <p className="login__signup-hint fs-caption">
          아직 계정이 없으신가요?{' '}
          <span className="login__signup-link" onClick={() => navigate('/signup')}>
            회원가입
          </span>
        </p>
      </div>
    </div>
  )
}

export default Login
