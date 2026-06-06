'use client'

import { useState } from 'react'
import { db, type RecordType } from '@/lib/db'
import { encryptData, decryptData, verifyDataIntegrity, checkEncryptionStatus } from '@/lib/encryption'

export default function DBTestPage() {
  const [result, setResult] = useState<string>('')
  const [encryptionTest, setEncryptionTest] = useState<{
    original?: any
    encrypted?: string
    decrypted?: any
    integrity?: boolean
  }>({})
  
  const [rawEncryptedData, setRawEncryptedData] = useState<Array<{
    id: number
    encrypted_data: string
    encryption_version: string
  }>>([])

  const log = (message: string) => {
    
    setResult(prev => prev + '\n' + message)
  }

  const clearLog = () => {
    setResult('')
  }

  // 测试加密流程
  const testEncryptionFlow = async () => {
    try {
      log('🔐 开始测试加密解密流程...')
      
      // 1. 创建测试数据
      const originalData = {
        type: '处方',
        items: [
          { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
          { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 }
        ],
        total: 59.0,
        patientName: '张三',
        doctorName: '李医生',
        timestamp: new Date().toISOString()
      }
      log(`📤 原始数据: ${JSON.stringify(originalData).substring(0, 100)}...`)
      setEncryptionTest(prev => ({ ...prev, original: originalData }))

      // 2. 加密数据
      const encrypted = encryptData(originalData)
      log(`🔒 加密后密文: ${encrypted.substring(0, 80)}...`)
      setEncryptionTest(prev => ({ ...prev, encrypted }))

      // 3. 解密数据
      const decrypted = decryptData(encrypted)
      log(`🔓 解密后数据: ${JSON.stringify(decrypted).substring(0, 100)}...`)
      setEncryptionTest(prev => ({ ...prev, decrypted }))

      // 4. 验证完整性
      const integrity = verifyDataIntegrity(originalData, decrypted)
      if (integrity) {
        log('✅ 数据完整性验证通过！')
      } else {
        log('❌ 数据完整性验证失败！')
      }
      setEncryptionTest(prev => ({ ...prev, integrity }))

      // 5. 检查加密状态
      const status = checkEncryptionStatus()
      log(`📊 加密状态: 算法=${status.algorithm}, 密钥可用=${status.keyAvailable}, 密钥长度=${status.keyLength}位`)
      
    } catch (error) {
      log(`❌ 加密测试失败：${error}`)
    }
  }

  // 测试数据库加密存储
  const testDBEncryption = async () => {
    try {
      log('🗄️ 测试数据库加密存储...')
      
      // 1. 创建测试记录
      const testData = {
        type: '处方' as RecordType,
        items: [
          { name: '头孢克肟分散片', qty: 3, price: 22.0 },
          { name: '维生素C片', qty: 1, price: 8.5 }
        ],
        total: 74.5,
        patientName: '测试用户',
        doctorName: '测试医生'
      }
      
      log(`📤 准备写入数据: ${JSON.stringify(testData).substring(0, 80)}...`)
      
      // 2. 写入数据库
      const id = await db.create(testData)
      log(`✅ 数据写入成功，ID: ${id}`)
      
      // 3. 读取数据
      const record = await db.findById(id)
      if (record) {
        log(`📥 读取到的数据: ${JSON.stringify(record).substring(0, 80)}...`)
        
        // 4. 验证数据完整性
        const isSame = JSON.stringify(record.items) === JSON.stringify(testData.items) &&
                       record.total === testData.total &&
                       record.patientName === testData.patientName
        if (isSame) {
          log('✅ 数据库读写完整性验证通过！')
        } else {
          log('❌ 数据库读写完整性验证失败！')
        }
      }
      
    } catch (error) {
      log(`❌ 数据库测试失败：${error}`)
    }
  }

  // 直接查看IndexedDB中的加密数据（需要浏览器开发者工具）
  const showEncryptionInfo = () => {
    const status = checkEncryptionStatus()
    setResult(`=== 加密模块状态 ===
算法: ${status.algorithm}
密钥可用: ${status.keyAvailable}
密钥长度: ${status.keyLength} 位
加密API可用: ${status.cryptoAvailable}

=== 加密原理 ===
1. 使用AES-256-CBC对称加密算法
2. 每次加密生成随机IV(初始化向量)
3. IV与密文组合存储，格式: [IV]:[密文]
4. 解密时分离IV和密文进行解密

=== 验证方法 ===
打开浏览器开发者工具 > Application > IndexedDB > rxlens-db > records
查看加密存储的数据，应该看到类似: "abc123...:def456..." 的格式
`)
  }

  // 查看原始加密数据
  const viewRawEncryptedData = async () => {
    try {
      log('🔍 获取原始加密数据...')
      
      // 直接访问db实例获取原始数据
      const rawData = await db.getRawEncryptedData()
      setRawEncryptedData(rawData)
      
      if (rawData.length === 0) {
        log('⚠️ 数据库中没有记录，请先创建测试数据')
        return
      }
      
      log(`✅ 获取到 ${rawData.length} 条原始加密记录`)
      
      // 显示第一条记录的格式分析
      const firstRecord = rawData[0]
      log(`📝 第一条记录分析:`)
      log(`   ID: ${firstRecord.id}`)
      log(`   加密版本: ${firstRecord.encryption_version}`)
      log(`   加密数据格式: ${firstRecord.encrypted_data.includes(':') ? '✅ IV:密文 格式' : '❌ 格式不正确'}`)
      
      // 分离IV和密文
      const [ivPart, cipherPart] = firstRecord.encrypted_data.split(':')
      if (ivPart && cipherPart) {
        log(`   IV长度: ${ivPart.length} 字符 (Base64编码的16字节IV)`)
        log(`   密文长度: ${cipherPart.length} 字符`)
        log(`   总长度: ${firstRecord.encrypted_data.length} 字符`)
      }
      
    } catch (error) {
      log(`❌ 获取原始数据失败：${error}`)
    }
  }

  const testCreate = async () => {
    try {
      log('📝 测试创建记录...')
      const id = await db.create({
        type: '处方',
        items: [
          { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
          { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 }
        ],
        total: 59.0,
        patientName: '张三',
        doctorName: '李医生'
      })
      log(`✅ 创建成功，ID: ${id}`)
    } catch (error) {
      log(`❌ 创建失败：${error}`)
    }
  }

  const testFindAll = async () => {
    try {
      log('📋 查询所有记录...')
      const records = await db.findAll()
      log(`✅ 查询完成，共 ${records.length} 条记录`)
      records.forEach((record, index) => {
        log(`  [${index + 1}] ${record.type} - ¥${record.total} - ${record.patientName || record.storeName}`)
      })
    } catch (error) {
      log(`❌ 查询失败：${error}`)
    }
  }

  const testTodayStats = async () => {
    try {
      log('📊 查询今日统计...')
      const [total, count] = await Promise.all([
        db.getTodayTotal(),
        db.getTodayPrescriptionCount()
      ])
      log(`✅ 今日总金额：¥${total}`)
      log(`✅ 今日处方数：${count}`)
    } catch (error) {
      log(`❌ 查询失败：${error}`)
    }
  }

  const testDelete = async () => {
    try {
      log('️ 删除第一条记录...')
      const records = await db.findAll()
      if (records.length > 0) {
        const firstRecord = records[0]
        if (firstRecord.id) {
          await db.remove(firstRecord.id)
          log(`✅ 删除成功，ID: ${firstRecord.id}`)
        }
      } else {
        log('⚠️ 没有可删除的记录')
      }
    } catch (error) {
      log(`❌ 删除失败：${error}`)
    }
  }

  const clearDB = async () => {
    if (!confirm('确定要清空所有数据吗？')) return
    
    try {
      log(' 清空数据库...')
      await db.records.clear()
      log('✅ 数据库已清空')
    } catch (error) {
      log(`❌ 清空失败：${error}`)
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#00F0FF' }}>
        🔐 加密验证测试页面
      </h1>

      {/* 加密测试区域 */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        backgroundColor: 'rgba(0, 240, 255, 0.05)', 
        borderRadius: '12px',
        border: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
        <h2 style={{ color: '#00F0FF', marginBottom: '16px', fontSize: '18px' }}>
          🧪 加密解密测试
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={testEncryptionFlow}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00F0FF',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔐 测试加密解密流程
          </button>
          <button
            onClick={testDBEncryption}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00F0FF',
              border: '1px solid #00F0FF',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🗄️ 测试数据库加密存储
          </button>
          <button
            onClick={showEncryptionInfo}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00F0FF',
              border: '1px solid #00F0FF',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📊 查看加密信息
          </button>
        </div>

        {/* 加密测试结果展示 */}
        {encryptionTest.original && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <div style={{ color: '#22c55e', fontSize: '12px', marginBottom: '8px' }}>📤 原始数据</div>
              <div style={{ fontSize: '11px', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto' }}>
                {JSON.stringify(encryptionTest.original, null, 2)}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>🔒 加密密文</div>
              <div style={{ fontSize: '11px', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto', fontFamily: 'monospace' }}>
                {encryptionTest.encrypted}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ color: '#3b82f6', fontSize: '12px', marginBottom: '8px' }}>
                🔓 解密数据 {encryptionTest.integrity !== undefined && (encryptionTest.integrity ? '✅' : '❌')}
              </div>
              <div style={{ fontSize: '11px', wordBreak: 'break-all', maxHeight: '150px', overflow: 'auto' }}>
                {encryptionTest.decrypted && JSON.stringify(encryptionTest.decrypted, null, 2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 数据库操作区域 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#00F0FF', marginBottom: '16px', fontSize: '18px' }}>
          📦 数据库操作
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={testCreate}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00F0FF',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ➕ 创建测试数据
          </button>
          <button
            onClick={testFindAll}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00F0FF',
              border: '1px solid #00F0FF',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📋 查询所有记录
          </button>
          <button
            onClick={testTodayStats}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00F0FF',
              border: '1px solid #00F0FF',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📊 查询今日统计
          </button>
          <button
            onClick={viewRawEncryptedData}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔍 查看原始加密数据
          </button>
          <button
            onClick={testDelete}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🗑️ 删除记录
          </button>
          <button
            onClick={clearDB}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🧹 清空数据库
          </button>
          <button
            onClick={clearLog}
            style={{
              padding: '12px 24px',
              backgroundColor: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🧻 清空日志
          </button>
        </div>
      </div>

      {/* 日志输出区域 */}
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
        <div style={{ color: '#9ca3af', marginBottom: '8px' }}>📝 日志输出:</div>
        {result || '点击上方按钮执行测试操作...'}
      </div>

      {/* 原始加密数据展示区域 */}
      {rawEncryptedData.length > 0 && (
        <div style={{ 
          marginTop: '24px', 
          padding: '20px', 
          backgroundColor: 'rgba(251, 191, 36, 0.05)', 
          borderRadius: '12px',
          border: '1px solid rgba(251, 191, 36, 0.2)'
        }}>
          <h3 style={{ color: '#fbbf24', marginBottom: '16px', fontSize: '16px' }}>
            📦 IndexedDB 原始加密数据 (共 {rawEncryptedData.length} 条)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rawEncryptedData.map((record, index) => (
              <div key={record.id} style={{ 
                padding: '12px', 
                backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                borderRadius: '8px' 
              }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ color: '#fbbf24' }}>ID: {record.id}</span>
                  <span style={{ color: '#9ca3af' }}>加密版本: {record.encryption_version}</span>
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  <div style={{ color: '#ef4444', marginBottom: '4px' }}>🔒 加密数据 (格式: IV:密文)</div>
                  <div style={{ color: '#e5e7eb' }}>{record.encrypted_data}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 验证提示 */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <h3 style={{ color: '#3b82f6', marginBottom: '12px' }}>🔍 如何验证数据加密存储</h3>
        <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
          <div>1. 打开浏览器开发者工具 (F12)</div>
          <div>2. 切换到 Application 面板</div>
          <div>3. 在左侧找到 IndexedDB &gt; rxlens-db &gt; records</div>
          <div>4. 查看数据，可以看到 data 字段是加密后的密文格式: "IV:密文"</div>
          <div>5. 密文无法直接阅读，只有使用正确密钥才能解密</div>
        </div>
      </div>
    </div>
  )
}
