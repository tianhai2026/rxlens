'use client'

import { useState, useEffect } from 'react'
import { Settings, FileJson, FileSpreadsheet, ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'
import { exportEncryptedBackup, exportCSVReport, checkExportStatus } from '@/lib/export'
import { checkSupabaseStatus } from '@/lib/supabase'
import { useAllStats } from '@/hooks/useDatabase'
import {
  type AsyncState,
  createIdleState,
  createLoadingState,
  createReadyState,
  createErrorState
} from '@/lib/asyncState'

type ExportActionType = 'backup' | 'csv'

interface ExportActionState {
  status: AsyncState<{ type: ExportActionType; filename?: string; count?: number }>
  consistency: { type: ExportActionType; data: any } | null
}

function createIdleExportState(): ExportActionState {
  return { status: createIdleState<{ type: ExportActionType; filename?: string; count?: number }>(null), consistency: null }
}

function StatsSkeleton() {
  return (
    <div style={{ 
      backgroundColor: 'rgba(26, 26, 26, 0.8)', 
      borderRadius: '12px', 
      padding: '20px', 
      border: '1px solid #333' 
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>总记录数</p>
          <div style={{ 
            width: '60px', 
            height: '28px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            margin: '0 auto',
            animation: 'skeleton-loading 1.5s ease-in-out infinite'
          }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>总金额</p>
          <div style={{ 
            width: '80px', 
            height: '28px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            margin: '0 auto',
            animation: 'skeleton-loading 1.5s ease-in-out infinite',
            animationDelay: '0.1s'
          }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>处方数量</p>
          <div style={{ 
            width: '50px', 
            height: '24px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            margin: '0 auto',
            animation: 'skeleton-loading 1.5s ease-in-out infinite',
            animationDelay: '0.2s'
          }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>小票数量</p>
          <div style={{ 
            width: '50px', 
            height: '24px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            margin: '0 auto',
            animation: 'skeleton-loading 1.5s ease-in-out infinite',
            animationDelay: '0.3s'
          }} />
        </div>
      </div>
      
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
        <div style={{ 
          height: '16px', 
          backgroundColor: '#333', 
          borderRadius: '4px',
          marginBottom: '8px',
          animation: 'skeleton-loading 1.5s ease-in-out infinite',
          animationDelay: '0.4s'
        }} />
        <div style={{ 
          height: '16px', 
          backgroundColor: '#333', 
          borderRadius: '4px',
          animation: 'skeleton-loading 1.5s ease-in-out infinite',
          animationDelay: '0.5s'
        }} />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportActionState>(createIdleExportState())
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null)
  const [exportStatus, setExportStatus] = useState<any>(null)

  const { state: statsState, stats, refresh: refreshStats } = useAllStats()

  useEffect(() => {
    checkSupabaseConfig()
    checkExportStatusInfo()
  }, [])

  const checkSupabaseConfig = () => {
    const status = checkSupabaseStatus()
    setSupabaseStatus(status)
  }

  const checkExportStatusInfo = () => {
    const status = checkExportStatus()
    setExportStatus(status)
  }

  const handleExportBackup = async () => {
    setExportState({ status: createLoadingState({ type: 'backup' }), consistency: null })
    try {
      const result = await exportEncryptedBackup()

      const newState: ExportActionState = {
        status: createReadyState({
          type: 'backup',
          filename: result.filename,
          count: result.count
        }),
        consistency: result.consistencyCheck
          ? { type: 'backup', data: result.consistencyCheck }
          : null
      }
      setExportState(newState)

      await refreshStats()
      checkExportStatusInfo()

      setTimeout(() => setExportState(createIdleExportState()), 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setExportState(prev => ({
        status: createErrorState(new Error(`导出加密备份失败: ${errorMessage}`), prev.status.data),
        consistency: null
      }))
    }
  }

  const handleExportCSV = async () => {
    setExportState({ status: createLoadingState({ type: 'csv' }), consistency: null })
    try {
      const result = await exportCSVReport()

      const newState: ExportActionState = {
        status: createReadyState({
          type: 'csv',
          filename: result.filename,
          count: result.warning ? 0 : result.count
        }),
        consistency: result.consistencyCheck
          ? { type: 'csv', data: result.consistencyCheck }
          : null
      }
      setExportState(newState)

      await refreshStats()
      checkExportStatusInfo()

      setTimeout(() => setExportState(createIdleExportState()), 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setExportState(prev => ({
        status: createErrorState(new Error(`导出CSV报表失败: ${errorMessage}`), prev.status.data),
        consistency: null
      }))
    }
  }

  const clearExportError = () => {
    setExportState(prev => ({ ...prev, status: createIdleState(prev.status.data) }))
  }

  const isExporting = exportState.status.status === 'loading'
  const exportingType = exportState.status.data?.type ?? null
  const exportSuccess = exportState.status.status === 'ready' ? exportState.status.data : null
  const exportError = exportState.status.status === 'error' ? exportState.status.error : null
  const consistencyInfo = exportState.consistency

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ padding: '24px', borderBottom: '1px solid #333' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/">
            <ArrowLeft style={{ color: '#9ca3af', width: '24px', height: '24px', cursor: 'pointer' }} />
          </Link>
          <Settings style={{ color: '#00F0FF', width: '28px', height: '28px' }} />
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>设置</h1>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info style={{ color: '#00F0FF', width: '20px', height: '20px' }} />
            数据库统计
          </h2>
          
          {statsState.status === 'loading' ? (
            <StatsSkeleton />
          ) : statsState.status === 'error' ? (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #ef4444',
              textAlign: 'center'
            }}>
              <p style={{ color: '#ef4444', fontSize: '14px' }}>加载统计数据失败: {statsState.error?.message}</p>
              <button
                onClick={refreshStats}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                重试
              </button>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: 'rgba(26, 26, 26, 0.8)', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid #333' 
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>总记录数</p>
                  <p style={{ color: '#00F0FF', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.totalRecords}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>总金额</p>
                  <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>¥{stats.totalAmount.toFixed(2)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>处方数量</p>
                  <p style={{ color: '#fff', fontSize: '20px', fontWeight: '600', margin: 0 }}>{stats.prescriptionCount}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>小票数量</p>
                  <p style={{ color: '#fff', fontSize: '20px', fontWeight: '600', margin: 0 }}>{stats.receiptCount}</p>
                </div>
              </div>
              
              {(stats.earliestRecord || stats.latestRecord) && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                  {stats.earliestRecord && (
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>
                      最早记录: {stats.earliestRecord}
                    </p>
                  )}
                  {stats.latestRecord && (
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>
                      最新记录: {stats.latestRecord}
                    </p>
                  )}
                  {exportStatus && (
                    <p style={{ color: exportStatus.isExporting ? '#fbbf24' : '#22c55e', fontSize: '13px', margin: '4px 0', fontWeight: '600' }}>
                      导出状态: {exportStatus.isExporting ? '⏳ 正在导出...' : '✓ 可导出'}
                    </p>
                  )}
                </div>
              )}
              
              {stats.totalRecords === 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', fontSize: '13px' }}>
                    暂无记录，开始录入您的第一张处方吧！
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileJson style={{ color: '#00F0FF', width: '20px', height: '20px' }} />
            数据导出
          </h2>

          {exportSuccess && (
            <div style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid #22c55e', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
              <span style={{ color: '#22c55e', fontSize: '14px' }}>
                {exportSuccess.type === 'backup' ? '加密备份' : 'CSV报表'}导出成功
                {exportSuccess.filename && ` (${exportSuccess.filename})`}
                {exportSuccess.count !== undefined && ` - 共 ${exportSuccess.count} 条记录`}
              </span>
            </div>
          )}

          {consistencyInfo && (
            <div style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid #3b82f6', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: '#3b82f6', fontSize: '16px' }}>🔒</span>
                <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '600' }}>
                  数据一致性保障
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
                <div>✓ 使用事务读取确保数据一致性</div>
                <div>✓ 导出时间: {new Date(consistencyInfo.data.exportStartTime).toLocaleString('zh-CN')}</div>
                <div>✓ 记录数量: {consistencyInfo.data.recordCount}</div>
                <div>✓ 校验码: {consistencyInfo.data.checksum}</div>
              </div>
            </div>
          )}

          {exportError && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid #ef4444', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ef4444', fontSize: '18px' }}>✕</span>
                <span style={{ color: '#ef4444', fontSize: '14px' }}>{exportError?.message}</span>
              </div>
              <button
                onClick={clearExportError}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'rgba(26, 26, 26, 0.8)',
                border: '1px solid #333',
                borderRadius: '12px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (!isExporting) {
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                  e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.05)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#333'
                e.currentTarget.style.backgroundColor = 'rgba(26, 26, 26, 0.8)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 240, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileJson style={{ color: '#00F0FF', width: '20px', height: '20px' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#fff', fontWeight: '500', margin: '0 0 4px 0', fontSize: '15px' }}>
                    导出加密备份
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                    将整个数据库导出为加密的 JSON 文件
                  </p>
                </div>
              </div>
              <span style={{
                color: '#00F0FF',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {exportingType === 'backup' ? '导出中...' : '导出'}
                {exportingType !== 'backup' && '→'}
              </span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'rgba(26, 26, 26, 0.8)',
                border: '1px solid #333',
                borderRadius: '12px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (!isExporting) {
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)'
                  e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#333'
                e.currentTarget.style.backgroundColor = 'rgba(26, 26, 26, 0.8)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet style={{ color: '#22c55e', width: '20px', height: '20px' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#fff', fontWeight: '500', margin: '0 0 4px 0', fontSize: '15px' }}>
                    导出 Excel 报表
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                    将记录导出为不含附件的 CSV 文件（财务审查用）
                  </p>
                </div>
              </div>
              <span style={{
                color: '#22c55e',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {exportingType === 'csv' ? '导出中...' : '导出'}
                {exportingType !== 'csv' && '→'}
              </span>
            </button>
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Supabase 配置
          </h2>
          
          <div style={{ 
            backgroundColor: 'rgba(26, 26, 26, 0.8)', 
            borderRadius: '12px', 
            padding: '20px', 
            border: '1px solid #333' 
          }}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>配置状态</p>
              <p style={{ 
                color: supabaseStatus?.configured ? '#22c55e' : '#ef4444', 
                fontWeight: 'bold',
                fontSize: '16px',
                margin: 0
              }}>
                {supabaseStatus?.configured ? '✓ 已配置' : '✗ 未配置'}
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
              <div>
                <span style={{ color: '#9ca3af' }}>URL:</span> {supabaseStatus?.urlSet ? '已设置' : '未设置'}
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Key:</span> {supabaseStatus?.keySet ? '已设置' : '未设置'}
              </div>
            </div>
            
            {!supabaseStatus?.configured && (
              <p style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                borderRadius: '6px',
                fontSize: '12px',
                color: '#ef4444'
              }}>
                请在环境变量中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
              </p>
            )}
          </div>
        </section>

        <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #333', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>
            RxLens v2.0.0 · 设置页面
          </p>
        </footer>
        
        <style>{`
          @keyframes skeleton-loading {
            0%, 100% {
              opacity: 0.4;
            }
            50% {
              opacity: 0.8;
            }
          }
        `}</style>
      </main>
    </div>
  )
}
