import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Search,
  RefreshCw,
  Trash2,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  LogOut,
  UserPlus,
  X,
  Check,
  ShieldAlert,
  Calendar,
  Sparkles
} from 'lucide-react'
import {
  fetchMsUsers,
  approveMsUser,
  revokeMsUser,
  deleteMsUser,
  updateMsUserPassword,
  createMsUser,
  loginAdminUser,
  type MsUser
} from './services/supabaseClient'

export function App() {
  // 인증 상태 (어드민 암호)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_auth') === 'true'
  })
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  // 유저 데이터 & 상태
  const [users, setUsers] = useState<MsUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')

  // 알림 토스트
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // 모달 상태들
  const [resetModalUser, setResetModalUser] = useState<MsUser | null>(null)
  const [newPasswordInput, setNewPasswordInput] = useState('')

  const [deleteModalUser, setDeleteModalUser] = useState<MsUser | null>(null)

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsApproved, setNewIsApproved] = useState(true)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // 유저 목록 불러오기
  const loadUsers = async () => {
    setLoading(true)
    const res = await fetchMsUsers()
    setLoading(false)
    if (res.success) {
      setUsers(res.users)
    } else {
      showToast(res.message || '유저 목록을 불러오지 못했습니다.', 'error')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers()
    }
  }, [isAuthenticated])

  // 어드민 DB 계정 로그인 검증 (하드코딩 0%, Supabase DB 검증)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setLoginLoading(true)

    const res = await loginAdminUser(adminUsername, adminPassword)
    setLoginLoading(false)

    if (res.success) {
      sessionStorage.setItem('admin_auth', 'true')
      sessionStorage.setItem('admin_pass', adminPassword.trim())
      setIsAuthenticated(true)
      showToast('어드민 통합 관리자로 인증되었습니다!')
    } else {
      setPinError(res.message)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth')
    sessionStorage.removeItem('admin_pass')
    setIsAuthenticated(false)
    setAdminUsername('')
    setAdminPassword('')
  }

  // 승인 처리
  const handleApprove = async (user: MsUser) => {
    const res = await approveMsUser(user.id)
    if (res.success) {
      showToast(`'${user.name || user.username}' 유저 승인이 완료되었습니다!`)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: true } : u))
    } else {
      showToast(res.message, 'error')
    }
  }

  // 승인 취소 / 정지
  const handleRevoke = async (user: MsUser) => {
    const res = await revokeMsUser(user.id)
    if (res.success) {
      showToast(`'${user.name || user.username}' 유저 승인이 취소(정지)되었습니다.`)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: false } : u))
    } else {
      showToast(res.message, 'error')
    }
  }

  // 비밀번호 변경 실행
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser) return
    const res = await updateMsUserPassword(resetModalUser.id, newPasswordInput)
    if (res.success) {
      showToast(`'${resetModalUser.username}' 비밀번호가 성공적으로 변경되었습니다.`)
      setResetModalUser(null)
      setNewPasswordInput('')
    } else {
      showToast(res.message, 'error')
    }
  }

  // 유저 계정 삭제 실행
  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return
    const res = await deleteMsUser(deleteModalUser.id)
    if (res.success) {
      showToast(`'${deleteModalUser.username}' 유저 계정이 삭제되었습니다.`)
      setUsers(prev => prev.filter(u => u.id !== deleteModalUser.id))
      setDeleteModalUser(null)
    } else {
      showToast(res.message, 'error')
    }
  }

  // 신규 유저 생성 실행
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createMsUser(newUsername, newName, newPassword, newIsApproved)
    if (res.success) {
      showToast(res.message)
      setIsAddUserModalOpen(false)
      setNewUsername('')
      setNewName('')
      setNewPassword('')
      loadUsers()
    } else {
      showToast(res.message, 'error')
    }
  }

  // 통계 지표 계산
  const stats = useMemo(() => {
    const total = users.length
    const pending = users.filter(u => !u.is_approved).length
    const approved = users.filter(u => u.is_approved).length
    
    // 오늘 가입자
    const todayStr = new Date().toISOString().split('T')[0]
    const today = users.filter(u => u.created_at && u.created_at.startsWith(todayStr)).length

    return { total, pending, approved, today }
  }, [users])

  // 필터링 & 검색 적용된 리스트
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // 탭 필터
      if (filterTab === 'PENDING' && u.is_approved) return false
      if (filterTab === 'APPROVED' && !u.is_approved) return false

      // 검색어 필터 (이름, 아이디/이메일 검색)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchUsername = u.username.toLowerCase().includes(q)
        const matchName = u.name ? u.name.toLowerCase().includes(q) : false
        const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false
        return matchUsername || matchName || matchEmail
      }

      return true
    })
  }, [users, filterTab, searchQuery])

  // 비밀번호가 설정되지 않은 비인증 상태일 때 어드민 게이트 렌더링
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="bg-[#121827] border border-purple-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
          
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <ShieldAlert size={36} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
                N:N 멀티소싱 관리자 게이트
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                유저 승인 및 계정 관리를 위한 어드민 전용 콘솔입니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users size={14} className="text-purple-400" /> 어드민 계정 (Username)
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => {
                  setAdminUsername(e.target.value)
                  setPinError(null)
                }}
                placeholder="어드민 아이디 또는 이메일 입력"
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-purple-400" /> 어드민 비밀번호
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value)
                  setPinError(null)
                }}
                placeholder="비밀번호 입력"
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition placeholder:text-slate-600"
              />
            </div>

            {pinError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl transition active:scale-98 cursor-pointer shadow-lg shadow-purple-600/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loginLoading ? (
                <span className="animate-spin text-xs">⏳ 인증 확인 중...</span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>어드민 콘솔 로그인</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Top Admin Header Bar */}
      <header className="bg-[#121827]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-extrabold shadow-sm">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">N:N Multi-Sourcing Admin Console</h1>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-500/30 uppercase">
                  통합 유저 관리
                </span>
              </div>
              <p className="text-xs text-slate-400">신규 가입 유저 승인, 정지 및 계정 정보 통합 컨트롤 타워</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-purple-400' : ''} />
              <span>새로고침</span>
            </button>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition active:scale-95 flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <UserPlus size={15} />
              <span>+ 유저 수동 등록</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition active:scale-95 cursor-pointer ml-2"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div className="bg-[#121827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">전체 가입 유저</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.total}<span className="text-sm font-normal text-slate-400 ml-1">명</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users size={24} />
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className={`bg-[#121827] border rounded-2xl p-5 shadow-lg flex items-center justify-between transition-all ${
            stats.pending > 0 ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-slate-800'
          }`}>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">승인 대기 유저</p>
                {stats.pending > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <h3 className="text-2xl font-black text-amber-300 mt-1">{stats.pending}<span className="text-sm font-normal text-slate-400 ml-1">명</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={24} />
            </div>
          </div>

          {/* Card 3: Approved */}
          <div className="bg-[#121827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">승인 완료 유저</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.approved}<span className="text-sm font-normal text-slate-400 ml-1">명</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck size={24} />
            </div>
          </div>

          {/* Card 4: Today */}
          <div className="bg-[#121827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">오늘 신규 가입</p>
              <h3 className="text-2xl font-black text-purple-300 mt-1">+{stats.today}<span className="text-sm font-normal text-slate-400 ml-1">명</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Calendar size={24} />
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar Controls */}
        <div className="bg-[#121827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#0b0f19] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>전체 유저</span>
              <span className="bg-purple-950/80 px-1.5 py-0.5 rounded-md text-[10px] font-mono">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilterTab('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                filterTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-[#0b0f19] text-amber-300 border border-amber-500/30 hover:bg-amber-500/10'
              }`}
            >
              <span>⏳ 승인 대기중</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                filterTab === 'PENDING' ? 'bg-amber-950 text-amber-300 font-extrabold' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {stats.pending}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('APPROVED')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                filterTab === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-[#0b0f19] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>✅ 승인 완료</span>
              <span className="bg-emerald-950/80 px-1.5 py-0.5 rounded-md text-[10px] font-mono">{stats.approved}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 아이디/이메일 검색..."
              className="w-full bg-[#0b0f19] border border-slate-800 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none transition placeholder:text-slate-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-[#121827] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b0f19]/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">이름 (실명)</th>
                  <th className="py-3.5 px-4">아이디 (Username)</th>
                  <th className="py-3.5 px-4">가입 일시</th>
                  <th className="py-3.5 px-4 text-center w-36">승인 상태</th>
                  <th className="py-3.5 px-4 text-center w-64">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-purple-400" />
                        <span className="font-semibold mt-1">유저 데이터 로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={28} className="text-slate-600" />
                        <span className="font-semibold text-slate-400 text-sm">해당되는 유저가 없습니다.</span>
                        <span className="text-[11px] text-slate-600">검색어를 변경하거나 필터 탭을 전환해 보세요.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const isPending = !user.is_approved
                    const formattedDate = user.created_at
                      ? new Date(user.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-purple-500/5 transition ${
                          isPending ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        {/* Index */}
                        <td className="py-4 px-4 text-center font-mono text-slate-500 font-bold">
                          {idx + 1}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {(user.name || user.username || '?').slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-100 text-sm">
                              {user.name || <span className="text-slate-500 italic font-normal">(미입력)</span>}
                            </span>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-4 px-4 font-mono font-semibold text-slate-300">
                          {user.username}
                        </td>

                        {/* Registered At */}
                        <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                          {formattedDate}
                        </td>

                        {/* Approval Status */}
                        <td className="py-4 px-4 text-center">
                          {user.is_approved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-extrabold text-[11px] shadow-sm">
                              <CheckCircle2 size={13} className="text-emerald-400" />
                              <span>승인 완료</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[11px] shadow-md animate-pulse">
                              <Clock size={13} className="text-amber-400" />
                              <span>승인 대기중</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Approve / Revoke Toggle */}
                            {!user.is_approved ? (
                              <button
                                onClick={() => handleApprove(user)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer"
                              >
                                <Check size={14} />
                                <span>승인하기</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRevoke(user)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 font-bold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                                title="승인 취소 (이용 정지)"
                              >
                                <UserX size={13} />
                                <span>정지</span>
                              </button>
                            )}

                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setResetModalUser(user)
                                setNewPasswordInput('')
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-500/40 font-bold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                              title="비밀번호 변경"
                            >
                              <Key size={13} />
                              <span>비번</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteModalUser(user)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition active:scale-95 cursor-pointer"
                              title="계정 완전 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL 1: 비밀번호 재설정 모달 */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121827] border border-blue-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                <Key size={18} className="text-blue-400" />
                비밀번호 강제 변경
              </h3>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              <strong className="text-white font-bold">{resetModalUser.name || resetModalUser.username}</strong> ({resetModalUser.username}) 계정의 새 비밀번호를 입력해 주세요.
            </p>

            <form onSubmit={handleConfirmResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">새 비밀번호</label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  className="w-full bg-[#0b0f19] border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
                >
                  비밀번호 변경
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 계정 삭제 확인 모달 */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121827] border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-md font-extrabold text-white">유저 계정 삭제</h3>
                <p className="text-xs text-slate-400">정말로 계정을 삭제하시겠습니까?</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-4 leading-relaxed">
              <strong className="text-rose-300 font-bold">{deleteModalUser.name || deleteModalUser.username}</strong> ({deleteModalUser.username}) 유저 데이터가 완전히 삭제되며 복구할 수 없습니다.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: 신규 유저 수동 등록 모달 */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121827] border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-purple-400" />
                신규 유저 수동 생성
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">이름 (실명)</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-[#0b0f19] border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">아이디 (Username)</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="예: user123 또는 이메일"
                  className="w-full bg-[#0b0f19] border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="초기 비밀번호 입력"
                  className="w-full bg-[#0b0f19] border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="approve-checkbox"
                  checked={newIsApproved}
                  onChange={(e) => setNewIsApproved(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 border-slate-700 focus:ring-purple-500 bg-[#0b0f19]"
                />
                <label htmlFor="approve-checkbox" className="text-xs font-bold text-slate-200 cursor-pointer">
                  생성과 동시에 즉시 승인 처리 (`is_approved = true`)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
                >
                  유저 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST POPUP */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-extrabold flex items-center gap-2.5 animate-bounce ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
            : 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/50'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App
