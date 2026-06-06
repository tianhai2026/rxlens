'use client'

import { useState } from 'react'
import { db } from '@/lib/db'
import { useDatabaseRecords, useTodayStats } from '@/hooks/useDatabase'

export default function TestSubmitPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { records, state: recordsState, refresh } = useDatabaseRecords()
  const { totalAmount, prescriptionCount, refresh: refreshStats } = useTodayStats()

  const addLog = (message: string) => {
    
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  // 测试 1: 直接通过 db API 创建记录
  const testDirectCreate = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('🧪 测试 1: 直接通过 db API 创建记录')
    
    try {
      const id = await db.records.add({
        schema_version: 'v1',
        timestamp: new Date(),
        type: '处方',
        items: [
          { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
          { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 }
        ],
        total: 59.0,
        patientName: '测试患者A',
        doctorName: '测试医生A'
      })
      addLog(`✅ 创建成功，ID: ${id}`)
      addLog(`📊 当前数据库总记录数: ${await db.records.count()}`)
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 创建失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  // 测试 2: 通过 hooks 创建记录
  const testHookCreate = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('🧪 测试 2: 通过 useDatabaseRecords hook 创建记录')
    
    try {
      // 模拟 hook 中的 createRecord
      const newRecord = {
        schema_version: 'v1' as const,
        timestamp: new Date(),
        type: '小票' as const,
        items: [
          { name: '维生素C', qty: 3, price: 12.0 },
          { name: '板蓝根颗粒', qty: 1, price: 18.5 }
        ],
        total: 54.5,
        storeName: '测试大药房'
      }
      
      const id = await db.records.add(newRecord)
      addLog(`✅ Hook 方式创建成功，ID: ${id}`)
      addLog(`📦 创建的记录: ${JSON.stringify(newRecord, null, 2)}`)
      addLog(`📊 当前数据库总记录数: ${await db.records.count()}`)
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 创建失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  // 测试 3: 批量创建记录
  const testBatchCreate = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('🧪 测试 3: 批量创建 5 条记录')
    
    try {
      const types: ('处方' | '小票')[] = ['处方', '小票', '处方', '小票', '处方']
      const names = ['张三', '李四', '王五', '赵六', '钱七']
      const stores = ['康佰家', '老百姓', '益丰', '一心堂', '大参林']
      const doctors = ['王医生', '陈医生', '刘医生', '黄医生', '周医生']
      
      const ids: number[] = []
      for (let i = 0; i < 5; i++) {
        const isPrescription = types[i] === '处方'
        const id = await db.records.add({
          schema_version: 'v1',
          timestamp: new Date(),
          type: types[i],
          items: [
            { name: `药品${i + 1}-A`, qty: 2, price: 20 + i * 5 },
            { name: `药品${i + 1}-B`, qty: 1, price: 15 + i * 3 }
          ],
          total: (20 + i * 5) * 2 + (15 + i * 3),
          patientName: isPrescription ? names[i] : undefined,
          doctorName: isPrescription ? doctors[i] : undefined,
          storeName: !isPrescription ? stores[i] : undefined
        })
        ids.push(id)
        addLog(`  ✅ 创建 ${types[i]} 记录 #${i + 1}, ID: ${id}`)
      }
      
      addLog(`📊 批量创建完成，共 ${ids.length} 条`)
      addLog(`📊 当前数据库总记录数: ${await db.records.count()}`)
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 批量创建失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  // 测试 4: 查询和统计
  const testQuery = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('🧪 测试 4: 查询和统计')
    
    try {
      // 查询所有
      const all = await db.records.toArray()
      addLog(`📋 所有记录: ${all.length} 条`)
      
      // 按类型查询
      const prescriptions = await db.records.where('type').equals('处方').toArray()
      const receipts = await db.records.where('type').equals('小票').toArray()
      addLog(`💊 处方记录: ${prescriptions.length} 条`)
      addLog(`🧾 小票记录: ${receipts.length} 条`)
      
      // 今日统计
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const todayRecords = all.filter(record => {
        const ts = new Date(record.timestamp)
        return ts >= today && ts < tomorrow
      })
      
      const total = todayRecords.reduce((sum, r) => sum + r.total, 0)
      const count = todayRecords.filter(r => r.type === '处方').length
      
      addLog(`📊 今日记录: ${todayRecords.length} 条`)
      addLog(`💰 今日总金额: ¥${total.toFixed(2)}`)
      addLog(`📝 今日处方数: ${count}`)
      
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 查询失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  // 测试 5: 更新和删除
  const testUpdateDelete = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('🧪 测试 5: 更新和删除')
    
    try {
      const all = await db.records.toArray()
      if (all.length === 0) {
        addLog('⚠️ 数据库为空，请先创建记录')
        setIsRunning(false)
        return
      }
      
      const firstId = all[0].id!
      addLog(`📝 更新记录 ID ${firstId}...`)
      await db.records.update(firstId, { total: 999.99, patientName: '已更新的患者' })
      const updated = await db.records.get(firstId)
      addLog(`✅ 更新后金额: ¥${updated?.total}, 患者: ${updated?.patientName}`)
      
      addLog(`🗑️ 删除记录 ID ${firstId}...`)
      await db.records.delete(firstId)
      const afterDelete = await db.records.toArray()
      addLog(`✅ 删除后剩余 ${afterDelete.length} 条记录`)
      
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 更新/删除失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  // 清空数据库
  const clearAll = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return
    
    setIsRunning(true)
    setLogs([])
    addLog('🧹 清空数据库...')
    
    try {
      await db.records.clear()
      addLog('✅ 数据库已清空')
      await refresh()
      await refreshStats()
    } catch (error) {
      addLog(`❌ 清空失败: ${error}`)
    }
    
    setIsRunning(false)
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#00F0FF' }}>
        🧪 数据库提交功能验证
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
        测试数据提交到 IndexedDB 的完整流程
      </p>

      {/* 当前数据状态 */}
      <div style={{ 
        backgroundColor: 'rgba(0, 240, 255, 0.05)', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '24px',
        border: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
        <h2 style={{ color: '#00F0FF', fontSize: '18px', marginBottom: '12px' }}>📊 当前数据状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>总记录数</p>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{records.length}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>今日金额</p>
            <p style={{ color: '#00F0FF', fontSize: '24px', fontWeight: 'bold' }}>¥{totalAmount}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>今日处方</p>
            <p style={{ color: '#00F0FF', fontSize: '24px', fontWeight: 'bold' }}>{prescriptionCount}</p>
          </div>
        </div>
      </div>

      {/* 测试按钮 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={testDirectCreate}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: '#00F0FF',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          1️⃣ 直接 API 创建
        </button>
        <button
          onClick={testHookCreate}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            color: '#00F0FF',
            border: '1px solid #00F0FF',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          2️⃣ Hook 方式创建
        </button>
        <button
          onClick={testBatchCreate}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            color: '#00F0FF',
            border: '1px solid #00F0FF',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          3️⃣ 批量创建 (5条)
        </button>
        <button
          onClick={testQuery}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            color: '#00F0FF',
            border: '1px solid #00F0FF',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          4️⃣ 查询和统计
        </button>
        <button
          onClick={testUpdateDelete}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          5️⃣ 更新和删除
        </button>
        <button
          onClick={clearAll}
          disabled={isRunning}
          style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1
          }}
        >
          🧹 清空数据库
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
        maxHeight: '400px',
        overflow: 'auto',
        marginBottom: '24px'
      }}>
        <div style={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}>
          📝 操作日志 {isRunning && '(运行中...)'}
        </div>
        {logs.length === 0 ? (
          <p style={{ color: '#6b7280' }}>点击上方按钮开始测试...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ color: '#d1d5db', marginBottom: '4px' }}>{log}</div>
          ))
        )}
      </div>

      {/* 记录列表 */}
      <div style={{
        backgroundColor: 'rgba(26, 26, 26, 0.8)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #333'
      }}>
        <h2 style={{ color: '#00F0FF', fontSize: '18px', marginBottom: '12px' }}>
          📋 数据库中的记录 {recordsState.status === 'loading' && '(加载中...)'}
        </h2>
        {records.length === 0 ? (
          <p style={{ color: '#6b7280' }}>暂无记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {records.map(record => (
              <div key={record.id} style={{ 
                backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                padding: '12px', 
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff' }}>
                    ID: {record.id} | {record.type} | ¥{record.total}
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    {new Date(record.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div style={{ color: '#9ca3af', marginTop: '4px' }}>
                  {record.patientName || record.storeName} 
                  {record.doctorName && ` | ${record.doctorName}`}
                </div>
                <div style={{ color: '#6b7280', marginTop: '4px' }}>
                  药品: {record.items.map(i => `${i.name} x${i.qty}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
