'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Unlock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { initializePassword, verifyPassword, isUnlocked } from '@/lib/appLock'

type AuthStatus = 'idle' | 'verifying' | 'error'

interface AuthState {
  status: AuthStatus
  error: string
}

function createAuthIdle(): AuthState {
  return { status: 'idle', error: '' }
}

function createAuthVerifying(): AuthState {
  return { status: 'verifying', error: '' }
}

function createAuthError(message: string): AuthState {
  return { status: 'error', error: message }
}

interface AppLockProps {
  onUnlock: () => void
}

export default function AppLock({ onUnlock }: AppLockProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [authState, setAuthState] = useState<AuthState>(createAuthIdle())
  const [isBlurred, setIsBlurred] = useState(false)

  const isVerifying = authState.status === 'verifying'
  const error = authState.error

  // 检查是否已解锁或首次使用
  useEffect(() => {
    const checkLockStatus = async () => {
      if (isUnlocked()) {
        const result = await verifyPassword('')
        setIsFirstTime(result.isFirstTime)
      } else {
        setIsFirstTime(true)
      }
    }
    
    // 验证当前密码状态
    verifyPassword('').then(result => {
      setIsFirstTime(result.isFirstTime)
    })
  }, [])

  // 防窥逻辑：切换标签页时模糊化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true)
        
      } else {
        // 只有在已解锁状态下才取消模糊
        if (isUnlocked()) {
          setIsBlurred(false)
          
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 处理密码提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (isFirstTime) {
      // 首次设置密码
      if (!password) {
        setAuthState(createAuthError('请设置密码'))
        return
      }

      if (password !== confirmPassword) {
        setAuthState(createAuthError('两次输入的密码不一致'))
        return
      }

      if (password.length < 6) {
        setAuthState(createAuthError('密码长度至少6位'))
        return
      }

      setAuthState(createAuthVerifying())
      try {
        const result = await initializePassword(password)
        if (result.success) {
          onUnlock()
        } else {
          setAuthState(createAuthError('设置密码失败，请重试'))
        }
      } catch (error) {
        setAuthState(createAuthError('发生错误，请重试'))
      }
    } else {
      // 验证已有密码
      if (!password) {
        setAuthState(createAuthError('请输入密码'))
        return
      }

      setAuthState(createAuthVerifying())
      try {
        const result = await verifyPassword(password)
        if (result.success) {
          onUnlock()
        } else {
          setAuthState(createAuthError('密码错误，请重试'))
        }
      } catch (error) {
        setAuthState(createAuthError('发生错误，请重试'))
      }
    }
  }, [password, confirmPassword, isFirstTime, onUnlock])

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* 防窥模糊层 */}
      {isBlurred && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#121212',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Lock style={{ color: '#6b7280', width: '64px', height: '64px', marginBottom: '16px' }} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>应用已锁定</p>
          </div>
        </div>
      )}

      <div 
        style={{
          maxWidth: '400px',
          width: '100%',
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid #333',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* 头部图标 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isFirstTime ? (
              <Shield style={{ color: '#00F0FF', width: '40px', height: '40px' }} />
            ) : (
              <Lock style={{ color: '#00F0FF', width: '40px', height: '40px' }} />
            )}
          </div>
          
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {isFirstTime ? '设置应用锁' : '解锁应用'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {isFirstTime 
              ? '设置一个密码保护您的隐私数据' 
              : '请输入密码解锁应用'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div 
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {/* 密码表单 */}
        <form onSubmit={handleSubmit}>
          {/* 密码输入 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#9ca3af', 
              fontSize: '14px', 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              {isFirstTime ? '设置密码' : '密码'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #374151',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00F0FF'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#374151'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isVerifying}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ color: '#6b7280', width: '20px', height: '20px' }} />
                ) : (
                  <Eye style={{ color: '#6b7280', width: '20px', height: '20px' }} />
                )}
              </button>
            </div>
          </div>

          {/* 确认密码（首次设置时显示） */}
          {isFirstTime && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                color: '#9ca3af', 
                fontSize: '14px', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                确认密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #374151',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00F0FF'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#374151'
                }}
              />
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isVerifying}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#00F0FF',
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              opacity: isVerifying ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isVerifying) {
                e.currentTarget.style.backgroundColor = '#00f0ffcc'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00F0FF'
            }}
          >
            {isVerifying ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div 
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid #000',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                {isFirstTime ? '设置中...' : '验证中...'}
              </span>
            ) : isFirstTime ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Shield style={{ width: '18px', height: '18px' }} />
                设置密码
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Unlock style={{ width: '18px', height: '18px' }} />
                解锁
              </span>
            )}
          </button>
        </form>

        {/* 安全提示 */}
        <div 
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px'
          }}
        >
          <p style={{ color: '#93c5fd', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
            🔒 您的密码使用 PBKDF2 算法加密存储，采用 100,000 次迭代，确保您的数据安全。
            切换标签页时，应用会自动模糊保护您的隐私。
          </p>
        </div>
      </div>

      {/* 添加加载动画样式 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}