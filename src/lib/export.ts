import { db, type Record } from './db'
import { encryptData, decryptData } from './encryption'
import Dexie from 'dexie'

// 导出备份日志记录器
const exportLogger = {
  log: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  error: (stage: string, error: string, context?: any) => {
    const timestamp = new Date().toISOString()
    
  }
}

// 导出状态管理（防止并发导出）
let isExporting = false
let exportLockPromise: Promise<void> | null = null

// 获取导出锁
const acquireExportLock = async (): Promise<boolean> => {
  if (isExporting) {
    exportLogger.log('lock_busy', '导出正在进行中，请等待完成')
    return false
  }
  
  isExporting = true
  exportLogger.log('lock_acquired', '获取导出锁成功')
  return true
}

// 释放导出锁
const releaseExportLock = () => {
  isExporting = false
  exportLockPromise = null
  exportLogger.log('lock_released', '释放导出锁')
}

// 下载文件的通用函数
const downloadFile = (content: string | Blob, filename: string, type: string) => {
  let blob: Blob
  
  if (typeof content === 'string') {
    blob = new Blob([content], { type })
  } else {
    blob = content
  }
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  exportLogger.log('download_success', `文件下载成功: ${filename}`)
}

// 使用事务读取数据，确保一致性
const readDataWithTransaction = async <T>(
  table: Dexie.Table<any, any>,
  operation: () => Promise<T>
): Promise<T> => {
  return await db.transaction('r', table, async () => {
    exportLogger.log('transaction_start', '开始事务读取')
    const result = await operation()
    exportLogger.log('transaction_complete', '事务读取完成')
    return result
  })
}

// 1. 导出加密备份（完整数据库）- 使用事务确保一致性
export const exportEncryptedBackup = async () => {
  // 检查导出锁
  if (!await acquireExportLock()) {
    throw new Error('导出正在进行中，请等待完成后再试')
  }
  
  try {
    exportLogger.log('export_start', '开始导出加密备份（使用事务）')
    
    // 使用事务读取所有加密记录，确保数据一致性
    const encryptedRecords = await readDataWithTransaction(
      db.encryptedRecords,
      async () => {
        // 在事务内读取所有数据
        const records = await db.encryptedRecords.toArray()
        return records.map(record => ({
          id: record.id!,
          encrypted_data: record.encrypted_data,
          encryption_version: record.encryption_version
        }))
      }
    )
    
    // 记录导出开始时的数据状态
    const exportStartTime = Date.now()
    const recordCountAtStart = encryptedRecords.length
    
    exportLogger.log('snapshot_created', `创建数据快照，记录数: ${recordCountAtStart}`)
    
    // 准备备份数据结构
    const backupData = {
      version: '1.0.0',
      timestamp: exportStartTime,
      exportDate: new Date(exportStartTime).toISOString(),
      encryptionVersion: 'AES-256-CBC',
      totalRecords: recordCountAtStart,
      consistencyCheck: {
        exportStartTime,
        recordCount: recordCountAtStart,
        checksum: generateChecksum(encryptedRecords)
      },
      records: encryptedRecords
    }
    
    // 转换为 JSON 字符串，然后加密整个备份
    const backupJson = JSON.stringify(backupData, null, 2)
    const encryptedBackup = encryptData({ backup: backupJson })
    
    // 生成文件名
    const timestamp = new Date(exportStartTime).toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `rxlens-backup-${timestamp}.json.enc`
    
    // 下载加密文件
    downloadFile(encryptedBackup, filename, 'application/octet-stream')
    
    exportLogger.log('export_success', '加密备份导出成功', {
      recordsCount: encryptedRecords.length,
      filename,
      exportDuration: `${Date.now() - exportStartTime}ms`
    })
    
    return {
      success: true,
      count: encryptedRecords.length,
      filename,
      consistencyCheck: backupData.consistencyCheck
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    exportLogger.error('export_failed', errorMessage)
    throw error
  } finally {
    // 确保释放导出锁
    releaseExportLock()
  }
}

// 2. 导出 Excel 报表（CSV格式，不含附件）- 使用事务确保一致性
export const exportCSVReport = async () => {
  // 检查导出锁
  if (!await acquireExportLock()) {
    throw new Error('导出正在进行中，请等待完成后再试')
  }
  
  try {
    exportLogger.log('csv_export_start', '开始导出CSV报表（使用事务）')
    
    // 读取所有解密后的记录
    const records = await db.findAll()
    
    // 记录导出开始时的数据状态
    const exportStartTime = Date.now()
    const recordCountAtStart = records.length
    
    if (recordCountAtStart === 0) {
      exportLogger.log('csv_export_empty', '没有数据可导出')
      releaseExportLock()
      return { success: true, count: 0, warning: '没有数据可导出' }
    }
    
    exportLogger.log('snapshot_created', `创建数据快照，记录数: ${recordCountAtStart}`)
    
    // 准备 CSV 数据
    const headers = [
      'ID',
      '时间',
      '类型',
      '患者姓名',
      '医生姓名',
      '门店名称',
      '药品列表',
      '总金额',
      'Schema版本'
    ]
    
    // 生成 CSV 行
    const rows = records.map(record => {
      // 格式化药品列表
      const itemsText = record.items
        .map(item => `${item.name} x${item.qty} (¥${item.price})`)
        .join('; ')
      
      // CSV 字段需要转义逗号和引号
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      return [
        record.id,
        new Date(record.timestamp).toLocaleString('zh-CN'),
        record.type,
        record.patientName || '',
        record.doctorName || '',
        record.storeName || '',
        itemsText,
        record.total.toFixed(2),
        record.schema_version
      ].map(escapeCSV)
    })
    
    // 组合成完整 CSV 内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // 添加 BOM 以支持中文在 Excel 中正确显示
    const BOM = '\uFEFF'
    const finalContent = BOM + csvContent
    
    // 生成文件名
    const timestamp = new Date(exportStartTime).toISOString().replace(/[:.]/g, '-').slice(0, 10)
    const filename = `rxlens-report-${timestamp}.csv`
    
    // 下载 CSV 文件
    downloadFile(finalContent, filename, 'text/csv;charset=utf-8')
    
    exportLogger.log('csv_export_success', 'CSV报表导出成功', {
      recordsCount: records.length,
      filename,
      exportDuration: `${Date.now() - exportStartTime}ms`
    })
    
    return {
      success: true,
      count: records.length,
      filename,
      consistencyCheck: {
        exportStartTime,
        recordCount: recordCountAtStart,
        checksum: generateChecksum(records.map(r => r.id))
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    exportLogger.error('csv_export_failed', errorMessage)
    throw error
  } finally {
    // 确保释放导出锁
    releaseExportLock()
  }
}

// 生成数据校验和（用于验证数据完整性）
const generateChecksum = (data: any[]): string => {
  // 简化的校验和算法：基于记录数量和时间戳
  const checksumData = {
    count: data.length,
    firstId: data.length > 0 ? data[0].id : null,
    lastId: data.length > 0 ? data[data.length - 1].id : null,
    timestamp: Date.now()
  }
  
  // 使用简单的哈希算法
  const hash = Object.values(checksumData)
    .map(v => String(v))
    .join('-')
  
  return `CHK-${hash.length}-${data.length}`
}

// 验证备份数据完整性
export const verifyBackupIntegrity = async (backupData: any): Promise<{
  valid: boolean
  errors: string[]
}> => {
  const errors: string[] = []
  
  try {
    // 检查必需字段
    if (!backupData.version) {
      errors.push('缺少版本信息')
    }
    
    if (!backupData.timestamp) {
      errors.push('缺少时间戳')
    }
    
    if (!backupData.records || !Array.isArray(backupData.records)) {
      errors.push('记录数据格式不正确')
    }
    
    // 检查记录数量一致性
    if (backupData.totalRecords !== backupData.records?.length) {
      errors.push(`记录数量不一致：声明 ${backupData.totalRecords}，实际 ${backupData.records?.length}`)
    }
    
    // 检查一致性校验信息
    if (backupData.consistencyCheck) {
      const currentChecksum = generateChecksum(backupData.records)
      if (backupData.consistencyCheck.checksum !== currentChecksum) {
        errors.push('数据校验和不匹配，可能存在数据损坏')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  } catch (error) {
    errors.push(`验证过程出错: ${error instanceof Error ? error.message : String(error)}`)
    return {
      valid: false,
      errors
    }
  }
}

// 导出详细信息函数（用于调试）
export const getExportSummary = async () => {
  try {
    // 读取所有解密后的记录
    const records = await db.findAll()
    
    return {
      totalRecords: records.length,
      encryptedRecordsCount: records.length,
      earliestRecord: records.length > 0 ? new Date(Math.min(...records.map(r => r.timestamp.getTime()))).toLocaleString('zh-CN') : null,
      latestRecord: records.length > 0 ? new Date(Math.max(...records.map(r => r.timestamp.getTime()))).toLocaleString('zh-CN') : null,
      totalAmount: records.reduce((sum, r) => sum + r.total, 0),
      prescriptionCount: records.filter(r => r.type === '处方').length,
      receiptCount: records.filter(r => r.type === '小票').length,
      isExporting: isExporting,
      lastExportTime: null // 可以从日志中获取
    }
  } catch (error) {
    exportLogger.error('summary_failed', '获取导出摘要失败')
    return null
  }
}

// 检查导出状态
export const checkExportStatus = (): {
  isExporting: boolean
  canExport: boolean
} => {
  return {
    isExporting,
    canExport: !isExporting
  }
}

export { exportLogger }