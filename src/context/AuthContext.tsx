import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// §4.2.2 / §4.2.4: 구매자·판매자·관리자 모드는 GNB의 수동 토글이 아니라
// 로그인 화면(Login.tsx)에서 선택한 계정 유형으로 로그인 시 결정된다.
export type UserRole = 'buyer' | 'seller' | 'admin'

interface AuthContextValue {
  role: UserRole
  isAuthenticated: boolean
  login: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('buyer')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      isAuthenticated,
      login: (nextRole) => {
        setRole(nextRole)
        setIsAuthenticated(true)
      },
      logout: () => {
        setRole('buyer')
        setIsAuthenticated(false)
      },
    }),
    [role, isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
