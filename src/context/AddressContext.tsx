import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// F-06-02 마이페이지 배송지 관리: 사용자당 최대 5개까지, 기본 배송지는 항상 1개만 유지된다
export const MAX_ADDRESS_COUNT = 5

export interface Address {
  id: number
  recipient: string
  phone: string
  zipcode: string
  address1: string
  address2: string
  isDefault: boolean
}

export type AddressInput = Omit<Address, 'id' | 'isDefault'>

interface AddressContextValue {
  addresses: Address[]
  /** 이미 5개가 등록되어 있으면 추가하지 않고 false를 반환한다 */
  addAddress: (input: AddressInput) => boolean
  updateAddress: (id: number, input: AddressInput) => void
  removeAddress: (id: number) => void
  setDefaultAddress: (id: number) => void
}

const AddressContext = createContext<AddressContextValue | null>(null)

function buildInitialAddresses(): Address[] {
  return [
    {
      id: 1,
      recipient: '이서연',
      phone: '010-1234-5678',
      zipcode: '16419',
      address1: '경기도 수원시 영통구 111',
      address2: '101동 202호',
      isDefault: true,
    },
    {
      id: 2,
      recipient: '이서연',
      phone: '010-9876-5432',
      zipcode: '06234',
      address1: '서울특별시 강남구 테헤란로 222',
      address2: '스카이타워 8층',
      isDefault: false,
    },
  ]
}

export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(buildInitialAddresses)
  const nextAddressId = useRef(100)

  const value = useMemo<AddressContextValue>(
    () => ({
      addresses,
      addAddress: (input) => {
        if (addresses.length >= MAX_ADDRESS_COUNT) return false
        setAddresses((prev) => [
          ...prev,
          { ...input, id: nextAddressId.current++, isDefault: prev.length === 0 },
        ])
        return true
      },
      updateAddress: (id, input) => {
        setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...input } : a)))
      },
      removeAddress: (id) => {
        setAddresses((prev) => {
          const next = prev.filter((a) => a.id !== id)
          // 기본 배송지를 삭제했다면 남은 배송지 중 첫 번째를 자동으로 기본 배송지로 지정한다
          if (next.length > 0 && !next.some((a) => a.isDefault)) {
            next[0] = { ...next[0], isDefault: true }
          }
          return next
        })
      },
      setDefaultAddress: (id) => {
        setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })))
      },
    }),
    [addresses],
  )

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
}

export function useAddresses() {
  const ctx = useContext(AddressContext)
  if (!ctx) throw new Error('useAddresses must be used within an AddressProvider')
  return ctx
}
