'use client'

import { useState, useEffect, useCallback } from 'react'
import { verifyPassword, isUnlocked, clearPassword } from '@/lib/appLock'

const SESSION_KEY = 'rxlens-session-unlocked'

export const useAppLock = () => {
  const [isLocked, setIsLocked] = useState(true)
  const [isChecking, setIsChecking] = useState(true)
  const [isBlurred, setIsBlurred] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  // 检查解锁状态
  const checkLockStatus = useCallback(async () => {
    setIsChecking(true)
    try {
      // 检查是否已设置密码
      const passwordSet = isUnlocked()
      setHasPassword(passwordSet)

      if (!passwordSet) {
        // 首次使用，没有设置过密码
        setIsLocked(true)
        setIsChecking(false)
        return
      }

      // 已设置密码，检查是否有会话解锁状态
      const sessionUnlocked = sessionStorage.getItem(SESSION_KEY) === 'true'
      
      if (sessionUnlocked) {
        // 会话期间已解锁
        setIsLocked(false)
      } else {
        // 需要重新解锁
        setIsLocked(true)
      }
      
      setIsChecking(false)
    } catch (error) {
      
      setIsLocked(true)
      setIsChecking(false)
    }
  }, [])

  // 初始化检查
  useEffect(() => {
    checkLockStatus()
  }, [checkLockStatus])

  // 防窥逻辑：切换标签页时模糊化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true)
        
      } else {
        // 如果已解锁，取消模糊
        if (!isLocked) {
          setIsBlurred(false)
          
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLocked])

  // 解锁
  const unlock = useCallback(() => {
    setIsLocked(false)
    setIsBlurred(false)
    // 设置会话解锁状态（页面刷新后需要重新解锁）
    sessionStorage.setItem(SESSION_KEY, 'true')
    
  }, [])

  // 锁定
  const lock = useCallback(() => {
    setIsLocked(true)
    setIsBlurred(true)
    sessionStorage.removeItem(SESSION_KEY)
    
  }, [])

  // 重置密码
  const resetPassword = useCallback(() => {
    clearPassword()
    sessionStorage.removeItem(SESSION_KEY)
    setIsLocked(true)
    setHasPassword(false)
    checkLockStatus()
    
  }, [checkLockStatus])

  return {
    isLocked,
    isChecking,
    isBlurred,
    hasPassword,
    unlock,
    lock,
    resetPassword
  }
}