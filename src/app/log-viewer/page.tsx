'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { validationLogger, ValidationErrorType, type ValidationLog, type ValidationStats } from '@/lib/validationLogger'
import { AlertCircle, Trash2, Download, RefreshCw, BarChart3, Clock, FileText, Percent } from 'lucide-react'
import {
  type AsyncState,
  createIdleState,
  createLoadingState,
  createReadyState,
  createErrorState,
  createThrottler
} from '@/lib/asyncState'

interface LogViewerData {
  logs: ValidationLog[]
  stats: ValidationStats | null
}

export default function LogViewerPage() {
  const [state, setState] = useState<AsyncState<LogViewerData>>(createIdleState({ logs: [], stats: null }))
  const [selectedType, setSelectedType] = useState<string>('all')

  const loadLogs = useCallback(() => {
    setState(prev => createLoadingState(prev.data))
    try {
      const recentLogs = validationLogger.getRecentLogs(100)
      const currentStats = validationLogger.getStats()
      setState(createReadyState({ logs: recentLogs, stats: currentStats }))
    } catch (err) {
      setState(prev => createErrorState(err instanceof Error ? err : new Error('加载日志失败'), prev.data))
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleRefresh = () => {
    loadLogs()
  }

  const handleClearLogs = () => {
    if (confirm('确定要清空所有日志吗？此操作不可恢复。')) {
      validationLogger.clearLogs()
      loadLogs()
    }
  }

  const handleExportLogs = () => {
    const allLogs = validationLogger.getAllLogs()
    const dataStr = JSON.stringify(allLogs, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 筛选下拉框使用 300ms 节流
  const typeThrottler = useRef(createThrottler((value: string) => {
    setSelectedType(value)
  }, 300))

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    typeThrottler.current.trigger(e.target.value)
  }

  const logs = state.data?.logs ?? []

  const filteredLogs = selectedType === 'all'
    ? logs
    : logs.filter(log => log.errorType === selectedType)

  const stats = state.data?.stats

  const getErrorTypeColor = (errorType: ValidationErrorType): string => {
    switch (errorType) {
      case ValidationErrorType.AMOUNT_TOO_LOW: return '#f59e0b'
      case ValidationErrorType.AMOUNT_TOO_HIGH: return '#f59e0b'
      case ValidationErrorType.AMOUNT_ZERO_WHEN_NONZERO: return '#ef4444'
      case ValidationErrorType.NEGATIVE_AMOUNT: return '#ef4444'
      case ValidationErrorType.NEGATIVE_QUANTITY: return '#ef4444'
      case ValidationErrorType.NEGATIVE_PRICE: return '#ef4444'
      case ValidationErrorType.QUANTITY_ZERO: return '#8b5cf6'
      case ValidationErrorType.EMPTY_NAME: return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getTimeOfDayLabel = (timeOfDay: string): string => {
    const labels: Record<string, string> = {
      morning: '上午 (6:00-12:00)',
      afternoon: '下午 (12:00-18:00)',
      evening: '晚上 (18:00-22:00)',
      night: '深夜 (22:00-6:00)'
    }
    return labels[timeOfDay] || timeOfDay
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#00F0FF' }}>
            校验日志查看器
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            记录用户在金额输入时的错误类型和详细信息
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            刷新
          </button>
          <button
            onClick={handleExportLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            导出
          </button>
          <button
            onClick={handleClearLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
            清空
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertCircle style={{ color: '#f59e0b', width: '20px', height: '20px' }} />
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>总错误数</span>
            </div>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.totalErrors}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Percent style={{ color: '#22c55e', width: '20px', height: '20px' }} />
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>平均差异</span>
            </div>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>¥{stats.avgDifference.toFixed(2)}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Clock style={{ color: '#3b82f6', width: '20px', height: '20px' }} />
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>最大差异</span>
            </div>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>¥{stats.maxDifference.toFixed(2)}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText style={{ color: '#8b5cf6', width: '20px', height: '20px' }} />
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>处方/小票</span>
            </div>
            <p style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {stats.errorsByRecordType.prescription} / {stats.errorsByRecordType.receipt}
            </p>
          </div>
        </div>
      )}

      {/* 错误类型分布 */}
      {stats && Object.keys(stats.errorsByType).length > 0 && (
        <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ color: '#00F0FF', width: '20px', height: '20px' }} />
            错误类型分布
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(stats.errorsByType).map(([type, count]) => (
              <div
                key={type}
                style={{
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span style={{ color: getErrorTypeColor(type as ValidationErrorType), fontSize: '12px', fontWeight: '600' }}>
                  {type}
                </span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', marginLeft: '8px' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
            最近日志 <span style={{ color: '#6b7280', fontWeight: '400' }}>({filteredLogs.length} 条)</span>
          </h3>
          <select
            value={selectedType}
            onChange={handleTypeChange}
            style={{
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="all">全部类型</option>
            {Object.values(ValidationErrorType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {state.status === 'loading' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            加载中...
          </div>
        ) : state.status === 'error' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            加载失败: {state.error?.message}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            暂无日志记录
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {filteredLogs.map(log => (
              <div
                key={log.id}
                style={{
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        backgroundColor: getErrorTypeColor(log.errorType),
                        color: '#000',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      {log.errorType}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <span style={{ color: '#00F0FF', fontSize: '14px', fontWeight: 'bold' }}>
                    {log.recordType}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>数量: </span>
                    <span style={{ color: '#fff' }}>{log.quantity}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>单价: </span>
                    <span style={{ color: '#fff' }}>¥{log.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>金额: </span>
                    <span style={{ color: log.difference !== 0 ? '#f59e0b' : '#fff' }}>
                      ¥{log.amount.toFixed(2)}
                      {log.difference !== 0 && (
                        <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                          (差异: ¥{log.difference.toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>期望金额: </span>
                    <span style={{ color: '#fff' }}>¥{log.expectedAmount.toFixed(2)}</span>
                  </div>
                </div>
                {log.additionalInfo && (
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                    {log.additionalInfo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
