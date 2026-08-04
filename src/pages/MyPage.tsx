import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ORDER_STAGES, useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { useAddresses, MAX_ADDRESS_COUNT, type Address, type AddressInput } from '../context/AddressContext'
import './MyPage.css'

const EMPTY_ADDRESS_DRAFT: AddressInput = {
  recipient: '',
  phone: '',
  zipcode: '',
  address1: '',
  address2: '',
}

type MypageTab = 'address' | 'edit'

const TABS: { id: MypageTab; label: string }[] = [
  { id: 'address', label: '배송지 관리' },
  { id: 'edit', label: '정보수정' },
]

// SEEAT-_3.HTM #screen-mypage(.mypage-layout, .side-menu) 참고
function MyPage() {
  const [activeTab, setActiveTab] = useState<MypageTab>('address')
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { orders } = useOrders()
  const { user, logout, updateProfile } = useAuth()
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useAddresses()
  const navigate = useNavigate()

  const [addrFormOpen, setAddrFormOpen] = useState(false)
  const [editingAddrId, setEditingAddrId] = useState<number | null>(null)
  const [addrDraft, setAddrDraft] = useState<AddressInput>(EMPTY_ADDRESS_DRAFT)
  const [addrError, setAddrError] = useState<string | null>(null)

  const [nicknameDraft, setNicknameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)

  // 로그인한 사용자 정보가 바뀔 때(로그인/로그아웃 포함)마다 수정 폼 초기값을 동기화한다
  useEffect(() => {
    setNicknameDraft(user?.name ?? '')
    setPhoneDraft(user?.phone ?? '')
  }, [user])

  // 미완료된 주문/정산 건(아직 구매확정 전 단계)이 있으면 탈퇴를 제한한다
  const pendingOrders = orders.filter((order) => order.stage < ORDER_STAGES.length - 1)
  const hasPendingOrders = pendingOrders.length > 0

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  function handleWithdraw() {
    if (hasPendingOrders) {
      setWithdrawModalOpen(false)
      flashToast(`미완료된 주문/정산 건이 ${pendingOrders.length}건 있어 탈퇴할 수 없습니다`)
      return
    }

    logout()
    setWithdrawModalOpen(false)
    flashToast('회원 탈퇴가 완료되었습니다')
    navigate('/')
  }

  function handleProfileSave() {
    if (!user) return

    if (!nicknameDraft.trim()) {
      setProfileError('닉네임을 입력해주세요')
      return
    }
    // 비밀번호 변경은 선택 사항: 두 필드가 모두 비어 있으면 비밀번호는 그대로 둔다
    if (newPassword || newPasswordConfirm) {
      if (newPassword.length < 8) {
        setProfileError('새 비밀번호는 8자 이상 입력해주세요')
        return
      }
      if (newPassword !== newPasswordConfirm) {
        setProfileError('새 비밀번호가 일치하지 않습니다')
        return
      }
    }

    updateProfile({ name: nicknameDraft.trim(), phone: phoneDraft.trim() })
    setNewPassword('')
    setNewPasswordConfirm('')
    setProfileError(null)
    flashToast('회원 정보가 수정되었습니다')
  }

  function openAddAddressForm() {
    if (addresses.length >= MAX_ADDRESS_COUNT) {
      flashToast(`배송지는 최대 ${MAX_ADDRESS_COUNT}개까지 등록할 수 있습니다`)
      return
    }
    setEditingAddrId(null)
    setAddrDraft(EMPTY_ADDRESS_DRAFT)
    setAddrError(null)
    setAddrFormOpen(true)
  }

  function openEditAddressForm(address: Address) {
    setEditingAddrId(address.id)
    setAddrDraft({
      recipient: address.recipient,
      phone: address.phone,
      zipcode: address.zipcode,
      address1: address.address1,
      address2: address.address2,
    })
    setAddrError(null)
    setAddrFormOpen(true)
  }

  function closeAddressForm() {
    setAddrFormOpen(false)
    setEditingAddrId(null)
    setAddrError(null)
  }

  function handleAddressSave() {
    const { recipient, phone, zipcode, address1, address2 } = addrDraft
    if (!recipient.trim() || !phone.trim() || !zipcode.trim() || !address1.trim() || !address2.trim()) {
      setAddrError('모든 항목을 입력해주세요')
      return
    }

    if (editingAddrId !== null) {
      updateAddress(editingAddrId, { recipient, phone, zipcode, address1, address2 })
      flashToast('배송지가 수정되었습니다')
    } else {
      const added = addAddress({ recipient, phone, zipcode, address1, address2 })
      if (!added) {
        flashToast(`배송지는 최대 ${MAX_ADDRESS_COUNT}개까지 등록할 수 있습니다`)
        return
      }
      flashToast('배송지가 추가되었습니다')
    }
    closeAddressForm()
  }

  function handleDeleteAddress(id: number) {
    removeAddress(id)
    flashToast('배송지가 삭제되었습니다')
  }

  function handleSetDefaultAddress(id: number) {
    setDefaultAddress(id)
    flashToast('기본 배송지로 설정되었습니다')
  }

  return (
    <div className="mypage">
      <h1 className="mypage__title fs-title1">마이페이지</h1>

      <div className="mypage__layout">
        <div className="mypage__side-menu">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'mypage__tab mypage__tab--active' : 'mypage__tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mypage__content">
          {activeTab === 'address' && (
            <div className="mypage__address">
              {addresses.length === 0 ? (
                <div className="mypage__empty fs-body2">등록된 배송지가 없습니다</div>
              ) : (
                <div className="mypage__addr-list">
                  {[...addresses]
                    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
                    .map((address) => (
                      <div className="mypage__addr-card" key={address.id}>
                        <div className="mypage__addr-main">
                          <div className="mypage__addr-head">
                            <b>{address.recipient}</b>
                            {address.isDefault && (
                              <span className="mypage__addr-badge">기본 배송지</span>
                            )}
                          </div>
                          <div className="mypage__addr-phone fs-caption">{address.phone}</div>
                          <div className="mypage__addr-line fs-body2">
                            ({address.zipcode}) {address.address1} {address.address2}
                          </div>
                        </div>
                        <div className="mypage__addr-actions">
                          {!address.isDefault && (
                            <button
                              type="button"
                              className="mypage__addr-action-btn"
                              onClick={() => handleSetDefaultAddress(address.id)}
                            >
                              기본으로 설정
                            </button>
                          )}
                          <button
                            type="button"
                            className="mypage__addr-action-btn"
                            onClick={() => openEditAddressForm(address)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="mypage__addr-action-btn mypage__addr-action-btn--danger"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="mypage__addr-footer">
                <button
                  type="button"
                  className="mypage__addr-add-btn"
                  onClick={openAddAddressForm}
                  disabled={addresses.length >= MAX_ADDRESS_COUNT}
                >
                  + 새 배송지 추가
                </button>
                <span className="mypage__addr-count fs-caption">
                  {addresses.length} / {MAX_ADDRESS_COUNT}
                  {addresses.length >= MAX_ADDRESS_COUNT && ' · 최대 등록 개수에 도달했습니다'}
                </span>
              </div>

              {addrFormOpen && (
                <div className="mypage__addr-form">
                  <h3 className="mypage__addr-form-title">
                    {editingAddrId !== null ? '배송지 수정' : '새 배송지 추가'}
                  </h3>

                  <div className="mypage__addr-form-grid">
                    <div className="mypage__addr-field">
                      <label>수령인 이름</label>
                      <input
                        type="text"
                        value={addrDraft.recipient}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, recipient: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field">
                      <label>연락처</label>
                      <input
                        type="text"
                        placeholder="010-0000-0000"
                        value={addrDraft.phone}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, phone: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field">
                      <label>우편번호</label>
                      <input
                        type="text"
                        placeholder="00000"
                        value={addrDraft.zipcode}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, zipcode: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field mypage__addr-field--full">
                      <label>기본 주소</label>
                      <input
                        type="text"
                        value={addrDraft.address1}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, address1: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field mypage__addr-field--full">
                      <label>상세 주소</label>
                      <input
                        type="text"
                        value={addrDraft.address2}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, address2: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {addrError && <p className="mypage__addr-error fs-body2">{addrError}</p>}

                  <div className="mypage__addr-form-actions">
                    <button
                      type="button"
                      className="mypage__modal-btn mypage__modal-btn--cancel"
                      onClick={closeAddressForm}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="mypage__modal-btn mypage__modal-btn--confirm"
                      onClick={handleAddressSave}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="mypage__account">
              {user ? (
                <>
                  <div className="mypage__account-form">
                    <div className="mypage__account-field">
                      <label>닉네임</label>
                      <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(event) => setNicknameDraft(event.target.value)}
                      />
                    </div>
                    <div className="mypage__account-field">
                      <label>연락처</label>
                      <input
                        type="text"
                        placeholder="010-0000-0000"
                        value={phoneDraft}
                        onChange={(event) => setPhoneDraft(event.target.value)}
                      />
                    </div>
                    <div className="mypage__account-field">
                      <label>이메일 (수정 불가)</label>
                      <input type="text" value={user.email} readOnly disabled />
                    </div>
                    <div className="mypage__account-field">
                      <label>회원 유형 (수정 불가)</label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={
                          user.role === 'seller' ? '판매자' : user.role === 'admin' ? '관리자' : '구매자'
                        }
                      />
                    </div>
                    {user.sellerVerification && (
                      <div className="mypage__account-field mypage__account-field--full">
                        <label>판매자 인증 (수정 불가)</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={
                            user.sellerVerification.type === 'business'
                              ? `사업자등록번호 ${user.sellerVerification.businessRegNumber}`
                              : `어선원부 번호 ${user.sellerVerification.vesselRegNumber}`
                          }
                        />
                      </div>
                    )}
                    <div className="mypage__account-field">
                      <label>새 비밀번호</label>
                      <input
                        type="password"
                        placeholder="8자 이상 입력 (변경 시에만)"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </div>
                    <div className="mypage__account-field">
                      <label>새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(event) => setNewPasswordConfirm(event.target.value)}
                      />
                    </div>
                  </div>

                  {profileError && <p className="mypage__account-error fs-body2">{profileError}</p>}

                  <button type="button" className="mypage__account-save-btn" onClick={handleProfileSave}>
                    수정 완료
                  </button>
                </>
              ) : (
                <div className="mypage__empty fs-body2">로그인 정보가 없습니다</div>
              )}

              <div className="mypage__withdraw-block">
                <button
                  type="button"
                  className="mypage__withdraw-btn"
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  회원 탈퇴
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {withdrawModalOpen && (
        <div className="mypage__modal-overlay" onClick={() => setWithdrawModalOpen(false)}>
          <div className="mypage__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="mypage__modal-title">회원 탈퇴</h3>

            {hasPendingOrders ? (
              <p className="mypage__modal-text">
                미완료된 주문/정산 건이 {pendingOrders.length}건 있어 탈퇴할 수 없습니다. 모든 주문이
                구매확정된 이후 다시 시도해주세요.
              </p>
            ) : (
              <p className="mypage__modal-text">정말 탈퇴하시겠습니까? 탈퇴 후에는 되돌릴 수 없습니다.</p>
            )}

            <p className="mypage__modal-notice fs-caption">
              탈퇴 완료 시 개인정보는 즉시 파기되지만 전자상거래법에 따라 거래 내역은 5년간 분리
              보관됩니다.
            </p>

            <div className="mypage__modal-actions">
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--cancel"
                onClick={() => setWithdrawModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--confirm"
                onClick={handleWithdraw}
                disabled={hasPendingOrders}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="mypage__toast fs-body2">{toast}</div>}
    </div>
  )
}

export default MyPage
