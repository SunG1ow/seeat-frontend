import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ORDER_STAGES, useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { getMyAddresses, addAddress, deleteAddress, type ApiAddress } from '../api/addresses'
import { updateMemberProfile, changeMemberPassword, withdrawMember } from '../api/users'
import './MyPage.css'

// F-06-02: 사용자당 배송지는 최대 5개까지 등록할 수 있다 (서버 제한과 별개로 프론트에서도 가드).
const MAX_ADDRESS_COUNT = 5

interface AddressDraft {
  alias: string
  receiverName: string
  receiverPhone: string
  address: string
  isDefault: boolean
}

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  alias: '',
  receiverName: '',
  receiverPhone: '',
  address: '',
  isDefault: false,
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
  const navigate = useNavigate()

  // 배송지 목록 — GET /api/v1/users/me/addresses 실데이터 (AddressContext 목업은 걷어냄)
  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [addressLoadError, setAddressLoadError] = useState<string | null>(null)
  const [deletingAddressIds, setDeletingAddressIds] = useState<Set<number>>(new Set())

  const [addrFormOpen, setAddrFormOpen] = useState(false)
  const [addrDraft, setAddrDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT)
  const [addrError, setAddrError] = useState<string | null>(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  const [nicknameDraft, setNicknameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const [withdrawPassword, setWithdrawPassword] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  // 로그인한 사용자 정보가 바뀔 때(로그인/로그아웃 포함)마다 수정 폼 초기값을 동기화한다
  useEffect(() => {
    setNicknameDraft(user?.name ?? '')
    setPhoneDraft(user?.phone ?? '')
  }, [user])

  // 마이페이지 진입 시 1회 조회. GET /api/v1/users/me/addresses는 요청 파라미터가 없고,
  // 로그인한 사용자는 Authorization 헤더(JWT)로 서버가 식별한다.
  useEffect(() => {
    const controller = new AbortController()

    async function fetchAddresses() {
      setIsLoadingAddresses(true)
      setAddressLoadError(null)

      if (!localStorage.getItem('accessToken')) {
        setAddressLoadError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setIsLoadingAddresses(false)
        return
      }

      const result = await getMyAddresses(controller.signal)
      if (controller.signal.aborted) return

      if (result.ok) {
        setAddresses(result.data ?? [])
      } else {
        setAddressLoadError(
          result.message || '배송지 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
        )
      }
      setIsLoadingAddresses(false)
    }

    fetchAddresses()
    return () => controller.abort()
  }, [])

  // 미완료된 주문/정산 건(아직 구매확정 전 단계)이 있으면 탈퇴를 제한한다
  const pendingOrders = orders.filter((order) => order.stage < ORDER_STAGES.length - 1)
  const hasPendingOrders = pendingOrders.length > 0

  function flashToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  function openWithdrawModal() {
    setWithdrawPassword('')
    setWithdrawReason('')
    setWithdrawError(null)
    setWithdrawModalOpen(true)
  }

  function closeWithdrawModal() {
    setWithdrawModalOpen(false)
    setWithdrawError(null)
  }

  // DELETE /api/v1/users/me 호출 → success: true일 때만 로그아웃/페이지 이동 등 후속 처리를 한다.
  // 실패(catch 포함)하면 절대 탈퇴된 것처럼 처리하지 않고 모달에 에러만 보여준다.
  async function handleWithdraw() {
    if (hasPendingOrders) {
      closeWithdrawModal()
      flashToast(`미완료된 주문/정산 건이 ${pendingOrders.length}건 있어 탈퇴할 수 없습니다`)
      return
    }
    if (!withdrawPassword) {
      setWithdrawError('비밀번호를 입력해주세요')
      return
    }
    if (isWithdrawing) return

    setIsWithdrawing(true)
    try {
      const result = await withdrawMember({
        password: withdrawPassword,
        reason: withdrawReason.trim() || undefined,
      })
      if (result.ok) {
        closeWithdrawModal()
        logout()
        flashToast('회원 탈퇴가 완료되었습니다')
        navigate('/login')
      } else {
        setWithdrawError(result.message || '회원 탈퇴에 실패했습니다. 비밀번호를 확인해주세요.')
      }
    } finally {
      setIsWithdrawing(false)
    }
  }

  // PUT /api/v1/users/me 호출 → success: true일 때만 화면(AuthContext)에 반영하고 성공 토스트를
  // 띄운다. success: false거나 통신 자체가 실패(catch)해도 무조건 성공으로 보이지 않도록
  // updateMemberProfile()의 반환값(ok)을 반드시 확인한다.
  async function handleProfileSave() {
    if (!user) return
    if (!nicknameDraft.trim()) {
      setProfileError('닉네임을 입력해주세요')
      return
    }
    if (isSavingProfile) return

    setProfileError(null)
    setIsSavingProfile(true)
    try {
      const result = await updateMemberProfile({
        nickname: nicknameDraft.trim(),
        phoneNumber: phoneDraft.trim(),
      })
      if (result.ok && result.data) {
        updateProfile({ name: result.data.nickname, phone: result.data.phoneNumber })
        flashToast('회원 정보가 수정되었습니다')
      } else {
        setProfileError(result.message || '회원정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  // PUT /api/v1/users/me/password 호출 → success: true일 때만 성공 토스트를 띄우고 입력값을
  // 비운다. 회원정보 수정과는 별개의 API라 저장 버튼도 분리해, 한쪽이 실패해도 다른 쪽 성공
  // 여부가 뒤섞이지 않게 한다.
  async function handlePasswordChange() {
    if (!currentPassword) {
      setPasswordError('현재 비밀번호를 입력해주세요')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상 입력해주세요')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다')
      return
    }
    if (isSavingPassword) return

    setPasswordError(null)
    setIsSavingPassword(true)
    try {
      const result = await changeMemberPassword({ currentPassword, newPassword })
      if (result.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setNewPasswordConfirm('')
        flashToast('비밀번호가 변경되었습니다')
      } else {
        setPasswordError(result.message || '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.')
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  // 성공 시 목록을 다시 불러와 화면을 갱신한다(추가한 배송지가 isDefault:true면 서버가
  // 다른 배송지의 기본 여부를 함께 조정할 수 있어, 로컬에서 임의로 병합하지 않고 다시 조회한다).
  async function refreshAddresses() {
    const result = await getMyAddresses()
    if (result.ok) {
      setAddresses(result.data ?? [])
    } else {
      flashToast(result.message || '배송지 목록을 새로고침하지 못했습니다.')
    }
  }

  function openAddAddressForm() {
    if (addresses.length >= MAX_ADDRESS_COUNT) {
      flashToast(`배송지는 최대 ${MAX_ADDRESS_COUNT}개까지 등록할 수 있습니다`)
      return
    }
    setAddrDraft(EMPTY_ADDRESS_DRAFT)
    setAddrError(null)
    setAddrFormOpen(true)
  }

  function closeAddressForm() {
    setAddrFormOpen(false)
    setAddrError(null)
  }

  // POST /api/v1/users/me/addresses — success:true일 때만 목록을 새로고침하고 폼을 닫는다.
  // success:false거나 통신 자체가 실패(catch)해도 무조건 성공으로 보이는 일이 없도록
  // addAddress()의 반환값(ok)을 반드시 확인한다.
  async function handleAddressSave() {
    const { alias, receiverName, receiverPhone, address, isDefault } = addrDraft
    if (!alias.trim() || !receiverName.trim() || !receiverPhone.trim() || !address.trim()) {
      setAddrError('모든 항목을 입력해주세요')
      return
    }
    if (isSavingAddress) return

    setIsSavingAddress(true)
    try {
      const result = await addAddress({
        alias: alias.trim(),
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        address: address.trim(),
        isDefault,
      })
      if (result.ok) {
        await refreshAddresses()
        closeAddressForm()
        flashToast('배송지가 추가되었습니다')
      } else {
        setAddrError(result.message || '배송지 추가에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setIsSavingAddress(false)
    }
  }

  // DELETE /api/v1/users/me/addresses/{addressId} — success:true일 때만 화면 상태에서
  // 해당 배송지를 필터링해 지운다. 전체 목록을 다시 불러오지 않고 그 자리에서 즉시 반영한다.
  async function handleDeleteAddress(addressId: number) {
    if (deletingAddressIds.has(addressId)) return

    setDeletingAddressIds((prev) => new Set(prev).add(addressId))
    try {
      const result = await deleteAddress(addressId)
      if (result.ok) {
        setAddresses((prev) => prev.filter((a) => a.addressId !== addressId))
        flashToast('배송지가 삭제되었습니다')
      } else {
        flashToast(result.message || '배송지 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setDeletingAddressIds((prev) => {
        const next = new Set(prev)
        next.delete(addressId)
        return next
      })
    }
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
              {isLoadingAddresses && (
                <div className="mypage__addr-status fs-body2">배송지 목록을 불러오는 중입니다...</div>
              )}

              {!isLoadingAddresses && addressLoadError && (
                <div className="mypage__addr-status mypage__addr-status--error fs-body2">
                  {addressLoadError}
                </div>
              )}

              {!isLoadingAddresses && !addressLoadError && addresses.length === 0 && (
                <div className="mypage__empty fs-body2">등록된 배송지가 없습니다</div>
              )}

              {!isLoadingAddresses && !addressLoadError && addresses.length > 0 && (
                <div className="mypage__addr-list">
                  {[...addresses]
                    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
                    .map((address) => (
                      <div className="mypage__addr-card" key={address.addressId}>
                        <div className="mypage__addr-main">
                          <div className="mypage__addr-head">
                            <b>{address.alias}</b>
                            {address.isDefault && (
                              <span className="mypage__addr-badge">기본 배송지</span>
                            )}
                          </div>
                          <div className="mypage__addr-phone fs-caption">
                            {address.receiverName} · {address.receiverPhone}
                          </div>
                          <div className="mypage__addr-line fs-body2">{address.address}</div>
                        </div>
                        <div className="mypage__addr-actions">
                          <button
                            type="button"
                            className="mypage__addr-action-btn mypage__addr-action-btn--danger"
                            disabled={deletingAddressIds.has(address.addressId)}
                            onClick={() => handleDeleteAddress(address.addressId)}
                          >
                            {deletingAddressIds.has(address.addressId) ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {!isLoadingAddresses && !addressLoadError && (
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
              )}

              {addrFormOpen && (
                <div className="mypage__addr-form">
                  <h3 className="mypage__addr-form-title">새 배송지 추가</h3>

                  <div className="mypage__addr-form-grid">
                    <div className="mypage__addr-field">
                      <label>배송지 별칭</label>
                      <input
                        type="text"
                        placeholder="예: 집, 회사"
                        value={addrDraft.alias}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, alias: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field">
                      <label>수령인 이름</label>
                      <input
                        type="text"
                        value={addrDraft.receiverName}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, receiverName: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field">
                      <label>연락처</label>
                      <input
                        type="text"
                        placeholder="010-0000-0000"
                        value={addrDraft.receiverPhone}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, receiverPhone: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-field mypage__addr-field--full">
                      <label>주소</label>
                      <input
                        type="text"
                        placeholder="우편번호, 기본주소, 상세주소를 모두 입력해주세요"
                        value={addrDraft.address}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, address: event.target.value }))
                        }
                      />
                    </div>
                    <div className="mypage__addr-default-field mypage__addr-field--full">
                      <input
                        type="checkbox"
                        id="addr-is-default"
                        checked={addrDraft.isDefault}
                        onChange={(event) =>
                          setAddrDraft((prev) => ({ ...prev, isDefault: event.target.checked }))
                        }
                      />
                      <label htmlFor="addr-is-default">이 배송지를 기본 배송지로 설정</label>
                    </div>
                  </div>

                  {addrError && <p className="mypage__addr-error fs-body2">{addrError}</p>}

                  <div className="mypage__addr-form-actions">
                    <button
                      type="button"
                      className="mypage__modal-btn mypage__modal-btn--cancel"
                      onClick={closeAddressForm}
                      disabled={isSavingAddress}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="mypage__modal-btn mypage__modal-btn--confirm"
                      onClick={handleAddressSave}
                      disabled={isSavingAddress}
                    >
                      {isSavingAddress ? '저장 중...' : '저장'}
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
                  </div>

                  {profileError && <p className="mypage__account-error fs-body2">{profileError}</p>}

                  <button
                    type="button"
                    className="mypage__account-save-btn"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? '저장 중...' : '회원정보 저장'}
                  </button>

                  <div className="mypage__account-form">
                    <div className="mypage__account-field">
                      <label>현재 비밀번호</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </div>
                    <div className="mypage__account-field">
                      <label>새 비밀번호</label>
                      <input
                        type="password"
                        placeholder="8자 이상 입력"
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

                  {passwordError && <p className="mypage__account-error fs-body2">{passwordError}</p>}

                  <button
                    type="button"
                    className="mypage__account-save-btn"
                    onClick={handlePasswordChange}
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </>
              ) : (
                <div className="mypage__empty fs-body2">로그인 정보가 없습니다</div>
              )}

              <div className="mypage__withdraw-block">
                <button type="button" className="mypage__withdraw-btn" onClick={openWithdrawModal}>
                  회원 탈퇴
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {withdrawModalOpen && (
        <div className="mypage__modal-overlay" onClick={closeWithdrawModal}>
          <div className="mypage__modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="mypage__modal-title">회원 탈퇴</h3>

            {hasPendingOrders ? (
              <p className="mypage__modal-text">
                미완료된 주문/정산 건이 {pendingOrders.length}건 있어 탈퇴할 수 없습니다. 모든 주문이
                구매확정된 이후 다시 시도해주세요.
              </p>
            ) : (
              <>
                <p className="mypage__modal-text">정말 탈퇴하시겠습니까? 탈퇴 후에는 되돌릴 수 없습니다.</p>

                <div className="mypage__account-field">
                  <label>비밀번호</label>
                  <input
                    type="password"
                    value={withdrawPassword}
                    onChange={(event) => setWithdrawPassword(event.target.value)}
                  />
                </div>
                <div className="mypage__account-field">
                  <label>탈퇴 사유 (선택)</label>
                  <input
                    type="text"
                    value={withdrawReason}
                    onChange={(event) => setWithdrawReason(event.target.value)}
                  />
                </div>

                {withdrawError && <p className="mypage__account-error fs-body2">{withdrawError}</p>}
              </>
            )}

            <p className="mypage__modal-notice fs-caption">
              탈퇴 완료 시 개인정보는 즉시 파기되지만 전자상거래법에 따라 거래 내역은 5년간 분리
              보관됩니다.
            </p>

            <div className="mypage__modal-actions">
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--cancel"
                onClick={closeWithdrawModal}
                disabled={isWithdrawing}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--confirm"
                onClick={handleWithdraw}
                disabled={hasPendingOrders || isWithdrawing}
              >
                {isWithdrawing ? '탈퇴 처리 중...' : '탈퇴하기'}
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
