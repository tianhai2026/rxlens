'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  type LineProps
} from 'recharts'
import { db, type DBRecord } from '@/lib/db'
import {
  type AsyncState,
  createIdleState,
  createLoadingState,
  createReadyState,
  createErrorState
} from '@/lib/asyncState'

interface ChartData {
  date: string
  dateLabel: string
  prescriptionCount: number
  revenue: number
  revenueNormalized: number
  records: DBRecord[]
}

function RecordCard({ record }: { record: DBRecord }) {
  return (
    <div style={{
      backgroundColor: 'rgba(55, 65, 81, 0.6)',
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '10px',
      border: '1px solid #374151',
      boxShadow: '0 0 10px rgba(0, 240, 255, 0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 'medium', fontSize: '14px', margin: 0 }}>
            {record.patientName || record.storeName}
          </p>
          <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
            {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span style={{ color: '#00F0FF', fontWeight: 'bold', fontSize: '15px', textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
          ¥{record.total.toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
        {record.items.map((item, index) => (
          <span
            key={index}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              padding: '3px 10px',
              borderRadius: '4px',
              color: '#d1d5db',
              fontSize: '11px'
            }}
          >
            {item.name} x{item.qty}
          </span>
        ))}
      </div>
    </div>
  )
}

// 自定义折线组件，支持动画
function AnimatedLine(props: LineProps<ChartData>) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (animated) {
      const paths = document.querySelectorAll<SVGPathElement>('.recharts-line-path')
      paths.forEach((path) => {
        const length = path.getTotalLength()
        path.style.strokeDasharray = `${length}`
        path.style.strokeDashoffset = `${length}`
        
        path.animate(
          [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
          {
            duration: 1500,
            easing: 'easeOutCubic',
            fill: 'forwards'
          }
        )
      })
    }
  }, [animated])

  return <Line {...props} />
}

export default function AnalyticsChart() {
  const [state, setState] = useState<AsyncState<ChartData[]>>(createIdleState<ChartData[]>([]))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [chartKey, setChartKey] = useState(0)

  const loadChartData = useCallback(async () => {
    setState(prev => createLoadingState(prev.data))
    try {
      const allRecords = await db.findAll()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

      const dateMap = new Map<string, DBRecord[]>()

      allRecords.forEach(record => {
        const recordDate = new Date(record.timestamp)
        if (recordDate >= thirtyDaysAgo) {
          const dateKey = recordDate.toISOString().split('T')[0]
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, [])
          }
          dateMap.get(dateKey)!.push(record)
        }
      })

      let maxRevenue = 1
      dateMap.forEach(records => {
        const revenue = records.reduce((sum, r) => sum + r.total, 0)
        if (revenue > maxRevenue) maxRevenue = revenue
      })

      const result: ChartData[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        const records = dateMap.get(dateKey) || []

        const prescriptionCount = records.filter(r => r.type === '处方').length
        const revenue = records.reduce((sum, r) => sum + r.total, 0)
        const revenueNormalized = (revenue / maxRevenue) * 100

        result.push({
          date: dateKey,
          dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
          prescriptionCount,
          revenue,
          revenueNormalized,
          records
        })
      }

      setState(createReadyState(result))
      // 更新图表 key 以触发重绘和动画
      setChartKey(prev => prev + 1)
    } catch (err) {
      setState(prev => createErrorState(err instanceof Error ? err : new Error('加载图表数据失败'), prev.data))
    }
  }, [])

  useEffect(() => {
    loadChartData()
  }, [loadChartData])

  const handleDateClick = (date: string) => {
    if (selectedDate === date) {
      setExpanded(!expanded)
    } else {
      setSelectedDate(date)
      setExpanded(true)
    }
  }

  const chartData = state.data ?? []

  const selectedRecords = selectedDate
    ? chartData.find(d => d.date === selectedDate)?.records || []
    : []

  if (state.status === 'loading') {
    return (
      <div style={{
        backgroundColor: 'rgba(26, 26, 26, 0.8)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid #333',
        textAlign: 'center',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.08)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #333',
          borderTopColor: '#00F0FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#9ca3af' }}>加载统计数据中...</p>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'rgba(26, 26, 26, 0.8)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid #333',
      boxShadow: '0 0 30px rgba(0, 240, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>近30天趋势</h3>
        <span style={{ color: '#6b7280', fontSize: '12px' }}>点击日期查看详情</span>
      </div>

      <div style={{ height: '280px', marginBottom: '16px' }}>
        <ResponsiveContainer key={chartKey} width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#222" strokeDasharray="4 4" />
            <XAxis
              dataKey="dateLabel"
              tick={{
                fill: '#9ca3af',
                fontSize: 10
              }}
            />
            <YAxis
              tick={{
                fill: '#6b7280',
                fontSize: 10
              }}
              stroke="#333"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)'
              }}
              formatter={(value, name) => {
                const val = Number(value) || 0
                const label = name === 'prescriptionCount' ? '处方量' : '营收指数'
                const displayValue = name === 'prescriptionCount' ? `${val} 张` : `${val.toFixed(1)}%`
                return [`${displayValue}`, label]
              }}
              labelStyle={{ color: '#00F0FF', fontSize: '13px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '8px' }}
              iconType="circle"
              formatter={(value) => value === 'prescriptionCount' ? '处方量' : '营收'}
            />
            <AnimatedLine
              name="处方量"
              dataKey="prescriptionCount"
              stroke="#00F0FF"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <AnimatedLine
              name="营收"
              dataKey="revenueNormalized"
              stroke="#22c55e"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #333'
      }}>
        <div style={{ textAlign: 'center', backgroundColor: 'rgba(0, 240, 255, 0.05)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>总处方量</p>
          <p style={{ color: '#00F0FF', fontSize: '18px', fontWeight: 'bold', margin: 0, textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
            {chartData.reduce((sum, d) => sum + d.prescriptionCount, 0)}
          </p>
        </div>
        <div style={{ textAlign: 'center', backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>总营收</p>
          <p style={{ color: '#22c55e', fontSize: '18px', fontWeight: 'bold', margin: 0, textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
            ¥{chartData.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>日均记录</p>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
            {(chartData.reduce((sum, d) => sum + d.records.length, 0) / 30).toFixed(1)}
          </p>
        </div>
      </div>

      <div style={{
        marginBottom: '16px',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        overflowX: 'auto'
      }}>
        <div style={{
          display: 'flex',
          gap: '6px',
          minWidth: 'max-content'
        }}>
          {chartData.map((day) => (
            <button
              key={day.date}
              onClick={() => handleDateClick(day.date)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: selectedDate === day.date
                  ? 'rgba(0, 240, 255, 0.2)'
                  : 'rgba(55, 65, 81, 0.5)',
                border: selectedDate === day.date
                  ? '1px solid #00F0FF'
                  : '1px solid transparent',
                color: selectedDate === day.date ? '#00F0FF' : '#9ca3af',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                boxShadow: selectedDate === day.date ? '0 0 15px rgba(0, 240, 255, 0.3)' : 'none'
              }}
            >
              <span>{day.dateLabel}</span>
              {day.records.length > 0 && (
                <span style={{
                  fontSize: '9px',
                  color: '#22c55e'
                }}>
                  {day.records.length}条
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div
          style={{
            overflow: 'hidden',
            transition: 'max-height 0.4s ease-in-out',
            maxHeight: expanded ? '800px' : '0'
          }}
        >
          <div style={{
            backgroundColor: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '8px',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h4 style={{
                color: '#00F0FF',
                fontSize: '15px',
                fontWeight: '600',
                margin: 0,
                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
              }}>
                {selectedDate} 的记录明细
              </h4>
              <button
                onClick={() => {
                  setExpanded(false)
                  setTimeout(() => setSelectedDate(null), 400)
                }}
                style={{
                  backgroundColor: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00F0FF',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 10px rgba(0, 240, 255, 0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.2)'}
              >
                收起
              </button>
            </div>

            {selectedRecords.length > 0 ? (
              <div>
                {selectedRecords.map(record => (
                  <RecordCard key={record.id} record={record} />
                ))}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid #333',
                  marginTop: '4px'
                }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                    共 {selectedRecords.length} 条记录
                  </span>
                  <span style={{ color: '#00F0FF', fontSize: '16px', fontWeight: 'bold', textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
                    ¥{selectedRecords.reduce((sum, r) => sum + r.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                该日期暂无记录
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          div[style*="height: '280px'"] {
            height: 220px !important;
          }
        }
      `}</style>
    </div>
  )
}
