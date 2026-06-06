'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface PreviewItem {
  name: string
  quantity: number
  price: number
  amount: number
}

export interface PreviewFormData {
  type: '处方' | '小票'
  items: PreviewItem[]
  total: number
  patientName?: string
  doctorName?: string
  storeName?: string
  attachment_base64?: string
}

interface OCRResult {
  type?: '处方' | '小票'
  patientName?: string
  doctorName?: string
  storeName?: string
  items?: { name: string; qty: number; price: number }[]
  attachment_base64?: string
}

interface GlassPreviewFormProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: PreviewFormData) => Promise<void> | void
  initialData?: Partial<PreviewFormData> | OCRResult
  onSuccess?: () => void
}

export default function GlassPreviewForm({
  isOpen,
  onClose,
  onConfirm,
  initialData,
  onSuccess
}: GlassPreviewFormProps) {
  const [type, setType] = useState<'处方' | '小票'>('处方')
  const [items, setItems] = useState<PreviewItem[]>([
    { name: '', quantity: 1, price: 0, amount: 0 }
  ])
  const [patientName, setPatientName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [attachment_base64, setAttachment_base64] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && initialData) {
      setType(initialData.type || '处方')
      setAttachment_base64(initialData.attachment_base64)
      
      const transformedItems = (initialData.items || []).map(item => {
        const quantity = (item as any).qty !== undefined ? (item as any).qty : (item as PreviewItem).quantity
        const price = (item as any).price !== undefined ? (item as any).price : (item as PreviewItem).price
        return {
          name: (item as any).name || '',
          quantity: typeof quantity === 'number' ? quantity : 1,
          price: typeof price === 'number' ? price : 0,
          amount: (typeof quantity === 'number' ? quantity : 1) * (typeof price === 'number' ? price : 0)
        } as PreviewItem
      })
      
      setItems(transformedItems.length > 0 ? transformedItems : [{ name: '', quantity: 1, price: 0, amount: 0 }])
      setPatientName(initialData.patientName || '')
      setDoctorName(initialData.doctorName || '')
      setStoreName(initialData.storeName || '')
    }
  }, [isOpen, initialData])

  // 粒子特效
  const createParticles = () => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '10'
    containerRef.current.appendChild(canvas)
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      color: string
    }> = []
    const particleCount = Math.floor((rect.width * rect.height) / 800)
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        size: Math.random() * 5 + 2,
        opacity: Math.random() * 0.9 + 0.1,
        color: '#00F0FF'
      })
    }
    
    const startTime = performance.now()
    const duration = 600
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      ctx.clearRect(0, 0, rect.width, rect.height)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2
        p.opacity = Math.max(0, 1 - progress)
        p.size *= (1 - progress * 0.3)
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
        
        // 添加发光效果
        ctx.shadowColor = p.color
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      })
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        containerRef.current?.removeChild(canvas)
      }
    }
    
    requestAnimationFrame(animate)
  }

  const calculateItemAmount = (quantity: number, price: number): number => {
    return Math.round(quantity * price * 100) / 100
  }

  const updateItem = (index: number, field: keyof PreviewItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      
      const updated = { ...item, [field]: value }
      
      if (field === 'quantity' || field === 'price') {
        updated.amount = calculateItemAmount(updated.quantity, updated.price)
      }
      
      return updated
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1, price: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const isAmountMismatch = (item: PreviewItem): boolean => {
    const expected = calculateItemAmount(item.quantity, item.price)
    return Math.abs(item.amount - expected) > 0.01
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0)

  const isValid = (): boolean => {
    if (type === '处方') {
      if (!patientName.trim() || !doctorName.trim()) return false
    } else {
      if (!storeName.trim()) return false
    }
    
    if (items.length === 0) return false
    
    for (const item of items) {
      if (!item.name.trim() || item.quantity <= 0 || item.price < 0 || isAmountMismatch(item)) {
        return false
      }
    }
    
    return true
  }

  const handleConfirm = async () => {
    if (!isValid()) return
    
    const submitData = {
      type,
      items,
      total,
      patientName: type === '处方' ? patientName : undefined,
      doctorName: type === '处方' ? doctorName : undefined,
      storeName: type === '小票' ? storeName : undefined,
      attachment_base64: attachment_base64
    }
    
    setIsSubmitting(true)
    
    try {
      await onConfirm(submitData)
      createParticles()
      setTimeout(() => {
        setIsSuccess(true)
      }, 100)
      setTimeout(() => {
        handleClose()
        onSuccess?.()
      }, 700)
    } catch {
    } finally {
      if (!isSuccess) {
        setIsSubmitting(false)
      }
    }
  }

  const handleClose = () => {
    setType('处方')
    setItems([{ name: '', quantity: 1, price: 0, amount: 0 }])
    setPatientName('')
    setDoctorName('')
    setStoreName('')
    setAttachment_base64(undefined)
    setIsSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease'
        }}
      />

      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '85vh',
          backgroundColor: 'rgba(26, 26, 26, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderBottom: 'none',
          boxShadow: '0 -15px 50px rgba(0, 240, 255, 0.12), 0 -4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          transition: isSuccess ? 'transform 0.5s ease-out, opacity 0.5s ease-out' : 'none',
          transform: isSuccess ? 'translateY(100%) scale(0.95)' : 'translateY(0)',
          opacity: isSuccess ? 0 : 1
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '10px 0 6px',
          cursor: 'pointer'
        }} onClick={handleClose}>
          <div style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)'
          }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px 16px',
          borderBottom: '1px solid #222'
        }}>
          <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: '600', margin: 0, textShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }}>
            {type === '处方' ? '处方录入' : '小票录入'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.05)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
          >
            <X style={{ color: '#9ca3af', width: '18px', height: '18px' }} />
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          padding: '16px 20px',
          borderBottom: '1px solid #222'
        }}>
          <button
            onClick={() => setType('处方')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: type === '处方' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(55, 65, 81, 0.5)',
              border: type === '处方' ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: type === '处方' ? '#00F0FF' : '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: type === '处方' ? '0 0 15px rgba(0, 240, 255, 0.2)' : '0 0 10px rgba(0, 0, 0, 0.2)'
            }}
          >
            处方
          </button>
          <button
            onClick={() => setType('小票')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: type === '小票' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(55, 65, 81, 0.5)',
              border: type === '小票' ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: type === '小票' ? '#00F0FF' : '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: type === '小票' ? '0 0 15px rgba(0, 240, 255, 0.2)' : '0 0 10px rgba(0, 0, 0, 0.2)'
            }}
          >
            小票
          </button>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '16px 20px'
        }}>
          {type === '处方' ? (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', display: 'block' }}>患者姓名</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="请输入患者姓名"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', display: 'block' }}>医生姓名</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                  placeholder="请输入医生姓名"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', display: 'block' }}>药店名称</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="请输入药店名称"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#9ca3af', fontSize: '13px' }}>药品明细</label>
              <button
                onClick={addItem}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00F0FF',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 10px rgba(0, 240, 255, 0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.2)'
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.1)'
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.1)'
                }}
              >
                <Plus style={{ width: '14px', height: '14px' }} />
                添加
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                gap: '8px',
                alignItems: 'center'
              }}>
                <div style={{ flex: 2 }}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(index, 'name', e.target.value)}
                    placeholder="药品名称"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                  />
                </div>
                <div style={{ width: '70px' }}>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    placeholder="数量"
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                  />
                </div>
                <div style={{ width: '90px' }}>
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="单价"
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      textAlign: 'right',
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.15)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.03)'
                    }}
                  />
                </div>
                <div style={{ 
                  width: '80px', 
                  textAlign: 'right',
                  padding: '10px 8px',
                  color: isAmountMismatch(item) ? '#ef4444' : '#00F0FF',
                  fontWeight: '500',
                  fontSize: '14px',
                  textShadow: isAmountMismatch(item) ? 'none' : '0 0 10px rgba(0, 240, 255, 0.5)'
                }}>
                  ¥{item.amount.toFixed(2)}
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <Trash2 style={{ color: '#ef4444', width: '14px', height: '14px' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          padding: '16px 20px',
          borderTop: '1px solid #222',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>总计金额</span>
            <span style={{ color: '#00F0FF', fontSize: '22px', fontWeight: 'bold', textShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }}>¥{total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!isValid() || isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              background: isValid() && !isSubmitting 
                ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(0, 240, 255, 0.05))'
                : 'rgba(55, 65, 81, 0.5)',
              border: isValid() && !isSubmitting ? '1px solid rgba(0, 240, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isValid() && !isSubmitting ? '#00F0FF' : '#6b7280',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isValid() && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isValid() && !isSubmitting ? '0 0 20px rgba(0, 240, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : '0 0 10px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={e => {
              if (isValid() && !isSubmitting) {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }
            }}
            onMouseLeave={e => {
              if (isValid() && !isSubmitting) {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #00F0FF',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                保存中...
              </>
            ) : isValid() ? (
              <>
                <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                确认保存
              </>
            ) : (
              <AlertCircle style={{ width: '18px', height: '18px' }} />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (min-width: 768px) {
          div[style*="position: fixed"][style*="bottom: 0"] {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
            width: 90% !important;
            max-width: 600px !important;
            border-radius: 20px !important;
            border-bottom-left-radius: 20px !important;
            border-bottom-right-radius: 20px !important;
            border: 1px solid rgba(0, 240, 255, 0.25) !important;
          }
        }
      `}</style>
    </>
  )
}
