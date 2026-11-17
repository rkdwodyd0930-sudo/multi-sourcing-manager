import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://joxeuldxdptbddbzthmu.supabase.co'
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 
                     import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     'sb_publishable_bqJ1R0-9cM_lmQ-l3ya4rw_gIdoFQME'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'sourcing' },
})

export interface MsUser {
  id: string
  username: string
  name?: string
  cohort?: string
  phone?: string
  email?: string
  password?: string
  is_approved: boolean
  created_at: string
}

// 비밀번호 간단 해시 (SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 어드민 DB 계정 로그인 검증 (관리자 전용 계정만 접근 허용)
export async function loginAdminUser(username: string, password: string): Promise<{ success: boolean; user?: MsUser; message: string }> {
  try {
    const cleanUsername = username.trim().toLowerCase()
    const hashedPassword = await hashPassword(password.trim())

    // 1. username 또는 email 단일 정확 검색
    let { data: user, error } = await supabase
      .from('ms_users')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle()

    console.log('[Login Debug]', { cleanUsername, user, error, SUPABASE_URL, keyPresent: !!SUPABASE_KEY })

    if (!user) {
      const { data: userByEmail, error: emailErr } = await supabase
        .from('ms_users')
        .select('*')
        .eq('email', cleanUsername)
        .maybeSingle()
      console.log('[Login Debug Email]', { userByEmail, emailErr })
      user = userByEmail
    }

    if (!user) {
      return { success: false, message: `존재하지 않는 어드민 아이디입니다. (${error?.message || '조회 0건'})` }
    }

    if (user.password !== hashedPassword) {
      return { success: false, message: '비밀번호가 일치하지 않습니다.' }
    }

    if (!user.is_approved) {
      return { success: false, message: '승인되지 않은 계정입니다.' }
    }

    // ⭐ 엄격한 어드민 권한 검증: 아이디가 정확히 'admin' 인 계정만 허용
    const isAdminAccount = user.username.toLowerCase() === 'admin';

    if (!isAdminAccount) {
      return { success: false, message: '⛔ 관리자 권한이 없는 일반 계정입니다. 어드민 전용 계정으로 로그인해 주세요.' }
    }

    return { success: true, user, message: '어드민 인증 성공!' }
  } catch (e: any) {
    return { success: false, message: e.message || '로그인 중 오류가 발생했습니다.' }
  }
}

// 전체 유저 리스트 불러오기
export async function fetchMsUsers(): Promise<{ success: boolean; users: MsUser[]; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('ms_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Supabase Fetch Error]', error)
      return { success: false, users: [], message: error.message }
    }

    return { success: true, users: data || [] }
  } catch (e: any) {
    return { success: false, users: [], message: e.message || '오류가 발생했습니다.' }
  }
}

// 유저 승인 처리 (RPC 사용)
export async function approveMsUser(id: string, adminPass?: string): Promise<{ success: boolean; message: string }> {
  try {
    const pass = adminPass || sessionStorage.getItem('admin_pass') || ''
    const { data: isSuccess, error } = await supabase.rpc('approve_user_secure', {
      target_id: id,
      admin_password_input: pass
    })

    if (error) {
      return { success: false, message: `승인 실패: ${error.message}` }
    }
    if (!isSuccess) {
      return { success: false, message: '어드민 권한 검증 실패 (비밀번호 불일치)' }
    }
    return { success: true, message: '유저가 성공적으로 승인되었습니다!' }
  } catch (e: any) {
    return { success: false, message: e.message || '오류 발생' }
  }
}

// 유저 승인 취소/정지 (RPC 사용)
export async function revokeMsUser(id: string, adminPass?: string): Promise<{ success: boolean; message: string }> {
  try {
    const pass = adminPass || sessionStorage.getItem('admin_pass') || ''
    const { data: isSuccess, error } = await supabase.rpc('revoke_user_secure', {
      target_id: id,
      admin_password_input: pass
    })

    if (error) {
      return { success: false, message: `승인 취소 실패: ${error.message}` }
    }
    if (!isSuccess) {
      return { success: false, message: '어드민 권한 검증 실패 (비밀번호 불일치)' }
    }
    return { success: true, message: '유저 승인이 취소되었습니다.' }
  } catch (e: any) {
    return { success: false, message: e.message || '오류 발생' }
  }
}

// 유저 삭제 (RPC 사용)
export async function deleteMsUser(id: string, adminPass?: string): Promise<{ success: boolean; message: string }> {
  try {
    const pass = adminPass || sessionStorage.getItem('admin_pass') || ''
    const { data: isSuccess, error } = await supabase.rpc('delete_user_secure', {
      target_id: id,
      admin_password_input: pass
    })

    if (error) {
      return { success: false, message: `삭제 실패: ${error.message}` }
    }
    if (!isSuccess) {
      return { success: false, message: '어드민 권한 검증 실패 (비밀번호 불일치)' }
    }
    return { success: true, message: '유저 계정이 삭제되었습니다.' }
  } catch (e: any) {
    return { success: false, message: e.message || '오류 발생' }
  }
}

// 비밀번호 재설정 (RPC 사용)
export async function updateMsUserPassword(id: string, newPassword: string, adminPass?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!newPassword.trim()) {
      return { success: false, message: '새 비밀번호를 입력해주세요.' }
    }
    const pass = adminPass || sessionStorage.getItem('admin_pass') || ''
    const { data: isSuccess, error } = await supabase.rpc('update_password_secure', {
      target_id: id,
      new_pass: newPassword.trim(),
      admin_password_input: pass
    })

    if (error) {
      return { success: false, message: `비밀번호 변경 실패: ${error.message}` }
    }
    if (!isSuccess) {
      return { success: false, message: '어드민 권한 검증 실패 (비밀번호 불일치)' }
    }
    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }
  } catch (e: any) {
    return { success: false, message: e.message || '오류 발생' }
  }
}

// 신규 유저 수동 생성
export async function createMsUser(
  username: string, 
  name: string, 
  password: string, 
  is_approved: boolean,
  cohort?: string,
  phone?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUsername = username.trim().toLowerCase()
    const cleanName = name.trim()

    if (!cleanUsername || !password || !cleanName) {
      return { success: false, message: '아이디, 이름, 비밀번호를 모두 입력해주세요.' }
    }

    const hashedPassword = await hashPassword(password.trim())

    const { error } = await supabase
      .from('ms_users')
      .insert([{
        username: cleanUsername,
        email: cleanUsername,
        name: cleanName,
        cohort: (cohort || '').trim(),
        phone: (phone || '').trim(),
        password: hashedPassword,
        is_approved
      }])

    if (error) {
      return { success: false, message: `유저 등록 실패: ${error.message}` }
    }
    return { success: true, message: '신규 유저가 생성되었습니다!' }
  } catch (e: any) {
    return { success: false, message: e.message || '오류 발생' }
  }
}
