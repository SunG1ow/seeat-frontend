import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type SellerVerificationType, type UserRole } from '../context/AuthContext'
import './AuthAndProfile.css'

// 회원가입 시 선택 가능한 등급: 일반 소비자 '구매자' / 어업인 '판매자'
// (관리자 계정은 별도 발급 대상이라 가입 화면에서는 선택 불가)
type SignupRole = Exclude<UserRole, 'admin'>

const ROLE_OPTIONS: { id: SignupRole; label: string; desc: string }[] = [
  { id: 'buyer', label: '구매자', desc: '수산물을 구매하는 일반 소비자' },
  { id: 'seller', label: '판매자 (어업인)', desc: '수산물을 위판·판매하는 어업인·수산업 종사자' },
]

const VERIFICATION_OPTIONS: { id: SellerVerificationType; label: string }[] = [
  { id: 'business', label: '사업자등록번호로 인증' },
  { id: 'vessel', label: '어선원부 번호로 인증 (무등록 소규모 어민)' },
]

function AuthAndProfile() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<SignupRole>('buyer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [verificationType, setVerificationType] = useState<SellerVerificationType>('business')
  const [businessRegNumber, setBusinessRegNumber] = useState('')
  const [vesselRegNumber, setVesselRegNumber] = useState('')
  const [permitFile, setPermitFile] = useState<File | null>(null)

  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name || !email || !password) {
      setError('이름, 이메일, 비밀번호를 모두 입력해주세요')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }
    if (role === 'seller' && verificationType === 'business' && !businessRegNumber) {
      setError('사업자등록번호를 입력해주세요')
      return
    }
    if (role === 'seller' && verificationType === 'vessel' && (!vesselRegNumber || !permitFile)) {
      setError('어선원부 번호와 조업허가증 서류를 모두 등록해주세요')
      return
    }

    login({
      email,
      name,
      role,
      sellerVerification:
        role === 'seller'
          ? verificationType === 'business'
            ? { type: 'business', businessRegNumber }
            : { type: 'vessel', vesselRegNumber, permitFileName: permitFile?.name }
          : undefined,
    })

    navigate('/mypage')
  }

  return (
    <div className="authprofile">
      <h1 className="authprofile__title fs-title1">회원가입</h1>
      <p className="authprofile__subtitle fs-body2">SEEAT과 함께 신선한 수산물 거래를 시작하세요</p>

      <form className="authprofile__panel" onSubmit={handleSubmit}>
        <div className="authprofile__role-tabs" role="radiogroup" aria-label="회원 유형 선택">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={
                role === option.id
                  ? 'authprofile__role-tab authprofile__role-tab--active'
                  : 'authprofile__role-tab'
              }
            >
              <input
                type="radio"
                name="role"
                value={option.id}
                checked={role === option.id}
                onChange={() => setRole(option.id)}
              />
              <span className="authprofile__role-tab-text">
                <span className="authprofile__role-tab-label">{option.label}</span>
                <span className="authprofile__role-tab-desc fs-caption">{option.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="authprofile__form">
          <div className="authprofile__field">
            <label>이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="authprofile__field">
            <label>이메일</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="authprofile__field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="authprofile__field">
            <label>비밀번호 확인</label>
            <input
              type="password"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </div>

          {role === 'seller' && (
            <div className="authprofile__seller-block">
              <p className="authprofile__seller-title fs-body2">판매자 자격 검증</p>

              <div className="authprofile__verify-tabs">
                {VERIFICATION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      verificationType === option.id
                        ? 'authprofile__verify-tab authprofile__verify-tab--active'
                        : 'authprofile__verify-tab'
                    }
                    onClick={() => setVerificationType(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {verificationType === 'business' ? (
                <div className="authprofile__field">
                  <label>사업자등록번호</label>
                  <input
                    type="text"
                    placeholder="000-00-00000"
                    value={businessRegNumber}
                    onChange={(event) => setBusinessRegNumber(event.target.value)}
                  />
                  <span className="authprofile__hint fs-caption">
                    입력하신 번호는 국세청 사업자등록정보 진위확인 API와 연동되어 자동 검증됩니다
                  </span>
                </div>
              ) : (
                <>
                  <div className="authprofile__field">
                    <label>어선원부 번호</label>
                    <input
                      type="text"
                      placeholder="어선원부 등록번호"
                      value={vesselRegNumber}
                      onChange={(event) => setVesselRegNumber(event.target.value)}
                    />
                  </div>
                  <div className="authprofile__field">
                    <label>조업허가증 서류 업로드</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => setPermitFile(event.target.files?.[0] ?? null)}
                    />
                    {permitFile && (
                      <span className="authprofile__file-name fs-caption">첨부됨: {permitFile.name}</span>
                    )}
                    <span className="authprofile__hint fs-caption">
                      사업자등록증이 없는 소규모 어민은 어선원부 번호와 조업허가증 사본으로 자격을 대신 증빙할 수 있습니다
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="authprofile__error fs-caption">{error}</p>}

          <button type="submit" className="authprofile__submit">
            {role === 'seller' ? '판매자로 가입하기' : '구매자로 가입하기'}
          </button>
        </div>

        <p className="authprofile__login-hint fs-caption">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </form>
    </div>
  )
}

export default AuthAndProfile
