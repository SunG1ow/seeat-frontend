import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'
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

  function handleLogin(role: UserRole) {
    login(role)
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
              <input type="text" placeholder="you@example.com" />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <button
              type="button"
              className="login__submit login__submit--primary"
              onClick={() => handleLogin('buyer')}
            >
              구매자로 로그인
            </button>
          </div>
        )}

        {activeTab === 'seller' && (
          <div className="login__form">
            <div className="login__field">
              <label>조합명</label>
              <input type="text" placeholder="예: 통영수산업협동조합" />
            </div>
            <div className="login__field">
              <label>사업자등록번호</label>
              <input type="text" placeholder="000-00-00000" />
            </div>
            <div className="login__field">
              <label>아이디 / 이메일</label>
              <input type="text" placeholder="you@coop.com" />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <button
              type="button"
              className="login__submit login__submit--coral"
              onClick={() => handleLogin('seller')}
            >
              판매자로 로그인
            </button>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="login__form">
            <div className="login__field">
              <label>관리자 아이디</label>
              <input type="text" placeholder="admin" />
            </div>
            <div className="login__field">
              <label>비밀번호</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="login__field">
              <label>2차 비밀번호(OTP)</label>
              <input type="text" placeholder="6자리 숫자" />
            </div>
            <button
              type="button"
              className="login__submit login__submit--outline"
              onClick={() => handleLogin('admin')}
            >
              관리자로 로그인
            </button>
          </div>
        )}

        <p className="login__signup-hint fs-caption">
          아직 계정이 없으신가요? <span className="login__signup-link">회원가입</span>
        </p>
      </div>
    </div>
  )
}

export default Login
