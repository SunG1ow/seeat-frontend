import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// §4.2.2 / §4.2.4: 구매자·판매자·관리자 모드는 GNB의 수동 토글이 아니라
// 로그인 화면(Login.tsx)에서 선택한 계정 유형으로 로그인 시 결정된다.
export type UserRole = 'buyer' | 'seller' | 'admin'

// 판매자 자격 검증 방식: 사업자등록번호(국세청 연동 가정) 또는
// 어선원부 번호 + 조업허가증 서류(무등록 소규모 어민 대상)
export type SellerVerificationType = 'business' | 'vessel'

export interface SellerVerification {
  type: SellerVerificationType
  businessRegNumber?: string
  vesselRegNumber?: string
  permitFileName?: string
}

export interface AuthUser {
  email: string
  name: string
  role: UserRole
  phone?: string
  /** GET /api/v1/users/me 조회 결과 — 장바구니/주문내역 등 memberId가 필요한 API 호출에 사용 */
  memberId?: number
  sellerVerification?: SellerVerification
}

interface AuthContextValue {
  role: UserRole
  isAuthenticated: boolean
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  /** 마이페이지 정보수정: 닉네임·연락처만 변경 가능 (이메일·회원 유형은 읽기 전용) */
  updateProfile: (patch: { name: string; phone: string }) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      role: user?.role ?? 'buyer',
      isAuthenticated: user !== null,
      user,
      login: (nextUser) => {
        setUser(nextUser)
      },
      logout: () => {
        setUser(null)
      },
      updateProfile: (patch) => {
        setUser((prev) => (prev ? { ...prev, name: patch.name, phone: patch.phone } : prev))
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
