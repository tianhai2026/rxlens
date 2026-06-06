'use client'

import CryptoJS from 'crypto-js'

// 加密日志记录器
const encryptionLogger = {
  log: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  warn: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  error: (stage: string, error: string, context?: any) => {
    const timestamp = new Date().toISOString()
    
  }
}

// 硬编码的用户密钥（32字节 = 256位）
// 后续可改为从用户密码派生
const USER_KEY = 'RxLens-Secret-Key-256-Bit-Encrypt'

// WordArray 类型定义
interface WordArray {
  words: number[]
  sigBytes: number
}

// 确保密钥是256位（32字节）
const getKey = (): WordArray => {
  const key = USER_KEY.padEnd(32, '0').slice(0, 32)
  return CryptoJS.enc.Utf8.parse(key) as unknown as WordArray
}

// 生成随机IV（初始化向量）16字节（CBC模式需要16字节IV）
const generateIV = (): WordArray => {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // 降级方案：使用Math.random
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  // 转换为WordArray
  const words: number[] = []
  for (let i = 0; i < array.length; i += 4) {
    words.push(
      (array[i] << 24) |
      ((array[i + 1] || 0) << 16) |
      ((array[i + 2] || 0) << 8) |
      (array[i + 3] || 0)
    )
  }
  
  return {
    words,
    sigBytes: array.length
  }
}

// 加密数据（使用AES-256-CBC）
export const encryptData = <T>(data: T): string => {
  const startTime = Date.now()
  
  try {
    encryptionLogger.log('encrypt_start', '开始加密数据', {
      dataType: typeof data,
      dataSize: JSON.stringify(data).length,
      algorithm: 'AES-256-CBC'
    })
    
    const iv = generateIV()
    const key = getKey()
    
    const plaintext = JSON.stringify(data)
    
    // 使用AES-256-CBC加密
    const encrypted = CryptoJS.AES.encrypt(plaintext, key as unknown as CryptoJS.lib.WordArray, {
      iv: iv as unknown as CryptoJS.lib.WordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    // 将IV和密文组合在一起
    const ivBase64 = CryptoJS.enc.Base64.stringify(iv as unknown as CryptoJS.lib.WordArray)
    const result = `${ivBase64}:${encrypted.toString()}`
    
    encryptionLogger.log('encrypt_success', '加密完成', {
      duration: `${Date.now() - startTime}ms`,
      originalSize: plaintext.length,
      encryptedSize: result.length,
      ivGenerated: true
    })
    
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    encryptionLogger.error('encrypt_failed', errorMessage, {
      error,
      duration: `${Date.now() - startTime}ms`
    })
    throw error
  }
}

// 解密数据
export const decryptData = <T>(cipherText: string): T => {
  const startTime = Date.now()
  
  try {
    encryptionLogger.log('decrypt_start', '开始解密数据', {
      cipherTextSize: cipherText.length,
      algorithm: 'AES-256-CBC'
    })
    
    // 分离IV和密文
    const [ivBase64, encryptedData] = cipherText.split(':')
    
    if (!ivBase64 || !encryptedData) {
      throw new Error('无效的密文格式')
    }
    
    const iv = CryptoJS.enc.Base64.parse(ivBase64)
    const key = getKey()
    
    // 使用AES-256-CBC解密
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key as unknown as CryptoJS.lib.WordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!plaintext) {
      throw new Error('解密失败，密文可能已损坏')
    }
    
    const result: T = JSON.parse(plaintext)
    
    encryptionLogger.log('decrypt_success', '解密完成', {
      duration: `${Date.now() - startTime}ms`,
      encryptedSize: cipherText.length,
      decryptedSize: plaintext.length
    })
    
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    encryptionLogger.error('decrypt_failed', errorMessage, {
      error,
      duration: `${Date.now() - startTime}ms`
    })
    throw error
  }
}

// 数据完整性校验
export const verifyDataIntegrity = <T>(original: T, decrypted: T): boolean => {
  const originalStr = JSON.stringify(original)
  const decryptedStr = JSON.stringify(decrypted)
  
  const isEqual = originalStr === decryptedStr
  
  if (!isEqual) {
    encryptionLogger.warn('integrity_check_failed', '数据完整性校验失败', {
      originalSize: originalStr.length,
      decryptedSize: decryptedStr.length
    })
  }
  
  return isEqual
}

// 加密模块状态检查
export const checkEncryptionStatus = (): { 
  keyAvailable: boolean 
  keyLength: number
  cryptoAvailable: boolean
  algorithm: string
} => {
  const key = USER_KEY
  const keyLength = key.length
  
  return {
    keyAvailable: !!key,
    keyLength,
    cryptoAvailable: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
    algorithm: 'AES-256-CBC'
  }
}
