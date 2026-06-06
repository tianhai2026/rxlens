'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Unlock, Eye, EyeOff, Shield, AlertCircle, RefreshCw } from 'lucide-react'
import {
  initializePassword,
  verifyPassword,
  needsUnlock,
  hasPassword,
  clearSessionUnlocked,
  clearPassword
} from '@/lib/auth'
import {
  type AsyncState,
  createIdleState,
  createLoadingState,
  createReadyState,
  createErrorState
} from '@/lib/asyncState'

interface LockScreenProps {
  onUnlock: () => void
}

type AuthStatus = 'checking' | 'idle' | 'verifying' | 'error'

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

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking', error: '' })
  const [isBlurred, setIsBlurred] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotConfirm, setForgotConfirm] = useState(false)

  const isChecking = authState.status === 'checking'
  const isVerifying = authState.status === 'verifying'
  const error = authState.error

  // 检查解锁状态
  useEffect(() => {
    const checkStatus = async () => {
      setAuthState({ status: 'checking', error: '' })
      try {
        const hasPwd = hasPassword()
        const needs = needsUnlock()

        if (!needs && hasPwd) {
          onUnlock()
          return
        }

        setIsFirstTime(!hasPwd)
        setAuthState(createAuthIdle())
      } catch (err) {
        setIsFirstTime(!hasPassword())
        setAuthState(createAuthIdle())
      }
    }

    checkStatus()
  }, [onUnlock])

  // 防窥逻辑：切换标签页或最小化时模糊化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true)
        clearSessionUnlocked()
        
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
          setIsBlurred(false)
          onUnlock()
        } else {
          setAuthState(createAuthError('密码错误，请重试'))
        }
      } catch (error) {
        setAuthState(createAuthError('发生错误，请重试'))
      }
    }
  }, [password, confirmPassword, isFirstTime, onUnlock])

  // 重置模糊状态
  const handleResetBlur = useCallback(() => {
    setIsBlurred(false)
    setPassword('')
    setAuthState(createAuthIdle())
  }, [])

  // 处理忘记密码
  const handleForgotPassword = useCallback(() => {
    setShowForgotModal(true)
    setForgotConfirm(false)
  }, [])

  // 确认重置密码
  const handleConfirmReset = useCallback(async () => {
    try {
      clearPassword()
      setShowForgotModal(false)
      setForgotConfirm(false)
      setIsFirstTime(true)
      setPassword('')
      setConfirmPassword('')
      setAuthState(createAuthIdle())
    } catch (err) {
      setAuthState(createAuthError('重置失败，请重试'))
    }
  }, [])

  // 取消重置密码
  const handleCancelReset = useCallback(() => {
    setShowForgotModal(false)
    setForgotConfirm(false)
  }, [])

  // 加载状态显示
  if (isChecking) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RefreshCw 
          style={{ 
            color: '#00F0FF', 
            width: '48px', 
            height: '48px',
            animation: 'spin 1s linear infinite'
          }} 
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999
      }}
    >
      {/* 防窥模糊层 - 覆盖整个页面 */}
      {isBlurred && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0a0a0f',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            filter: 'blur(20px)'
          }}
        >
          <div style={{ textAlign: 'center', filter: 'none' }}>
            <Lock style={{ color: '#6b7280', width: '80px', height: '80px', marginBottom: '20px' }} />
            <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: '500' }}>应用已锁定</p>
            <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '8px' }}>切换回此标签页以解锁</p>
          </div>
        </div>
      )}

      {/* 解除模糊按钮 */}
      {isBlurred && (
        <button
          onClick={handleResetBlur}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid #00F0FF',
            borderRadius: '12px',
            color: '#00F0FF',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            zIndex: 100001,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s',
            filter: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.1)'
          }}
        >
          点击解锁
        </button>
      )}

      {/* 登录卡片 */}
      <div 
        style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: 'rgba(15, 15, 25, 0.98)',
          borderRadius: '24px',
          padding: '48px',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        {/* 头部图标 */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div 
            style={{
              width: '96px',
              height: '96px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
            }}
          >
            {isFirstTime ? (
              <Shield style={{ color: '#00F0FF', width: '48px', height: '48px' }} />
            ) : (
              <Lock style={{ color: '#00F0FF', width: '48px', height: '48px' }} />
            )}
          </div>
          
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 12px 0' }}>
            {isFirstTime ? '设置应用锁' : '解锁应用'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: 0, lineHeight: '1.5' }}>
            {isFirstTime 
              ? '设置一个密码保护您的医疗财务数据' 
              : '请输入密码以解锁应用'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div 
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertCircle style={{ color: '#ef4444', width: '18px', height: '18px', flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {/* 密码表单 */}
        <form onSubmit={handleSubmit}>
          {/* 密码输入 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#9ca3af', 
              fontSize: '14px', 
              marginBottom: '10px',
              fontWeight: '600'
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
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px 48px 16px 20px',
                  backgroundColor: 'rgba(30, 30, 45, 0.8)',
                  border: '1px solid rgba(55, 65, 81, 0.6)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.25s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00F0FF'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.15)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(55, 65, 81, 0.6)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isVerifying}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ color: '#6b7280', width: '22px', height: '22px' }} />
                ) : (
                  <Eye style={{ color: '#6b7280', width: '22px', height: '22px' }} />
                )}
              </button>
            </div>
          </div>

          {/* 确认密码（首次设置时显示） */}
          {isFirstTime && (
            <div style={{ marginBottom: '28px' }}>
              <label style={{ 
                display: 'block', 
                color: '#9ca3af', 
                fontSize: '14px', 
                marginBottom: '10px',
                fontWeight: '600'
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
                  padding: '16px 20px',
                  backgroundColor: 'rgba(30, 30, 45, 0.8)',
                  border: '1px solid rgba(55, 65, 81, 0.6)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.25s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00F0FF'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.15)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(55, 65, 81, 0.6)'
                  e.currentTarget.style.boxShadow = 'none'
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
              padding: '18px',
              backgroundColor: '#00F0FF',
              border: 'none',
              borderRadius: '12px',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              opacity: isVerifying ? 0.6 : 1,
              transition: 'all 0.25s',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!isVerifying) {
                e.currentTarget.style.backgroundColor = '#00f0ffcc'
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 240, 255, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00F0FF'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.4)'
            }}
          >
            {isVerifying ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div 
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #000',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                {isFirstTime ? '设置中...' : '验证中...'}
              </span>
            ) : isFirstTime ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Shield style={{ width: '20px', height: '20px' }} />
                设置密码
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Unlock style={{ width: '20px', height: '20px' }} />
                解锁应用
              </span>
            )}
          </button>
          
          {/* 忘记密码链接 - 仅在验证密码状态显示 */}
          {!isFirstTime && !isVerifying && (
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00F0FF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              忘记密码？点击重置
            </button>
          )}
        </form>

        {/* 忘记密码确认弹窗 */}
        {showForgotModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100002,
              padding: '20px'
            }}
            onClick={handleCancelReset}
          >
            <div 
              style={{
                maxWidth: '380px',
                width: '100%',
                backgroundColor: '#121218',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AlertCircle style={{ color: '#ef4444', width: '32px', height: '32px' }} />
                </div>
                <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>
                  重置密码
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                  此操作将清除当前密码并删除所有本地数据。<br />
                  <span style={{ color: '#ef4444' }}>此操作不可撤销！</span>
                </p>
              </div>

              {/* 确认复选框 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={forgotConfirm}
                    onChange={(e) => setForgotConfirm(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#00F0FF',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                    我确认要重置密码并删除所有数据
                  </span>
                </label>
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleCancelReset}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#9ca3af',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={!forgotConfirm}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: forgotConfirm ? 'pointer' : 'not-allowed',
                    opacity: forgotConfirm ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (forgotConfirm) {
                      e.currentTarget.style.backgroundColor = '#dc2626'
                    }
                  }}
                >
                  确认重置
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 安全提示 */}
        <div 
          style={{
            marginTop: '28px',
            padding: '18px',
            backgroundColor: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Lock style={{ color: '#00F0FF', width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
              您的密码使用 <span style={{ color: '#00F0FF', fontWeight: '600' }}>PBKDF2</span> 算法加密存储，采用 
              <span style={{ color: '#00F0FF', fontWeight: '600' }}>100,000</span> 次迭代。
              切换标签页或最小化窗口时，应用会自动锁定保护您的隐私。
            </p>
          </div>
        </div>
      </div>

      {/* 添加动画样式 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input::placeholder {
          color: #4b5563;
        }
        
        input:focus::placeholder {
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}
