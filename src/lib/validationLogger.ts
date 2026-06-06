/**
 * 金额校验日志记录服务
 * 用于记录用户在金额输入时的错误类型和详细信息
 */

// 错误类型枚举
export enum ValidationErrorType {
  AMOUNT_TOO_LOW = 'AMOUNT_TOO_LOW',      // 金额低于计算值
  AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH',    // 金额高于计算值
  AMOUNT_ZERO_WHEN_NONZERO = 'AMOUNT_ZERO_WHEN_NONZERO',  // 数量单价不为零时金额为0
  NEGATIVE_AMOUNT = 'NEGATIVE_AMOUNT',    // 金额为负数
  QUANTITY_ZERO = 'QUANTITY_ZERO',        // 数量为0
  NEGATIVE_QUANTITY = 'NEGATIVE_QUANTITY', // 数量为负数
  NEGATIVE_PRICE = 'NEGATIVE_PRICE',      // 单价为负数
  EMPTY_NAME = 'EMPTY_NAME',              // 品名为空
  INVALID_FORMAT = 'INVALID_FORMAT'       // 格式无效
}

// 日志记录接口
export interface ValidationLog {
  id: string
  timestamp: number
  errorType: ValidationErrorType
  itemIndex: number
  quantity: number
  price: number
  amount: number
  expectedAmount: number
  difference: number
  differencePercentage: number | null
  recordType: '处方' | '小票'
  additionalInfo?: string
}

// 统计数据接口
export interface ValidationStats {
  totalErrors: number
  errorsByType: Record<ValidationErrorType, number>
  avgDifference: number
  maxDifference: number
  minDifference: number
  errorsByTimeOfDay: Record<string, number>
  errorsByRecordType: { prescription: number; receipt: number }
}

// 本地存储键名
const STORAGE_KEY = 'rxlens-validation-logs'
const MAX_LOGS = 1000 // 最大日志数量

// 生成唯一ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// 获取错误类型
function getErrorType(
  quantity: number,
  price: number,
  amount: number,
  expectedAmount: number
): ValidationErrorType {
  const difference = amount - expectedAmount
  
  if (amount < 0) return ValidationErrorType.NEGATIVE_AMOUNT
  if (quantity < 0) return ValidationErrorType.NEGATIVE_QUANTITY
  if (price < 0) return ValidationErrorType.NEGATIVE_PRICE
  if (quantity === 0) return ValidationErrorType.QUANTITY_ZERO
  
  if (expectedAmount > 0 && amount === 0) {
    return ValidationErrorType.AMOUNT_ZERO_WHEN_NONZERO
  }
  
  if (difference < -0.01) return ValidationErrorType.AMOUNT_TOO_LOW
  if (difference > 0.01) return ValidationErrorType.AMOUNT_TOO_HIGH
  
  return ValidationErrorType.INVALID_FORMAT
}

// 计算差异百分比
function calculateDifferencePercentage(
  actual: number,
  expected: number
): number | null {
  if (expected === 0) return null
  return Math.round((Math.abs(actual - expected) / expected) * 10000) / 100
}

// 获取当前时间段
function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

// 日志服务类
export class ValidationLogger {
  private logs: ValidationLog[] = []
  
  constructor() {
    this.loadLogs()
  }
  
  // 从本地存储加载日志
  private loadLogs(): void {
    try {
      if (typeof window === 'undefined') {
        this.logs = []
        return
      }
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch {
      this.logs = []
    }
  }
  
  // 保存日志到本地存储
  private saveLogs(): void {
    try {
      if (typeof window === 'undefined') {
        return
      }
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs))
    } catch {
    }
  }
  
  // 记录校验错误
  logValidationError(
    itemIndex: number,
    quantity: number,
    price: number,
    amount: number,
    recordType: '处方' | '小票',
    additionalInfo?: string
  ): ValidationLog {
    const expectedAmount = Math.round(quantity * price * 100) / 100
    const difference = amount - expectedAmount
    const errorType = getErrorType(quantity, price, amount, expectedAmount)
    
    const log: ValidationLog = {
      id: generateId(),
      timestamp: Date.now(),
      errorType,
      itemIndex,
      quantity,
      price,
      amount,
      expectedAmount,
      difference,
      differencePercentage: calculateDifferencePercentage(amount, expectedAmount),
      recordType,
      additionalInfo
    }
    
    this.logs.push(log)
    this.saveLogs()
    
    return log
  }
  
  // 获取所有日志
  getAllLogs(): ValidationLog[] {
    return [...this.logs]
  }
  
  // 获取日志统计
  getStats(): ValidationStats {
    if (this.logs.length === 0) {
      return {
        totalErrors: 0,
        errorsByType: {} as Record<ValidationErrorType, number>,
        avgDifference: 0,
        maxDifference: 0,
        minDifference: 0,
        errorsByTimeOfDay: {},
        errorsByRecordType: { prescription: 0, receipt: 0 }
      }
    }
    
    const errorsByType: Record<ValidationErrorType, number> = {} as Record<ValidationErrorType, number>
    const errorsByTimeOfDay: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    const errorsByRecordType = { prescription: 0, receipt: 0 }
    
    let totalDifference = 0
    let maxDifference = -Infinity
    let minDifference = Infinity
    
    this.logs.forEach(log => {
      errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1
      
      const timeOfDay = getTimeOfDay()
      errorsByTimeOfDay[timeOfDay] = (errorsByTimeOfDay[timeOfDay] || 0) + 1
      
      if (log.recordType === '处方') {
        errorsByRecordType.prescription++
      } else {
        errorsByRecordType.receipt++
      }
      
      totalDifference += Math.abs(log.difference)
      maxDifference = Math.max(maxDifference, log.difference)
      minDifference = Math.min(minDifference, log.difference)
    })
    
    return {
      totalErrors: this.logs.length,
      errorsByType,
      avgDifference: Math.round((totalDifference / this.logs.length) * 100) / 100,
      maxDifference: Math.round(maxDifference * 100) / 100,
      minDifference: Math.round(minDifference * 100) / 100,
      errorsByTimeOfDay,
      errorsByRecordType
    }
  }
  
  // 清空所有日志
  clearLogs(): void {
    this.logs = []
    this.saveLogs()
  }
  
  // 删除指定日志
  deleteLog(id: string): boolean {
    const index = this.logs.findIndex(log => log.id === id)
    if (index > -1) {
      this.logs.splice(index, 1)
      this.saveLogs()
      return true
    }
    return false
  }
  
  // 获取最近的日志
  getRecentLogs(count: number): ValidationLog[] {
    const sorted = [...this.logs].sort((a, b) => b.timestamp - a.timestamp)
    return sorted.slice(0, count)
  }
  
  // 获取错误类型标签
  getErrorTypeLabel(errorType: ValidationErrorType): string {
    const labels: Record<ValidationErrorType, string> = {
      [ValidationErrorType.AMOUNT_TOO_LOW]: '金额低于计算值',
      [ValidationErrorType.AMOUNT_TOO_HIGH]: '金额高于计算值',
      [ValidationErrorType.AMOUNT_ZERO_WHEN_NONZERO]: '金额为0（应为非零）',
      [ValidationErrorType.NEGATIVE_AMOUNT]: '金额为负数',
      [ValidationErrorType.QUANTITY_ZERO]: '数量为0',
      [ValidationErrorType.NEGATIVE_QUANTITY]: '数量为负数',
      [ValidationErrorType.NEGATIVE_PRICE]: '单价为负数',
      [ValidationErrorType.EMPTY_NAME]: '品名为空',
      [ValidationErrorType.INVALID_FORMAT]: '格式无效'
    }
    return labels[errorType] || errorType
  }
  
  // 获取错误类型分布（用于图表展示）
  getErrorTypeDistribution(): { type: string; label: string; count: number; percentage: number }[] {
    const stats = this.getStats()
    const total = stats.totalErrors
    
    return Object.entries(stats.errorsByType).map(([type, count]) => ({
      type,
      label: this.getErrorTypeLabel(type as ValidationErrorType),
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
    })).sort((a, b) => b.count - a.count)
  }
}

// 创建单例实例
export const validationLogger = new ValidationLogger()
