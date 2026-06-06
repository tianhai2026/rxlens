'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Loader2, CheckCircle } from 'lucide-react'
import { compressImage } from '@/lib/imageUtils'

export interface OCRResult {
  type: '处方' | '小票'
  patientName?: string
  doctorName?: string
  storeName?: string
  items: { name: string; qty: number; price: number }[]
  attachment_base64?: string // 添加图片base64数据
}

interface ImageUploaderProps {
  onOCRComplete: (result: OCRResult) => void
  onClose: () => void
}

// OCR日志记录器
const ocrLogger = {
  log: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      stage,
      message,
      data: data || null
    }
    
    return logEntry
  },
  
  error: (stage: string, error: Error | string, context?: any) => {
    const timestamp = new Date().toISOString()
    const errorInfo = typeof error === 'string' ? { message: error } : error
    
    return {
      timestamp,
      stage,
      error: errorInfo.message,
      stack: error instanceof Error ? error.stack : null,
      context
    }
  }
}

export default function ImageUploader({ onOCRComplete, onClose }: ImageUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sessionId] = useState(() => `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // 处理图片文件
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      ocrLogger.error('file_validation', `文件类型不正确: ${file.type}`)
      alert('请选择图片文件')
      return
    }

    ocrLogger.log('file_selected', `用户选择图片文件`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      sessionId
    })

    try {
      const compressedImage = await compressImage(file, 1920, 0.7)
      ocrLogger.log('image_compressed', `图片压缩完成`, {
        originalSize: `${(file.size / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedImage.length / 1024).toFixed(2)} KB`,
        compressionRatio: `${Math.round((1 - compressedImage.length / (file.size * 1.33)) * 100)}%`
      })
      setUploadedImage(compressedImage)
      processImage(compressedImage)
    } catch (error) {
      ocrLogger.error('image_compression', `图片压缩失败`, { error })
      // 压缩失败时使用原始图片
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        ocrLogger.log('image_read', `图片读取完成(压缩失败回退)`, {
          dataSize: imageData.length,
          isBase64: imageData.startsWith('data:image/')
        })
        setUploadedImage(imageData)
        processImage(imageData)
      }
      reader.onerror = (error) => {
        ocrLogger.error('image_read', `图片读取失败`, { error })
        alert('图片读取失败，请重试')
      }
      reader.readAsDataURL(file)
    }
  }, [sessionId])

  // 处理图片并调用OCR
  const processImage = useCallback(async (imageData: string) => {
    const totalStartTime = Date.now()
    
    // OCR识别开始 - 关键节点日志
    ocrLogger.log('ocr_start', `[关键节点] OCR识别流程开始`, { 
      sessionId,
      timestamp: new Date().toISOString(),
      imageDataSize: `${(imageData.length / 1024).toFixed(2)} KB`
    })
    
    setIsLoading(true)
    setProgress(0)

    // 模拟进度
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 300)

    try {
      // 提取base64数据（去掉data:image/xxx;base64,前缀）
      const extractStartTime = Date.now()
      const base64Data = imageData.split(',')[1]
      const extractTime = Date.now() - extractStartTime
      
      // 数据预处理完成日志
      ocrLogger.log('ocr_preprocess_complete', '[关键节点] 图片数据预处理完成', {
        base64Size: base64Data?.length || 0,
        base64SizeKB: `${((base64Data?.length || 0) / 1024).toFixed(2)} KB`,
        extractTime: `${extractTime}ms`,
        elapsedTime: `${Date.now() - totalStartTime}ms`,
        timestamp: new Date().toISOString()
      })

      // 准备发送API请求 - 关键节点日志
      ocrLogger.log('api_request_prepare', '[关键节点] 准备发送OCR API请求', {
        endpoint: '/api/ocr',
        requestSize: `${(JSON.stringify({ imageBase64: base64Data, type: 'prescription' }).length / 1024).toFixed(2)} KB`,
        timestamp: new Date().toISOString()
      })

      const apiStartTime = Date.now()
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          type: 'prescription',
        }),
      })
      const responseTime = Date.now() - apiStartTime

      // API响应返回 - 关键节点日志
      ocrLogger.log('api_response_received', '[关键节点] OCR API响应返回', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        ok: response.ok,
        elapsedTime: `${Date.now() - totalStartTime}ms`,
        timestamp: new Date().toISOString()
      })

      const parseStartTime = Date.now()
      const result = await response.json()
      const parseTime = Date.now() - parseStartTime

      // 响应解析完成日志
      ocrLogger.log('response_parsed', '[关键节点] 响应JSON解析完成', {
        parseTime: `${parseTime}ms`,
        hasSuccessField: 'success' in result,
        isSuccess: result.success === true,
        elapsedTime: `${Date.now() - totalStartTime}ms`,
        timestamp: new Date().toISOString()
      })

      if (result.success) {
        setProgress(100)
        clearInterval(progressInterval)

        // OCR识别成功 - 关键节点日志
        ocrLogger.log('ocr_success', '[关键节点] OCR识别成功', {
          type: result.data.type,
          itemsCount: result.data.items.length,
          patientName: result.data.patientName,
          doctorName: result.data.doctorName,
          storeName: result.data.storeName,
          processingTime: result.processingTime,
          apiResponseTime: `${responseTime}ms`,
          totalProcessingTime: `${Date.now() - totalStartTime}ms`,
          items: result.data.items,
          timestamp: new Date().toISOString()
        })

        // 验证识别结果格式
        if (!result.data.items || !Array.isArray(result.data.items)) {
          throw new Error('识别结果格式错误：items不是数组')
        }
        
        if (result.data.items.length === 0) {
          ocrLogger.log('ocr_warning', `OCR识别结果为空`, { sessionId })
        }

        // 延迟一下显示完成状态
        setTimeout(() => {
          ocrLogger.log('data_transfer', `开始将识别数据传递给表单`, {
            itemNames: result.data.items.map((item: any) => item.name),
            totalAmount: result.data.items.reduce((sum: number, item: any) => sum + item.qty * item.price, 0),
            hasAttachment: !!uploadedImage
          })
          // 将图片base64数据包含在OCR结果中
          onOCRComplete({
            ...result.data,
            attachment_base64: uploadedImage
          })
        }, 500)
      } else {
        ocrLogger.error('ocr_failure', result.message || 'OCR识别失败', {
          response: result,
          sessionId
        })
        throw new Error(result.message || 'OCR识别失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      ocrLogger.error('ocr_exception', errorMessage, {
        error,
        sessionId,
        stack: error instanceof Error ? error.stack : null
      })
      alert('OCR识别失败，请重试')
      setIsLoading(false)
      setProgress(0)
      clearInterval(progressInterval)
    }
  }, [onOCRComplete, sessionId])

  // 拍照
  const handleCamera = useCallback(() => {
    ocrLogger.log('user_action', `用户点击拍照按钮`, { sessionId })
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [sessionId])

  // 文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  // 清除图片
  const handleClear = useCallback(() => {
    ocrLogger.log('user_action', `用户清除图片`, { sessionId })
    setUploadedImage(null)
    setIsLoading(false)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [sessionId])

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      ocrLogger.log('user_action', `用户拖拽上传图片`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        sessionId
      })
      handleFile(file)
    }
  }, [handleFile, sessionId])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  // 组件挂载日志
  useState(() => {
    ocrLogger.log('component_init', `图片上传组件初始化`, { sessionId })
  })

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      animation: 'fadeIn 0.3s ease'
    }}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* 关闭按钮 */}
      <button
        onClick={() => {
          ocrLogger.log('user_action', `用户关闭上传界面`, { sessionId })
          onClose()
        }}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
      >
        <X style={{ width: '20px', height: '20px' }} />
      </button>

      <h2 style={{
        color: '#fff',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '8px'
      }}>
        上传处方/小票照片
      </h2>
      <p style={{
        color: '#9ca3af',
        fontSize: '14px',
        marginBottom: '32px'
      }}>
        支持拍照或上传图片，系统将自动识别药品信息
      </p>

      {/* 上传区域 */}
      {!uploadedImage ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            width: '100%',
            maxWidth: '400px',
            height: '280px',
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backgroundColor: 'rgba(26, 26, 26, 0.5)'
          }}
          onClick={handleCamera}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#00F0FF'
            e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.backgroundColor = 'rgba(26, 26, 26, 0.5)'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <Camera style={{ color: '#00F0FF', width: '36px', height: '36px' }} />
          </div>
          <p style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
            点击拍照或上传
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>
            支持 JPG、PNG 格式，最大 10MB
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            color: '#9ca3af',
            fontSize: '12px'
          }}>
            <Upload style={{ width: '14px', height: '14px' }} />
            <span>拖拽图片到此处也可上传</span>
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}>
          {/* 图片预览 */}
          <div style={{ position: 'relative' }}>
            <img
              src={uploadedImage}
              alt="上传的图片"
              style={{
                width: '100%',
                height: '280px',
                objectFit: 'cover'
              }}
            />
            
            {/* 扫描动画遮罩 */}
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* 扫描线 */}
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
                  boxShadow: '0 0 20px #00F0FF, 0 0 40px #00F0FF',
                  animation: 'scanLine 1.5s ease-in-out infinite',
                  position: 'absolute',
                  top: '30%'
                }} />
                
                {/* 加载图标 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  zIndex: 1
                }}>
                  {progress < 100 ? (
                    <>
                      <Loader2 
                        style={{ 
                          color: '#00F0FF', 
                          width: '48px', 
                          height: '48px',
                          animation: 'spin 1s linear infinite'
                        }} 
                      />
                      <p style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '500' }}>
                        正在识别中...
                      </p>
                      <div style={{
                        width: '200px',
                        height: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, #00F0FF, #00f0ff88)',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                        {Math.round(progress)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle 
                        style={{ 
                          color: '#10b981', 
                          width: '48px', 
                          height: '48px',
                          animation: 'popIn 0.5s ease'
                        }} 
                      />
                      <p style={{ color: '#10b981', fontSize: '16px', fontWeight: '500' }}>
                        识别完成！
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* 清除按钮 */}
            {!isLoading && (
              <button
                onClick={handleClear}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            )}
          </div>
          
          {/* 操作按钮 */}
          {!isLoading && (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(26, 26, 26, 0.9)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d1d5db',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
              >
                重新选择
              </button>
              <button
                onClick={() => processImage(uploadedImage!)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00F0FF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.25)'}
              >
                开始识别
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS动画 */}
      <style>{`
        @keyframes scanLine {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}