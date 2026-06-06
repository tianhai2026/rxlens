'use client'

import { useState, useEffect } from 'react'
import LockScreen from '@/components/LockScreen'
import SyncPendingBanner from '@/components/SyncPendingBanner'
import { needsUnlock } from '@/lib/auth'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isLocked, setIsLocked] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  // 检查是否需要显示应用锁
  useEffect(() => {
    const checkLockStatus = async () => {
      setIsChecking(true)
      try {
        // 检查是否需要解锁
        const needs = needsUnlock()
        setIsLocked(needs)
      } catch (error) {
        
        setIsLocked(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkLockStatus()

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时锁定
        setIsLocked(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 解锁成功后的处理
  const handleUnlock = () => {
    setIsLocked(false)
  }

  // 如果正在检查状态，显示加载
  if (isChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #00F0FF',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // 如果需要显示锁界面
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  // 正常显示应用内容
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <SyncPendingBanner />
      {children}
    </div>
  )
}
