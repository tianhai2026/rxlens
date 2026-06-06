import { NextResponse } from 'next/server'

// Mock OCR识别结果
const mockOcrResults = [
  { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
  { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 },
  { name: '维生素C片', qty: 3, price: 12.0 },
]

const mockPrescriptionData = {
  type: '处方' as const,
  patientName: '张三',
  doctorName: '李医生',
  items: [
    { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
    { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 },
  ],
}

const mockReceiptData = {
  type: '小票' as const,
  storeName: '康佰家大药房',
  items: [
    { name: '板蓝根颗粒', qty: 2, price: 15.6 },
    { name: '感冒灵颗粒', qty: 1, price: 18.5 },
    { name: '维生素C片', qty: 3, price: 12.0 },
  ],
}

// API日志记录器
const apiLogger = {
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

export async function POST(request: Request) {
  const requestId = `ocr-api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    apiLogger.log('request_received', `收到OCR识别请求`, { 
      requestId,
      timestamp: Date.now()
    })

    let body
    try {
      body = await request.json()
      apiLogger.log('body_parsed', `请求体解析成功`, {
        requestId,
        hasImageBase64: !!body.imageBase64,
        type: body.type || '未指定',
        imageBase64Length: body.imageBase64 ? body.imageBase64.length : 0
      })
    } catch (parseError) {
      apiLogger.error('body_parse_error', '请求体解析失败', {
        requestId,
        error: parseError
      })
      return NextResponse.json(
        { error: '请求体解析失败' },
        { status: 400 }
      )
    }

    const { imageBase64, type } = body

    // 参数验证
    if (!imageBase64) {
      apiLogger.error('validation_error', '图片数据为空', {
        requestId,
        receivedType: type,
        hasImageBase64: !!imageBase64
      })
      return NextResponse.json(
        { error: '图片数据不能为空' },
        { status: 400 }
      )
    }

    if (!imageBase64.trim()) {
      apiLogger.error('validation_error', '图片数据为空字符串', {
        requestId,
        type,
        imageBase64Length: imageBase64.length
      })
      return NextResponse.json(
        { error: '图片数据不能为空' },
        { status: 400 }
      )
    }

    apiLogger.log('validation_passed', `参数验证通过，准备开始OCR处理`, {
      requestId,
      type: type || 'prescription',
      imageBase64Size: `${(imageBase64.length / 1024).toFixed(2)} KB`
    })

    // 模拟OCR处理延迟（1.5-3秒）
    const processingTime = 1500 + Math.random() * 1500
    apiLogger.log('processing_start', `开始模拟OCR处理`, {
      requestId,
      estimatedProcessingTime: `${processingTime.toFixed(0)}ms`
    })

    await new Promise(resolve => setTimeout(resolve, processingTime))

    // 根据类型返回不同的mock数据
    let result
    if (type === 'prescription') {
      result = mockPrescriptionData
      apiLogger.log('data_selection', `选择处方类型Mock数据`, { requestId })
    } else if (type === 'receipt') {
      result = mockReceiptData
      apiLogger.log('data_selection', `选择小票类型Mock数据`, { requestId })
    } else {
      // 默认返回药品列表
      result = {
        type: '处方' as const,
        patientName: '',
        doctorName: '',
        storeName: '',
        items: mockOcrResults,
      }
      apiLogger.log('data_selection', `使用默认药品列表数据`, { requestId })
    }

    // 验证结果数据完整性
    const validationErrors: string[] = []
    if (!result.type) validationErrors.push('缺少type字段')
    if (!result.items || !Array.isArray(result.items)) validationErrors.push('items不是有效数组')
    else {
      result.items.forEach((item, index) => {
        if (!item.name) validationErrors.push(`第${index+1}项缺少name`)
        if (typeof item.qty !== 'number') validationErrors.push(`第${index+1}项qty不是数字`)
        if (typeof item.price !== 'number') validationErrors.push(`第${index+1}项price不是数字`)
      })
    }

    if (validationErrors.length > 0) {
      apiLogger.error('data_validation_failed', 'Mock数据验证失败', {
        requestId,
        errors: validationErrors,
        result
      })
      throw new Error('内部数据错误')
    }

    apiLogger.log('processing_complete', `OCR识别处理完成`, {
      requestId,
      type: result.type,
      itemsCount: result.items.length,
      patientName: (result as any).patientName,
      doctorName: (result as any).doctorName,
      storeName: (result as any).storeName,
      actualProcessingTime: `${Math.round(processingTime)}ms`,
      items: result.items.map((item: any) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.qty * item.price
      })),
      totalAmount: result.items.reduce((sum: number, item: any) => sum + item.qty * item.price, 0)
    })

    return NextResponse.json({
      success: true,
      message: 'OCR识别成功',
      data: result,
      processingTime: Math.round(processingTime),
      requestId
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    apiLogger.error('request_failed', errorMessage, {
      requestId,
      error,
      stack: error instanceof Error ? error.stack : null
    })
    return NextResponse.json(
      {
        success: false,
        message: 'OCR识别失败',
        error: errorMessage,
        requestId
      },
      { status: 500 }
    )
  }
}