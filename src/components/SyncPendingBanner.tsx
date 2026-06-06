'use client'

import { useSync } from '@/hooks/useSync'
import { RefreshCw, WifiOff, CheckCircle } from 'lucide-react'

export default function SyncPendingBanner() {
  const { status, pendingCount, lastError, triggerQueueSync } = useSync()

  // 只在 pending 状态显示横幅
  if (status !== 'pending') {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#FF6B00', // 荧光橙色
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(255, 107, 0, 0.4)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <WifiOff style={{ width: 18, height: 18, flexShrink: 0 }} />
      
      <span style={{ fontSize: '14px', fontWeight: '500' }}>
        同步 pending
        {pendingCount > 0 && (
          <span style={{ 
            marginLeft: '8px', 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            padding: '2px 8px', 
            borderRadius: '10px',
            fontSize: '12px'
          }}>
            {pendingCount} 条待同步
          </span>
        )}
      </span>

      {lastError && (
        <span style={{ 
          fontSize: '12px', 
          opacity: 0.9,
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {lastError}
        </span>
      )}

      <button
        onClick={triggerQueueSync}
        disabled={pendingCount === 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: '500',
          cursor: pendingCount === 0 ? 'not-allowed' : 'pointer',
          opacity: pendingCount === 0 ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (pendingCount > 0) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
        }}
      >
        <RefreshCw style={{ width: 14, height: 14 }} />
        重试同步
      </button>
    </div>
  )
}
