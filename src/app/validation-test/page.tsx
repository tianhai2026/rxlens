'use client'

import { useState } from 'react'
import GlassPreviewForm, { type PreviewFormData } from '@/components/GlassPreviewForm'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'

// 测试场景定义
interface TestCase {
  id: string
  name: string
  description: string
  expected: 'warning' | 'normal'
  data: Partial<PreviewFormData>
}

const testCases: TestCase[] = [
  {
    id: '1',
    name: '正常场景',
    description: '数量×单价 = 金额，应该无警告',
    expected: 'normal',
    data: {
      type: '处方',
      patientName: '张三',
      doctorName: '李医生',
      items: [
        { name: '阿莫西林胶囊', quantity: 2, price: 15.5, amount: 31.0 }
      ],
      total: 31.0
    }
  },
  {
    id: '2',
    name: '金额偏少',
    description: '数量×单价 = 31.0，但金额填写 30.0，应该警告',
    expected: 'warning',
    data: {
      type: '处方',
      patientName: '李四',
      doctorName: '王医生',
      items: [
        { name: '布洛芬缓释胶囊', quantity: 2, price: 15.5, amount: 30.0 }
      ],
      total: 30.0
    }
  },
  {
    id: '3',
    name: '金额偏多',
    description: '数量×单价 = 31.0，但金额填写 32.0，应该警告',
    expected: 'warning',
    data: {
      type: '处方',
      patientName: '王五',
      doctorName: '赵医生',
      items: [
        { name: '维生素C片', quantity: 2, price: 15.5, amount: 32.0 }
      ],
      total: 32.0
    }
  },
  {
    id: '4',
    name: '小数精度差异',
    description: '数量×单价 = 15.675，但金额填写 15.67，应该警告（精度差异 > 0.01）',
    expected: 'warning',
    data: {
      type: '小票',
      storeName: '康佰家大药房',
      items: [
        { name: '板蓝根颗粒', quantity: 3, price: 5.225, amount: 15.67 }
      ],
      total: 15.67
    }
  },
  {
    id: '5',
    name: '小数精度可接受',
    description: '数量×单价 = 15.675，但金额填写 15.67，应该警告（精度差异 > 0.01）',
    expected: 'warning',
    data: {
      type: '小票',
      storeName: '老百姓大药房',
      items: [
        { name: '感冒灵颗粒', quantity: 2, price: 7.835, amount: 15.67 }
      ],
      total: 15.67
    }
  },
  {
    id: '6',
    name: '数量为0',
    description: '数量=0，单价=15.5，金额=0，应该无警告',
    expected: 'normal',
    data: {
      type: '处方',
      patientName: '赵六',
      doctorName: '陈医生',
      items: [
        { name: '阿莫西林胶囊', quantity: 0, price: 15.5, amount: 0 }
      ],
      total: 0
    }
  },
  {
    id: '7',
    name: '单价为0',
    description: '数量=2，单价=0，金额=0，应该无警告',
    expected: 'normal',
    data: {
      type: '处方',
      patientName: '钱七',
      doctorName: '刘医生',
      items: [
        { name: '布洛芬缓释胶囊', quantity: 2, price: 0, amount: 0 }
      ],
      total: 0
    }
  },
  {
    id: '8',
    name: '多行混合场景',
    description: '第一行正常，第二行金额不匹配，应该警告第二行',
    expected: 'warning',
    data: {
      type: '处方',
      patientName: '孙八',
      doctorName: '黄医生',
      items: [
        { name: '阿莫西林胶囊', quantity: 2, price: 15.5, amount: 31.0 },
        { name: '布洛芬缓释胶囊', quantity: 1, price: 28.0, amount: 27.5 }
      ],
      total: 58.5
    }
  },
  {
    id: '9',
    name: '极端差异',
    description: '数量×单价 = 100.0，但金额填写 0.01，应该警告',
    expected: 'warning',
    data: {
      type: '小票',
      storeName: '益丰大药房',
      items: [
        { name: '高价药品', quantity: 10, price: 10.0, amount: 0.01 }
      ],
      total: 0.01
    }
  },
  {
    id: '10',
    name: '边界值测试',
    description: '数量×单价 = 100.01，金额填写 100.02，差异 0.01，应该警告',
    expected: 'warning',
    data: {
      type: '处方',
      patientName: '周九',
      doctorName: '吴医生',
      items: [
        { name: '精密药品', quantity: 1, price: 100.01, amount: 100.02 }
      ],
      total: 100.02
    }
  },
  {
    id: '11',
    name: '边界值可接受',
    description: '数量×单价 = 100.005，金额填写 100.00，差异 0.005，应该无警告',
    expected: 'normal',
    data: {
      type: '小票',
      storeName: '一心堂大药房',
      items: [
        { name: '精密药品2', quantity: 1, price: 100.005, amount: 100.00 }
      ],
      total: 100.00
    }
  },
  {
    id: '12',
    name: '多行全部正常',
    description: '所有行都正常，应该无警告',
    expected: 'normal',
    data: {
      type: '处方',
      patientName: '郑十',
      doctorName: '郑医生',
      items: [
        { name: '阿莫西林胶囊', quantity: 2, price: 15.5, amount: 31.0 },
        { name: '布洛芬缓释胶囊', quantity: 1, price: 28.0, amount: 28.0 },
        { name: '维生素C片', quantity: 3, price: 12.0, amount: 36.0 }
      ],
      total: 95.0
    }
  }
]

export default function ValidationTestPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({})

  const handleTest = (testCase: TestCase) => {
    setSelectedCase(testCase)
    setShowForm(true)
    setTestResults(prev => ({ ...prev, [testCase.id]: 'pending' }))
  }

  const handleFormConfirm = (data: PreviewFormData) => {
    // 检查是否有金额不匹配
    const hasMismatch = data.items.some(item => {
      const expected = Math.round(item.quantity * item.price * 100) / 100
      return Math.abs(item.amount - expected) > 0.01
    })

    const expected = selectedCase?.expected === 'warning'
    const actual = hasMismatch

    const result = expected === actual ? 'pass' : 'fail'
    setTestResults(prev => ({ ...prev, [selectedCase!.id]: result }))

    
  }

  const resetTests = () => {
    setTestResults({})
    setSelectedCase(null)
  }

  const runAllTests = async () => {
    setTestResults({})
    for (const testCase of testCases) {
      await new Promise(resolve => setTimeout(resolve, 500))
      handleTest(testCase)
      // 等待用户手动关闭表单后继续
      break
    }
  }

  const getTestCount = () => {
    const passed = Object.values(testResults).filter(r => r === 'pass').length
    const failed = Object.values(testResults).filter(r => r === 'fail').length
    const pending = Object.values(testResults).filter(r => r === 'pending').length
    return { passed, failed, pending, total: testCases.length }
  }

  const { passed, failed, pending, total } = getTestCount()

  return (
    <div style={{ padding: '24px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#00F0FF' }}>
        🧪 金额校验功能测试
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
        测试数量×单价与金额的校验逻辑
      </p>

      {/* 测试统计 */}
      <div style={{
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#00F0FF', fontSize: '18px', margin: 0 }}>测试进度</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={resetTests}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#d1d5db',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              重置
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>总测试数</p>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{total}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>通过</p>
            <p style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold' }}>{passed}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>失败</p>
            <p style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>{failed}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>待测试</p>
            <p style={{ color: '#f59e0b', fontSize: '24px', fontWeight: 'bold' }}>{pending}</p>
          </div>
        </div>
      </div>

      {/* 测试用例列表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
        {testCases.map((testCase, index) => {
          const result = testResults[testCase.id]
          const icon = result === 'pass' ? <CheckCircle style={{ color: '#10b981', width: '18px', height: '18px' }} />
            : result === 'fail' ? <XCircle style={{ color: '#ef4444', width: '18px', height: '18px' }} />
            : result === 'pending' ? <AlertTriangle style={{ color: '#f59e0b', width: '18px', height: '18px' }} />
            : <Info style={{ color: '#6b7280', width: '18px', height: '18px' }} />

          return (
            <button
              key={testCase.id}
              onClick={() => handleTest(testCase)}
              style={{
                backgroundColor: 'rgba(26, 26, 26, 0.8)',
                border: result === 'pass' ? '1px solid #10b981' 
                  : result === 'fail' ? '1px solid #ef4444'
                  : result === 'pending' ? '1px solid #f59e0b'
                  : '1px solid #333',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#00F0FF'}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = result === 'pass' ? '#10b981'
                  : result === 'fail' ? '#ef4444'
                  : result === 'pending' ? '#f59e0b'
                  : '#333'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    color: '#6b7280', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ 
                    color: '#fff', 
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {testCase.name}
                  </span>
                </div>
                {icon}
              </div>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                {testCase.description}
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{ 
                  color: testCase.expected === 'warning' ? '#f59e0b' : '#10b981',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  预期: {testCase.expected === 'warning' ? '⚠️ 警告' : '✅ 正常'}
                </span>
                <span style={{ 
                  color: '#6b7280',
                  fontSize: '11px'
                }}>
                  {(testCase.data.items || []).length} 行
                </span>
              </div>
              {/* 显示药品明细 */}
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280' }}>
                {(testCase.data.items || []).map((item, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>
                    {item.name}: {item.quantity} × ¥{item.price} = ¥{item.amount}
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* 测试说明 */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: 'rgba(55, 65, 81, 0.3)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: '#00F0FF', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info style={{ width: '18px', height: '18px' }} />
          测试说明
        </h3>
        <div style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.8' }}>
          <p><strong>测试步骤：</strong></p>
          <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>点击任意测试用例按钮</li>
            <li>观察弹出表单中的金额字段</li>
            <li>检查是否有红色边框和警告图标</li>
            <li>关闭表单后查看测试结果</li>
          </ol>
          <p style={{ marginTop: '12px' }}><strong>校验规则：</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>当 |数量×单价 - 金额| &gt; 0.01 时触发警告</li>
            <li>警告时金额输入框显示红色边框和图标</li>
            <li>底部显示警告提示信息</li>
            <li>警告时禁用提交按钮</li>
          </ul>
        </div>
      </div>

      {/* 毛玻璃表单 */}
      <GlassPreviewForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onConfirm={handleFormConfirm}
        initialData={selectedCase?.data}
      />
    </div>
  )
}