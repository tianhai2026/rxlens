'use client'

import { useState } from 'react'
import { useSync, type SyncStatus } from '@/hooks/useSync'
import { checkSupabaseStatus, testSupabaseConnection } from '@/lib/supabase'

export default function SyncTestPage() {
  const { status, direction, stats, isConnected, lastError, startSync, stopSync, triggerSync } = useSync()
  const [log, setLog] = useState<string>('')
  const [supabaseConfig, setSupabaseConfig] = useState<{ configured: boolean; urlSet: boolean; keySet: boolean } | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLog(prev => `[${timestamp}] ${message}\n${prev}`)
  }

  const checkConfig = async () => {
    const config = checkSupabaseStatus()
    setSupabaseConfig(config)
    addLog(`Supabase 配置检查: ${config.configured ? '✅ 已配置' : '❌ 未配置'}`)
    addLog(`  - URL: ${config.urlSet ? '✅ 已设置' : '❌ 未设置'}`)
    addLog(`  - ANON_KEY: ${config.keySet ? '✅ 已设置' : '❌ 未设置'}`)
  }

  const testConnection = async () => {
    addLog('📡 测试 Supabase 连接...')
    const result = await testSupabaseConnection()
    if (result.success) {
      addLog('✅ Supabase 连接成功')
    } else {
      addLog(`❌ Supabase 连接失败: ${result.error}`)
    }
  }

  const handleStartSync = async () => {
    addLog('🚀 启动实时同步...')
    await startSync()
  }

  const handleStopSync = () => {
    addLog('🛑 停止实时同步')
    stopSync()
  }

  const handleTriggerSync = async () => {
    addLog('🔄 手动触发同步...')
    await triggerSync()
  }

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'idle': return '#9ca3af'
      case 'syncing': return '#fbbf24'
      case 'synced': return '#22c55e'
      case 'error': return '#ef4444'
      default: return '#9ca3af'
    }
  }

  const getStatusText = (status: SyncStatus) => {
    switch (status) {
      case 'idle': return '空闲'
      case 'syncing': return '同步中'
      case 'synced': return '已同步'
      case 'error': return '错误'
      default: return '未知'
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#00F0FF' }}>
        🔄 实时同步测试页面
      </h1>

      {/* 配置信息 */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h2 style={{ color: '#3b82f6', marginBottom: '16px', fontSize: '18px' }}>
          📋 Supabase 配置状态
        </h2>
        
        {supabaseConfig ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>配置状态</div>
              <div style={{ color: supabaseConfig.configured ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                {supabaseConfig.configured ? '✅ 已配置' : '❌ 未配置'}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>URL</div>
              <div style={{ color: supabaseConfig.urlSet ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                {supabaseConfig.urlSet ? '✅ 已设置' : '❌ 未设置'}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>ANON_KEY</div>
              <div style={{ color: supabaseConfig.keySet ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                {supabaseConfig.keySet ? '✅ 已设置' : '❌ 未设置'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#9ca3af' }}>点击下方按钮检查配置</div>
        )}
      </div>

      {/* 同步状态 */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        backgroundColor: 'rgba(0, 240, 255, 0.05)', 
        borderRadius: '12px',
        border: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
        <h2 style={{ color: '#00F0FF', marginBottom: '16px', fontSize: '18px' }}>
          📊 同步状态
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>同步状态</div>
            <div style={{ color: getStatusColor(status), fontWeight: 'bold', fontSize: '16px' }}>
              {getStatusText(status)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>同步方向</div>
            <div style={{ color: '#00F0FF', fontWeight: 'bold' }}>
              {direction === 'local-to-remote' ? '本地 → 远程' : direction === 'remote-to-local' ? '远程 → 本地' : '双向'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>本地记录数</div>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '16px' }}>
              {stats.localRecords}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>远程记录数</div>
            <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '16px' }}>
              {stats.remoteRecords}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
          <div>同步次数: {stats.syncCount}</div>
          <div>最后同步: {stats.lastSync ? stats.lastSync.toLocaleString() : '从未'}</div>
          <div>连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
        </div>

        {lastError && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ color: '#ef4444' }}>❌ 错误: {lastError}</div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={checkConfig}
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📋 检查配置
        </button>
        <button
          onClick={testConnection}
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📡 测试连接
        </button>
        <button
          onClick={handleStartSync}
          disabled={!isConnected || status === 'syncing'}
          style={{
            padding: '12px 24px',
            backgroundColor: isConnected && status !== 'syncing' ? '#00F0FF' : '#374151',
            color: isConnected && status !== 'syncing' ? '#000' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            cursor: isConnected && status !== 'syncing' ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          🚀 启动同步
        </button>
        <button
          onClick={handleStopSync}
          disabled={status === 'idle'}
          style={{
            padding: '12px 24px',
            backgroundColor: status !== 'idle' ? 'rgba(239, 68, 68, 0.1)' : '#374151',
            color: status !== 'idle' ? '#ef4444' : '#9ca3af',
            border: status !== 'idle' ? '1px solid #ef4444' : 'none',
            borderRadius: '8px',
            cursor: status !== 'idle' ? 'pointer' : 'not-allowed'
          }}
        >
          🛑 停止同步
        </button>
        <button
          onClick={handleTriggerSync}
          disabled={!isConnected}
          style={{
            padding: '12px 24px',
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : '#374151',
            color: isConnected ? '#22c55e' : '#9ca3af',
            border: isConnected ? '1px solid #22c55e' : 'none',
            borderRadius: '8px',
            cursor: isConnected ? 'pointer' : 'not-allowed'
          }}
        >
          🔄 手动同步
        </button>
      </div>

      {/* 日志输出 */}
      <div style={{
        backgroundColor: 'rgba(26, 26, 26, 0.8)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #333',
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <div style={{ color: '#9ca3af', marginBottom: '8px' }}>📝 操作日志:</div>
        {log || '点击上方按钮开始测试...'}
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        <h3 style={{ color: '#fbbf24', marginBottom: '12px' }}>📖 使用说明</h3>
        <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
          <div>1. 首先检查 Supabase 配置是否正确设置</div>
          <div>2. 测试 Supabase 连接是否正常</div>
          <div>3. 点击"启动同步"开始实时同步</div>
          <div>4. 本地数据变更会自动同步到远程 Supabase</div>
          <div>5. 远程 Supabase 数据变更会自动同步回本地</div>
          <div>6. 冲突处理：以 timestamp 较新的记录为准</div>
        </div>
      </div>
    </div>
  )
}
