'use client'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { DollarSign, FileText, Scan, Camera, Settings, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useDatabaseRecords, useTodayStats } from '@/hooks/useDatabase'
import GlassPreviewForm, { type PreviewFormData } from '@/components/GlassPreviewForm'
import ImageUploader, { type OCRResult } from '@/components/ImageUploader'
import AnalyticsChart from '@/components/AnalyticsChart'
import { compressImage } from '@/lib/imageUtils'

export default function HomePage() {
  const [showPreview, setShowPreview] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [ocrData, setOcrData] = useState<OCRResult | null>(null)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const totalAmountRef = useRef<HTMLParagraphElement>(null)
  const prevTotalAmountRef = useRef(0)
  
  const { records, state: recordsState, createRecord } = useDatabaseRecords()
  const { totalAmount, prescriptionCount, refresh: refreshStats } = useTodayStats()

  // CountUp 动画
  useEffect(() => {
    if (totalAmount !== prevTotalAmountRef.current) {
      const startValue = prevTotalAmountRef.current
      const endValue = totalAmount
      const duration = 800
      const startTime = performance.now()
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = startValue + (endValue - startValue) * easeOut
        
        if (totalAmountRef.current) {
          totalAmountRef.current.textContent = `¥${currentValue.toFixed(2)}`
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          prevTotalAmountRef.current = endValue
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [totalAmount])

  const handleCameraFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setIsCameraLoading(false)
      return
    }

    try {
      const compressedBase64 = await compressImage(file, 1920, 0.7)
      setOcrData({
        type: '处方',
        items: [],
        attachment_base64: compressedBase64
      })
      setIsCameraLoading(false)
      setShowPreview(true)
      
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      setIsCameraLoading(false)
      alert('图片处理失败，请重试')
    }
  }, [])

  const openCamera = useCallback(() => {
    setIsCameraLoading(true)
    setTimeout(() => {
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
      } else {
        setIsCameraLoading(false)
      }
    }, 100)
  }, [])

  const handleOCRComplete = (result: OCRResult) => {
    setOcrData(result)
    setShowUploader(false)
    setShowPreview(true)
  }

  const handlePreviewConfirm = async (data: PreviewFormData) => {
    try {
      const recordData = {
        type: data.type,
        items: data.items.map(item => ({
          name: item.name,
          qty: item.quantity,
          price: item.price
        })),
        total: data.total,
        patientName: data.patientName,
        doctorName: data.doctorName,
        storeName: data.storeName,
        attachment_base64: data.attachment_base64
      }
      
      await createRecord(recordData)
      await refreshStats()
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    } catch (error) {
      throw error
    }
  }

  const todayRecords = useMemo(() => {
    const today = new Date().toDateString()
    return records.filter(r => new Date(r.timestamp).toDateString() === today)
  }, [records])

  return (
    <div style={{ 
      backgroundColor: '#0a0a0f', 
      minHeight: '100vh', 
      fontFamily: 'Inter, system-ui, sans-serif' 
    }}>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraFileSelect}
        style={{ display: 'none' }}
      />

      <header style={{ 
        padding: '16px 16px 20px',
        borderBottom: '1px solid #1a1a1a'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', maxWidth: '320px' }}>
            <div style={{ 
              backgroundColor: 'rgba(26, 26, 26, 0.85)', 
              borderRadius: '12px', 
              padding: '14px', 
              border: '1px solid rgba(0, 240, 255, 0.15)',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>今日总金额</p>
                  <p 
                    ref={totalAmountRef}
                    style={{ 
                      color: '#00F0FF', 
                      fontSize: '22px', 
                      fontWeight: 'bold', 
                      margin: '4px 0 0',
                      textShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
                      transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
                      transform: isAnimating ? 'scale(1.1)' : 'scale(1)'
                    }}>
                    ¥{totalAmount.toFixed(2)}
                  </p>
                </div>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(0, 240, 255, 0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 240, 255, 0.2)'
                }}>
                  <DollarSign style={{ color: '#00F0FF', width: '22px', height: '22px' }} />
                </div>
              </div>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(26, 26, 26, 0.85)', 
              borderRadius: '12px', 
              padding: '14px', 
              border: '1px solid rgba(34, 197, 94, 0.15)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>处方数量</p>
                  <p style={{ 
                    color: '#22c55e', 
                    fontSize: '22px', 
                    fontWeight: 'bold', 
                    margin: '4px 0 0',
                    textShadow: '0 0 20px rgba(34, 197, 94, 0.6)',
                    transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
                    transform: isAnimating ? 'scale(1.1)' : 'scale(1)'
                  }}>
                    {prescriptionCount}
                  </p>
                </div>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(34, 197, 94, 0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <FileText style={{ color: '#22c55e', width: '22px', height: '22px' }} />
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ 
              color: '#00F0FF', 
              fontSize: '11px', 
              fontWeight: '600', 
              textShadow: '0 0 10px rgba(0, 240, 255, 0.5)',
              letterSpacing: '1px',
              padding: '4px 8px',
              backgroundColor: 'rgba(0, 240, 255, 0.05)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 240, 255, 0.15)'
            }}>
              v4.0.0
            </span>
            <Link href="/settings">
              <button style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(26, 26, 26, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.3), 0 0 0 rgba(0, 240, 255, 0.1)'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)'
                  e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.06)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.15)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.backgroundColor = 'rgba(26, 26, 26, 0.85)'
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.3), 0 0 0 rgba(0, 240, 255, 0.1)'
                }}
              >
                <Settings style={{ color: '#9ca3af', width: '18px', height: '18px' }} />
                <span style={{ color: '#d1d5db', fontSize: '14px', fontWeight: '500' }}>设置</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main style={{ 
        flex: 1, 
        padding: '24px 16px',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        gap: '24px',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          width: '100%'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '24px' 
          }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <button
                onClick={() => setShowUploader(true)}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.03))',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.35s',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 rgba(0, 240, 255, 0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#00F0FF'
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 35px rgba(0, 240, 255, 0.3)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)'
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 rgba(0, 240, 255, 0.1)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <Scan style={{ color: '#00F0FF', width: '48px', height: '48px', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))' }} />
                <span style={{ color: '#00F0FF', fontSize: '14px', fontWeight: 'bold', marginTop: '8px', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>扫码录入</span>
              </button>
              
              <button
                onClick={openCamera}
                disabled={isCameraLoading}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: isCameraLoading 
                    ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(0, 240, 255, 0.08))'
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.03))',
                  border: isCameraLoading 
                    ? '2px solid #00F0FF'
                    : '2px solid rgba(34, 197, 94, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isCameraLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.35s',
                  boxShadow: isCameraLoading 
                    ? '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 240, 255, 0.4)'
                    : '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 rgba(34, 197, 94, 0.1)'
                }}
                onMouseEnter={e => {
                  if (!isCameraLoading) {
                    e.currentTarget.style.borderColor = '#22c55e'
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 35px rgba(34, 197, 94, 0.3)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isCameraLoading) {
                    e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)'
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 rgba(34, 197, 94, 0.1)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                {isCameraLoading ? (
                  <>
                    <Loader2 
                      style={{ 
                        color: '#00F0FF', 
                        width: '48px', 
                        height: '48px',
                        animation: 'spin 1s linear infinite',
                        filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))'
                      }} 
                    />
                    <span style={{ color: '#00F0FF', fontSize: '14px', fontWeight: 'bold', marginTop: '8px', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>获取中...</span>
                  </>
                ) : (
                  <>
                    <Camera style={{ color: '#22c55e', width: '48px', height: '48px', filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))' }} />
                    <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold', marginTop: '8px', textShadow: '0 0 15px rgba(34, 197, 94, 0.5)' }}>直接拍照</span>
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={() => setShowPreview(true)}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'rgba(26, 26, 26, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 rgba(0, 240, 255, 0.1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)'
                e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 240, 255, 0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.backgroundColor = 'rgba(26, 26, 26, 0.85)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 rgba(0, 240, 255, 0.1)'
              }}
            >
              <FileText style={{ color: '#9ca3af', width: '18px', height: '18px' }} />
              <span style={{ color: '#d1d5db', fontSize: '15px', fontWeight: '500' }}>手动录入</span>
            </button>
            
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
              点击扫码、拍照或手动录入处方或小票
            </p>
          </div>

          <AnalyticsChart />
        </div>

        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>今日明细</h3>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>{todayRecords.length} 条记录</span>
          </div>
          
          {recordsState.status === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(26, 26, 26, 0.85)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#00F0FF',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 14px'
              }} />
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>加载中...</p>
            </div>
          ) : records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayRecords.slice(0, 10).map(record => (
                <div key={record.id} style={{ 
                  backgroundColor: 'rgba(26, 26, 26, 0.85)', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 15px rgba(0, 0, 0, 0.2), 0 0 0 rgba(0, 240, 255, 0.05)'
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.25), 0 0 10px rgba(0, 240, 255, 0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.2), 0 0 0 rgba(0, 240, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 'medium', fontSize: '14px', margin: 0 }}>{record.patientName || record.storeName}</p>
                      <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
                        {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <span style={{ color: '#00F0FF', fontWeight: 'bold', fontSize: '16px', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>¥{record.total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {record.items.map((item, index) => (
                      <span key={index} style={{ backgroundColor: 'rgba(55, 65, 81, 0.6)', padding: '4px 10px', borderRadius: '6px', color: '#d1d5db', fontSize: '11px' }}>
                        {item.name} x{item.qty}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px', backgroundColor: 'rgba(26, 26, 26, 0.85)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)' }}>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>暂无记录</p>
              <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '6px' }}>点击上方按钮开始录入</p>
            </div>
          )}
        </div>
      </main>

      {showUploader && (
        <ImageUploader 
          onOCRComplete={handleOCRComplete} 
          onClose={() => setShowUploader(false)} 
        />
      )}

      <GlassPreviewForm
        isOpen={showPreview}
        initialData={ocrData || undefined}
        onConfirm={handlePreviewConfirm}
        onClose={() => {
          setShowPreview(false)
          setOcrData(null)
        }}
        onSuccess={() => {
          setShowPreview(false)
          setOcrData(null)
        }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (min-width: 1024px) {
          main {
            flex-direction: row !important;
          }
          main > div:first-child {
            width: 60% !important;
          }
          main > div:last-child {
            width: 40% !important;
            max-height: calc(100vh - 150px);
            overflow-y: auto;
          }
        }
        
        @media (max-width: 768px) {
          header {
            padding: 12px 12px 16px !important;
          }
          header > div {
            flex-direction: column !important;
            gap: 14px !important;
            align-items: flex-start !important;
          }
          header > div > div:first-child {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
