// 应用锁密码验证模块
// 使用 Web Crypto API 的 PBKDF2 算法进行密码哈希比对

const STORAGE_KEY = 'rxlens-unlock-token'
const SALT_KEY = 'rxlens-salt'
const SESSION_KEY = 'rxlens-session'
const ITERATIONS = 100000
const KEY_LENGTH = 256

// 生成随机盐
const generateSalt = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// 使用 PBKDF2 算法生成密码哈希
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const saltBuffer = encoder.encode(salt)
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    KEY_LENGTH
  )
  
  return Array.from(new Uint8Array(derivedBits))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

// 初始化密码（设置新密码）
export const initializePassword = async (password: string): Promise<{ success: boolean }> => {
  try {
    const salt = generateSalt()
    const hash = await hashPassword(password, salt)
    
    localStorage.setItem(SALT_KEY, salt)
    localStorage.setItem(STORAGE_KEY, hash)
    
    
    return { success: true }
  } catch (error) {
    
    return { success: false }
  }
}

// 验证密码
export const verifyPassword = async (password: string): Promise<{ success: boolean; isFirstTime: boolean }> => {
  try {
    const salt = localStorage.getItem(SALT_KEY)
    const storedHash = localStorage.getItem(STORAGE_KEY)
    
    if (!salt || !storedHash) {
      return { success: false, isFirstTime: true }
    }
    
    const inputHash = await hashPassword(password, salt)
    const success = inputHash === storedHash
    
    if (success) {
      
      setSessionUnlocked()
    } else {
      
    }
    
    return { success, isFirstTime: false }
  } catch (error) {
    
    return { success: false, isFirstTime: false }
  }
}

// 设置会话解锁状态
export const setSessionUnlocked = (): void => {
  sessionStorage.setItem(SESSION_KEY, 'true')
}

// 清除会话解锁状态
export const clearSessionUnlocked = (): void => {
  sessionStorage.removeItem(SESSION_KEY)
}

// 检查是否已解锁（会话级）
export const isSessionUnlocked = (): boolean => {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

// 检查是否已设置密码
export const hasPassword = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY)
}

// 检查是否需要解锁（未设置密码或会话未解锁）
export const needsUnlock = (): boolean => {
  if (!hasPassword()) {
    return true
  }
  return !isSessionUnlocked()
}

// 清除密码（重置）
export const clearPassword = (): void => {
  localStorage.removeItem(SALT_KEY)
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  
}
