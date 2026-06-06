import Dexie, { Table, Version } from 'dexie'
import { encryptData, decryptData, checkEncryptionStatus } from './encryption'

// 记录类型枚举
export type RecordType = '处方' | '小票'

// 药品项接口
export interface MedicineItem {
  name: string
  qty: number
  price: number
}

// 记录接口
export interface Record {
  id?: number
  schema_version: string
  timestamp: Date
  type: RecordType
  items: MedicineItem[]
  total: number
  attachment_base64?: string
  // 额外字段（用于显示和搜索）
  patientName?: string
  doctorName?: string
  storeName?: string
}

// 加密记录接口（存储在数据库中的格式）
interface EncryptedRecord {
  id?: number
  encrypted_data: string
  encryption_version: string
}

// 本地变更类型
export type LocalChangeType = 'CREATE' | 'UPDATE' | 'DELETE'
export interface LocalChange {
  type: LocalChangeType
  record: any
}

// 数据库日志记录器
const dbLogger = {
  log: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  warn: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  error: (stage: string, error: string, context?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  info: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  debug: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  }
}

// 数据库版本配置
const DB_NAME = 'rxlens-db'
const CURRENT_VERSION = 3
const SCHEMA_VERSION = 'v2'
const ENCRYPTION_VERSION = 'AES-256-GCM-v1'

// 待同步队列中的操作类型
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE'

// 待同步队列记录接口
export interface PendingSyncRecord {
  id?: number
  localRecordId: number
  operationType: SyncOperationType
  encryptedData?: string
  encryptionVersion?: string
  createdAt: number  // 时间戳，用于按顺序同步
  retryCount: number
  lastError?: string
}

// 开发环境检测
const isDevelopment = process.env.NODE_ENV === 'development'

// 数据库类
class RxlensDatabase extends Dexie {
  records!: Table<Record, number>
  encryptedRecords!: Table<EncryptedRecord, number>
  pendingSyncQueue!: Table<PendingSyncRecord, number>

  // 解密查询方法声明
  findAll!: () => Promise<Record[]>
  findById!: (id: number) => Promise<Record | undefined>
  findByType!: (type: RecordType) => Promise<Record[]>
  findTodayRecords!: () => Promise<Record[]>
  create!: (record: Omit<Record, 'id' | 'schema_version' | 'timestamp'>) => Promise<number>
  update!: (id: number, updates: Partial<Record>) => Promise<void>
  remove!: (id: number) => Promise<void>
  getTodayTotal!: () => Promise<number>
  getTodayPrescriptionCount!: () => Promise<number>

  constructor() {
    super(DB_NAME)
    
    const encryptionStatus = checkEncryptionStatus()
    
    dbLogger.log('init', `初始化数据库 ${DB_NAME}`, { 
      version: CURRENT_VERSION,
      isDevelopment,
      encryptionEnabled: true,
      encryptionStatus
    })

    // 定义数据库 schema
    this.defineSchema()
    
    // 设置事件监听（必须在 defineSchema 完成后调用）
    this.setupEventListeners()
  }

  private defineSchema() {
    try {
      // 版本 1 - 初始版本（未加密）
      this.version(1).stores({
        records: `
          ++id,
          schema_version,
          timestamp,
          type,
          total,
          patientName,
          doctorName,
          storeName
        `
      })

      // 版本 2 - 加密版本
      const version2 = this.version(2).stores({
        records: null, // 删除旧表
        encrypted_records: `
          ++id,
          encryption_version
        `
      })

      // 添加版本升级钩子
      this.setupMigrationHooks(version2)

      // 重命名表引用
      this.encryptedRecords = this.table('encrypted_records')

      // 版本 3 - 添加待同步队列表
      const version3 = this.version(CURRENT_VERSION).stores({
        pending_sync_queue: `
          ++id,
          localRecordId,
          operationType,
          createdAt
        `
      })

      // 添加版本 3 升级钩子
      this.setupSyncQueueMigration(version3)

      // 重命名表引用
      this.pendingSyncQueue = this.table('pending_sync_queue')

      dbLogger.log('schema', `Schema 定义完成，版本: ${CURRENT_VERSION}，加密和待同步队列已启用`)
    } catch (error) {
      dbLogger.error('schema_error', 'Schema 定义失败', { error })
      throw error
    }
  }

  private setupMigrationHooks(version: Version) {
    // 版本升级时的迁移逻辑
    version.upgrade(async (trans) => {
      // 使用类型断言获取 oldVersion（Dexie v4 中的内部属性）
      const oldVersion = (trans as any).db?.verno || (trans as any)._oldVersion || 'unknown'
      
      dbLogger.log('migration_start', `开始数据库迁移`, {
        fromVersion: oldVersion,
        toVersion: CURRENT_VERSION,
        migratingToEncryption: true
      })

      // 开发环境：自动备份数据
      if (isDevelopment && oldVersion !== 'unknown' && Number(oldVersion) > 0) {
        await this.backupBeforeMigration(trans)
      }

      try {
        // 从旧表迁移数据到新表（加密后存储）
        if (Number(oldVersion) === 1) {
          const oldRecords: Record[] = await trans.table('records').toArray()
          dbLogger.log('migration_migrating', `开始迁移 ${oldRecords.length} 条记录`, {
            recordCount: oldRecords.length
          })

          for (const record of oldRecords) {
            // 删除 id 字段（自增主键）
            const { id, ...dataToEncrypt } = record
            
            // 加密数据
            const encryptedData = encryptData(dataToEncrypt)
            
            // 插入加密后的记录
            await trans.table('encrypted_records').add({
              encrypted_data: encryptedData,
              encryption_version: ENCRYPTION_VERSION
            })
          }

          dbLogger.log('migration_encrypted', `成功加密并迁移 ${oldRecords.length} 条记录`)
        }

        dbLogger.log('migration_complete', `数据库迁移完成，已启用加密`)
      } catch (error) {
        dbLogger.error('migration_failed', '数据库迁移失败', { error })
        throw error
      }
    })
  }

  private setupSyncQueueMigration(version: Version) {
    // 版本 3 升级钩子：初始化待同步队列表
    version.upgrade(async (trans) => {
      const oldVersion = (trans as any).db?.verno || (trans as any)._oldVersion || 'unknown'
      
      dbLogger.log('sync_queue_migration', `待同步队列迁移检查`, {
        fromVersion: oldVersion,
        toVersion: CURRENT_VERSION
      })

      // 仅当从版本 2 升级到 3 时执行
      if (Number(oldVersion) === 2) {
        dbLogger.log('sync_queue_init', `初始化待同步队列表`)
      }
    })
  }

  // ==================== 待同步队列操作 ====================
  
  // 添加记录到待同步队列
  async addToPendingSyncQueue(
    localRecordId: number,
    operationType: SyncOperationType,
    encryptedData?: string,
    encryptionVersion?: string
  ): Promise<number> {
    const record: PendingSyncRecord = {
      localRecordId,
      operationType,
      encryptedData,
      encryptionVersion,
      createdAt: Date.now(),
      retryCount: 0
    }
    
    const id = await this.pendingSyncQueue.add(record)
    dbLogger.log('pending_sync_add', `添加待同步记录`, { id, localRecordId, operationType })
    return id
  }
  
  // 获取所有待同步记录（按时间戳排序）
  async getPendingSyncQueue(): Promise<PendingSyncRecord[]> {
    return this.pendingSyncQueue.orderBy('createdAt').toArray()
  }
  
  // 获取待同步记录数量
  async getPendingSyncCount(): Promise<number> {
    return this.pendingSyncQueue.count()
  }
  
  // 更新待同步记录的重试次数和错误信息
  async updatePendingSyncRetry(id: number, retryCount: number, lastError?: string): Promise<void> {
    await this.pendingSyncQueue.update(id, { retryCount, lastError })
    dbLogger.log('pending_sync_retry_update', `更新重试次数`, { id, retryCount, lastError })
  }
  
  // 从待同步队列中移除记录
  async removeFromPendingSyncQueue(id: number): Promise<void> {
    await this.pendingSyncQueue.delete(id)
    dbLogger.log('pending_sync_remove', `移除待同步记录`, { id })
  }
  
  // 清空待同步队列
  async clearPendingSyncQueue(): Promise<void> {
    await this.pendingSyncQueue.clear()
    dbLogger.log('pending_sync_clear', `清空待同步队列`)
  }

  private async backupBeforeMigration(trans: any) {
    try {
      dbLogger.log('backup_start', `开发环境：迁移前备份数据`)
      
      // 获取当前所有记录
      const records = await trans.records.toArray()
      
      // 生成备份文件名
      const backupName = `rxlens-backup-v${trans.oldVersion}-${Date.now()}.json`
      
      // 存储到 localStorage（开发环境）
      const backupData = JSON.stringify({
        timestamp: new Date().toISOString(),
        version: trans.oldVersion,
        records
      })
      
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        dbLogger.log('backup_skipped', '非浏览器环境，跳过备份')
        return
      }
      
      // 限制备份大小（最大 5MB）
      if (backupData.length < 5 * 1024 * 1024) {
        localStorage.setItem(backupName, backupData)
        dbLogger.log('backup_complete', `备份完成，共 ${records.length} 条记录`, { backupName })
        
        // 保留最近5个备份
        this.cleanupOldBackups()
      } else {
        dbLogger.warn('backup_too_large', `备份数据过大，跳过备份`, { size: backupData.length })
      }
    } catch (error) {
      dbLogger.warn('backup_failed', `备份失败，但继续迁移`, { error })
    }
  }

  private cleanupOldBackups() {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        return
      }
      
      const backups: { name: string; time: number }[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('rxlens-backup-')) {
          const match = key.match(/rxlens-backup-v\d+-(\d+)\.json/)
          if (match) {
            backups.push({ name: key, time: parseInt(match[1]) })
          }
        }
      }
      
      // 按时间排序，保留最近5个
      backups.sort((a, b) => b.time - a.time)
      
      // 删除多余的备份
      const backupsToDelete = backups.slice(5)
      backupsToDelete.forEach(backup => {
        localStorage.removeItem(backup.name)
        dbLogger.log('cleanup', `清理旧备份: ${backup.name}`)
      })
    } catch (error) {
      dbLogger.warn('cleanup_failed', `备份清理失败`, { error })
    }
  }

  private setupEventListeners() {
    // 数据库开启事件
    this.on('ready', () => {
      dbLogger.log('ready', `数据库已就绪`)
    })

    // 数据库版本变更事件
    this.on('versionchange', (event) => {
      dbLogger.log('versionchange', `检测到数据库版本变更`, {
        oldVersion: event.oldVersion,
        newVersion: event.newVersion
      })
      
      // 开发环境：提示用户
      if (isDevelopment) {
        
      }
    })

    // 数据库关闭事件
    this.on('close', () => {
      dbLogger.log('close', `数据库已关闭`)
    })

    // 监听加密记录的变更事件（用于同步）
    // 注意：直接使用 this.table() 获取表引用，避免引用未定义的问题
    const encryptedRecords = this.table('encrypted_records')
    
    encryptedRecords.hook('creating', (primKey, obj, transaction) => {
      dbLogger.log('record_creating', `创建新记录`, { id: primKey })
      this.emitLocalChange('CREATE', obj)
    })

    encryptedRecords.hook('updating', (mods, primKey, obj, transaction) => {
      dbLogger.log('record_updating', `更新记录`, { id: primKey })
      this.emitLocalChange('UPDATE', { ...obj, ...mods })
    })

    encryptedRecords.hook('deleting', (primKey, obj, transaction) => {
      dbLogger.log('record_deleting', `删除记录`, { id: primKey })
      this.emitLocalChange('DELETE', obj)
    })
  }

  // 本地变更事件处理
  private localChangeListeners: Array<(change: LocalChange) => void> = []

  // 触发本地变更事件
  private emitLocalChange(type: LocalChangeType, record: any) {
    const change: LocalChange = { type, record }
    this.localChangeListeners.forEach(listener => listener(change))
  }

  // 添加本地变更监听
  onLocalChange(listener: (change: LocalChange) => void): () => void {
    this.localChangeListeners.push(listener)
    return () => {
      const index = this.localChangeListeners.indexOf(listener)
      if (index > -1) {
        this.localChangeListeners.splice(index, 1)
      }
    }
  }

  // 检查数据库状态
  async checkStatus(): Promise<{ 
    exists: boolean 
    version: number 
    recordCount: number
    schemaVersion: string
  }> {
    try {
      const exists = await Dexie.exists(DB_NAME)
      let version = 0
      let recordCount = 0
      let schemaVersion = 'unknown'

      if (exists) {
        version = this.verno
        recordCount = await this.records.count()
        
        // 获取第一条记录的schema版本（如果有记录）
        const firstRecord = await this.records.orderBy('id').first()
        schemaVersion = firstRecord?.schema_version || 'v1'
      }

      dbLogger.log('status', `数据库状态检查完成`, {
        exists,
        version,
        recordCount,
        schemaVersion
      })

      return { exists, version, recordCount, schemaVersion }
    } catch (error) {
      dbLogger.error('status_error', '数据库状态检查失败', { error })
      return { exists: false, version: 0, recordCount: 0, schemaVersion: 'unknown' }
    }
  }

  // 获取原始加密数据用于验证（调试用）
  async getRawEncryptedData(): Promise<Array<{
    id: number
    encrypted_data: string
    encryption_version: string
  }>> {
    try {
      const records = await this.encryptedRecords.toArray()
      const rawData = records.map(record => ({
        id: record.id!,
        encrypted_data: record.encrypted_data,
        encryption_version: record.encryption_version
      }))
      
      dbLogger.log('raw_data', `获取到 ${rawData.length} 条原始加密数据`, { count: rawData.length })
      return rawData
    } catch (error) {
      dbLogger.error('raw_data_error', '获取原始数据失败', { error })
      throw error
    }
  }

  // 安全删除数据库（仅开发环境）
  async safeDelete(): Promise<void> {
    if (!isDevelopment) {
      throw new Error('安全删除仅在开发环境可用')
    }

    try {
      dbLogger.log('safe_delete', `开发环境：安全删除数据库`)
      
      // 先备份
      const records = await this.records.toArray()
      const backupName = `rxlens-backup-before-delete-${Date.now()}.json`
      
      // 检查是否在浏览器环境中
      if (typeof window !== 'undefined') {
        localStorage.setItem(backupName, JSON.stringify({
          timestamp: new Date().toISOString(),
          records
        }))
      }
      
      // 删除数据库
      await this.delete()
      dbLogger.log('safe_delete_complete', `数据库删除成功，已备份 ${records.length} 条记录`, { backupName })
    } catch (error) {
      dbLogger.error('safe_delete_failed', '数据库删除失败', { error })
      throw error
    }
  }
}

// 导出数据库实例
export const db = new RxlensDatabase()



// 开发环境：初始化时检查状态
if (isDevelopment) {
  db.checkStatus().then(status => {
    if (!status.exists) {
      dbLogger.log('info', '数据库不存在，将在首次操作时创建')
    } else {
      dbLogger.log('info', `数据库已存在，版本: ${status.version}, 记录数: ${status.recordCount}`)
    }
  }).catch(error => {
    dbLogger.error('init_check_failed', '初始化检查失败', { error })
  })
}

// CRUD 操作 - 加密版本
// 创建记录（加密后存储）
const create = async (record: Omit<Record, 'id' | 'schema_version' | 'timestamp'>): Promise<number> => {
    const startTime = Date.now()
    const newRecord: Record = {
      ...record,
      schema_version: SCHEMA_VERSION,
      timestamp: new Date()
    }
    
    // 数据完整性校验
    const validationErrors: string[] = []
    if (!record.type || !['处方', '小票'].includes(record.type)) {
      validationErrors.push('无效的记录类型')
    }
    if (!record.items || record.items.length === 0) {
      validationErrors.push('药品列表不能为空')
    } else {
      record.items.forEach((item, index) => {
        if (!item.name || !item.name.trim()) {
          validationErrors.push(`第${index+1}个药品名称为空`)
        }
        if (typeof item.qty !== 'number' || item.qty <= 0) {
          validationErrors.push(`第${index+1}个药品数量无效: ${item.qty}`)
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          validationErrors.push(`第${index+1}个药品价格无效: ${item.price}`)
        }
      })
    }
    if (typeof record.total !== 'number' || record.total < 0) {
      validationErrors.push(`总金额无效: ${record.total}`)
    }
    
    dbLogger.log('record_create_start', `准备创建新记录`, {
      type: newRecord.type,
      itemsCount: newRecord.items.length,
      total: newRecord.total,
      hasAttachment: !!newRecord.attachment_base64,
      attachmentSize: newRecord.attachment_base64 ? `${(newRecord.attachment_base64.length / 1024).toFixed(2)} KB` : '无',
      patientName: newRecord.patientName,
      doctorName: newRecord.doctorName,
      storeName: newRecord.storeName,
      validationErrors,
      encryptionEnabled: true,
      items: newRecord.items.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.qty * item.price
      }))
    })
    
    if (validationErrors.length > 0) {
      dbLogger.warn('record_create_validation_failed', `数据校验失败`, { errors: validationErrors })
    }
    
    try {
      // 删除 id 字段（自增主键）
      const { id, ...dataToEncrypt } = newRecord
      
      // 加密数据
      dbLogger.debug('record_create_encrypt', `开始加密数据`)
      const encryptedData = encryptData(dataToEncrypt)
      
      // 存储加密后的数据
      dbLogger.debug('record_create_exec', `执行数据库插入操作（加密存储）`)
      const encryptedId = await db.encryptedRecords.add({
        encrypted_data: encryptedData,
        encryption_version: ENCRYPTION_VERSION
      })
      
      const duration = Date.now() - startTime
      
      // 验证写入的数据（解密验证）
      const savedEncrypted = await db.encryptedRecords.get(encryptedId)
      let dataMatch = false
      let decryptedRecord: Record | null = null
      
      if (savedEncrypted) {
        try {
          decryptedRecord = decryptData(savedEncrypted.encrypted_data) as Record
          dataMatch = decryptedRecord.type === newRecord.type && 
            decryptedRecord.total === newRecord.total &&
            JSON.stringify(decryptedRecord.items) === JSON.stringify(newRecord.items)
        } catch (decryptError) {
          dbLogger.error('record_create_decrypt_verify_failed', `解密验证失败`, { decryptError })
        }
      }
      
      dbLogger.log('record_create_success', `记录创建成功（已加密）`, {
        id: encryptedId,
        timestamp: newRecord.timestamp,
        schema_version: newRecord.schema_version,
        encryption_version: ENCRYPTION_VERSION,
        duration: `${duration}ms`,
        dataVerified: dataMatch,
        encryptedSize: encryptedData.length,
        savedRecord: decryptedRecord ? {
          type: decryptedRecord.type,
          total: decryptedRecord.total,
          itemsCount: decryptedRecord.items.length
        } : null
      })
      
      if (!dataMatch && decryptedRecord) {
        dbLogger.warn('record_create_data_mismatch', `写入数据与保存数据不一致`, {
          expected: { type: newRecord.type, total: newRecord.total, items: newRecord.items },
          actual: { type: decryptedRecord.type, total: decryptedRecord.total, items: decryptedRecord.items }
        })
      }
      
      return encryptedId
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('record_create_failed', error instanceof Error ? error.message : String(error), {
        record: newRecord,
        stack: error instanceof Error ? error.stack : null,
        duration: `${duration}ms`,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        encryptionError: true
      })
      throw error
    }
  }

  // 查询所有记录（解密后返回）
  const findAll = async (): Promise<Record[]> => {
    const startTime = Date.now()
    dbLogger.log('query_all_start', `开始查询所有记录（需解密）`)
    
    try {
      dbLogger.debug('query_all_exec', `执行数据库查询`)
      const encryptedRecords = await db.encryptedRecords.toArray()
      
      // 解密所有记录
      const records: Record[] = []
      const decryptErrors: { id: number; error: string }[] = []
      
      for (const encrypted of encryptedRecords) {
        try {
          const decrypted = decryptData(encrypted.encrypted_data) as Record
          records.push({ ...decrypted, id: encrypted.id! })
        } catch (error) {
          decryptErrors.push({ 
            id: encrypted.id!, 
            error: error instanceof Error ? error.message : '解密失败' 
          })
          dbLogger.warn('query_all_decrypt_error', `解密记录失败`, { 
            id: encrypted.id, 
            error 
          })
        }
      }
      
      const duration = Date.now() - startTime
      
      // 数据完整性检查
      const integrityIssues = records.map((record, index) => {
        const issues: string[] = []
        if (!record.id) issues.push('缺少ID')
        if (!record.type) issues.push('缺少类型')
        if (!record.items || !Array.isArray(record.items)) issues.push('items不是数组')
        if (record.items && record.items.length > 0) {
          record.items.forEach((item, i) => {
            if (!item.name) issues.push(`items[${i}].name为空`)
            if (typeof item.qty !== 'number') issues.push(`items[${i}].qty不是数字`)
            if (typeof item.price !== 'number') issues.push(`items[${i}].price不是数字`)
          })
        }
        return { index, id: record.id, issues }
      }).filter(r => r.issues.length > 0)
      
      dbLogger.log('query_all_complete', `查询完成（已解密）`, {
        recordCount: records.length,
        encryptedRecordCount: encryptedRecords.length,
        decryptErrorCount: decryptErrors.length,
        duration: `${duration}ms`,
        integrityIssuesCount: integrityIssues.length,
        totalAmount: records.reduce((sum, r) => sum + r.total, 0),
        typeDistribution: {
          处方: records.filter(r => r.type === '处方').length,
          小票: records.filter(r => r.type === '小票').length
        }
      })
      
      if (integrityIssues.length > 0) {
        dbLogger.warn('query_all_integrity_warning', `发现数据完整性问题`, { issues: integrityIssues })
      }
      
      return records
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_all_failed', error instanceof Error ? error.message : String(error), {
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 按 ID 查询记录（解密后返回）
  const findById = async (id: number): Promise<Record | undefined> => {
    const startTime = Date.now()
    dbLogger.log('query_by_id_start', `开始查询记录 ID: ${id}（需解密）`)
    
    try {
      dbLogger.debug('query_by_id_exec', `执行数据库查询 ID: ${id}`)
      const encryptedRecord = await db.encryptedRecords.get(id)
      const duration = Date.now() - startTime
      
      if (encryptedRecord) {
        // 解密数据
        let record: Record | null = null
        try {
          record = decryptData(encryptedRecord.encrypted_data) as Record
          record.id = encryptedRecord.id
        } catch (decryptError) {
          dbLogger.error('query_by_id_decrypt_failed', `解密记录失败`, { id, decryptError })
          return undefined
        }
        
        // 数据完整性检查
        const issues: string[] = []
        if (!record.type) issues.push('缺少类型')
        if (!record.items || !Array.isArray(record.items)) issues.push('items不是数组')
        if (!record.timestamp) issues.push('缺少时间戳')
        
        dbLogger.log('query_by_id_found', `找到记录（已解密）`, {
          id,
          type: record.type,
          total: record.total,
          itemsCount: record.items?.length || 0,
          duration: `${duration}ms`,
          issues
        })
        
        if (issues.length > 0) {
          dbLogger.warn('query_by_id_integrity_warning', `记录数据完整性问题`, { id, issues })
        }
        
        return record
      } else {
        dbLogger.log('query_by_id_not_found', `未找到记录`, { id, duration: `${duration}ms` })
        return undefined
      }
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_by_id_failed', error instanceof Error ? error.message : String(error), {
        id,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 按类型查询记录（解密后返回）
  const findByType = async (type: RecordType): Promise<Record[]> => {
    const startTime = Date.now()
    dbLogger.log('query_by_type_start', `开始查询类型为 ${type} 的记录（需解密）`)
    
    try {
      dbLogger.debug('query_by_type_exec', `执行数据库查询`)
      // 由于数据已加密，需要先获取所有记录再过滤
      const encryptedRecords = await db.encryptedRecords.toArray()
      
      // 解密并过滤
      const records: Record[] = []
      for (const encrypted of encryptedRecords) {
        try {
          const decrypted = decryptData(encrypted.encrypted_data) as Record
          if (decrypted.type === type) {
            records.push({ ...decrypted, id: encrypted.id! })
          }
        } catch (decryptError) {
          dbLogger.warn('query_by_type_decrypt_error', `解密记录失败`, { id: encrypted.id, decryptError })
        }
      }
      
      const duration = Date.now() - startTime
      
      dbLogger.log('query_by_type_complete', `查询完成（已解密）`, {
        type,
        recordCount: records.length,
        totalAmount: records.reduce((sum, r) => sum + r.total, 0),
        duration: `${duration}ms`
      })
      
      return records
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_by_type_failed', error instanceof Error ? error.message : String(error), {
        type,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 查询今日记录（解密后返回）
  const findTodayRecords = async (): Promise<Record[]> => {
    const startTime = Date.now()
    dbLogger.log('query_today_start', `开始查询今日记录（需解密）`)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    try {
      dbLogger.debug('query_today_exec', `执行数据库查询`)
      // 由于数据已加密，需要先获取所有记录再过滤
      const encryptedRecords = await db.encryptedRecords.toArray()
      
      // 解密并过滤今日记录
      const records: Record[] = []
      for (const encrypted of encryptedRecords) {
        try {
          const decrypted = decryptData(encrypted.encrypted_data) as Record
          const recordTimestamp = new Date(decrypted.timestamp)
          if (recordTimestamp >= today && recordTimestamp < tomorrow) {
            records.push({ ...decrypted, id: encrypted.id! })
          }
        } catch (decryptError) {
          dbLogger.warn('query_today_decrypt_error', `解密记录失败`, { id: encrypted.id, decryptError })
        }
      }
      
      const duration = Date.now() - startTime
      
      dbLogger.log('query_today_complete', `查询完成（已解密）`, {
        recordCount: records.length,
        totalAmount: records.reduce((sum, r) => sum + r.total, 0),
        duration: `${duration}ms`,
        dateRange: {
          start: today.toISOString(),
          end: tomorrow.toISOString()
        }
      })
      
      return records
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_today_failed', error instanceof Error ? error.message : String(error), {
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 更新记录（重新加密）
  const update = async (id: number, updates: Partial<Record>): Promise<void> => {
    const startTime = Date.now()
    dbLogger.log('update_start', `开始更新记录 ID: ${id}（需重新加密）`, { updates })
    
    try {
      // 获取更新前的加密数据
      const encryptedRecord = await db.encryptedRecords.get(id)
      if (!encryptedRecord) {
        throw new Error(`记录不存在: ${id}`)
      }
      
      // 解密现有数据
      let currentData = decryptData(encryptedRecord.encrypted_data) as Record
      
      // 移除 id 和 schema_version 字段（这些不应被更新）
      const { id: _, schema_version, timestamp, ...updatesWithoutMeta } = updates as Record
      
      // 合并更新
      const updatedData = { ...currentData, ...updatesWithoutMeta }
      
      // 重新加密
      const updatedEncryptedData = encryptData(updatedData)
      
      dbLogger.debug('update_exec', `执行数据库更新 ID: ${id}（重新加密）`)
      const result = await db.encryptedRecords.update(id, {
        encrypted_data: updatedEncryptedData
      })
      const duration = Date.now() - startTime
      
      // 获取更新后的数据验证
      const updatedEncrypted = await db.encryptedRecords.get(id)
      let afterRecord: Record | null = null
      if (updatedEncrypted) {
        try {
          afterRecord = decryptData(updatedEncrypted.encrypted_data) as Record
          afterRecord.id = id
        } catch (decryptError) {
          dbLogger.error('update_decrypt_verify_failed', `解密验证失败`, { decryptError })
        }
      }
      
      // 验证更新结果
      const updateSuccess = result === 1 && afterRecord
      const fieldsUpdated = Object.keys(updatesWithoutMeta)
      
      dbLogger.log('update_complete', `记录更新${updateSuccess ? '成功' : '失败'}（已加密）`, {
        id,
        duration: `${duration}ms`,
        result,
        fieldsUpdated,
        encryption_version: ENCRYPTION_VERSION,
        before: { type: currentData.type, total: currentData.total },
        after: afterRecord ? { type: afterRecord.type, total: afterRecord.total } : null
      })
      
      if (!updateSuccess) {
        dbLogger.warn('update_failed_no_change', `更新未生效，可能记录不存在或数据未变化`, { id, result })
      }
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('update_failed', error instanceof Error ? error.message : String(error), {
        id,
        updates,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null,
        encryptionError: true
      })
      throw error
    }
  }

  // 删除记录
  const remove = async (id: number): Promise<void> => {
    const startTime = Date.now()
    dbLogger.log('delete_start', `开始删除记录 ID: ${id}`)
    
    try {
      // 获取删除前的加密数据
      const encryptedRecord = await db.encryptedRecords.get(id)
      let deletedRecord: Record | null = null
      
      if (encryptedRecord) {
        try {
          deletedRecord = decryptData(encryptedRecord.encrypted_data) as Record
          deletedRecord.id = encryptedRecord.id
        } catch (decryptError) {
          dbLogger.warn('delete_decrypt_failed', `解密待删除记录失败`, { id, decryptError })
        }
      }
      
      dbLogger.debug('delete_exec', `执行数据库删除 ID: ${id}`)
      await db.encryptedRecords.delete(id)
      const duration = Date.now() - startTime
      
      // 验证删除结果
      const stillExists = await db.encryptedRecords.get(id)
      const deleteSuccess = !stillExists
      
      dbLogger.log('delete_complete', `记录删除${deleteSuccess ? '成功' : '失败'}`, {
        id,
        duration: `${duration}ms`,
        deletedRecord: deletedRecord ? {
          type: deletedRecord.type,
          total: deletedRecord.total,
          itemsCount: deletedRecord.items.length
        } : null,
        stillExists
      })
      
      if (!deleteSuccess) {
        dbLogger.warn('delete_failed_not_deleted', `记录删除后仍然存在`, { id })
      }
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('delete_failed', error instanceof Error ? error.message : String(error), {
        id,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 计算今日总金额
  const getTodayTotal = async (): Promise<number> => {
    const startTime = Date.now()
    dbLogger.log('query_today_total_start', `开始计算今日总金额`)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    try {
      dbLogger.debug('query_today_total_exec', `执行数据库查询`)
      const allRecords = await findAll()
      const todayRecords = allRecords.filter(record => {
        const timestamp = new Date(record.timestamp)
        return timestamp >= today && timestamp < tomorrow
      })
      
      const total = todayRecords.reduce((sum, record) => sum + record.total, 0)
      const duration = Date.now() - startTime
      
      dbLogger.log('query_today_total_complete', `计算完成`, {
        total,
        recordCount: todayRecords.length,
        duration: `${duration}ms`
      })
      
      return total
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_today_total_failed', error instanceof Error ? error.message : String(error), {
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }

  // 计算今日处方数量
  const getTodayPrescriptionCount = async (): Promise<number> => {
    const startTime = Date.now()
    dbLogger.log('query_today_prescription_count_start', `开始计算今日处方数量`)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    try {
      dbLogger.debug('query_today_prescription_count_exec', `执行数据库查询`)
      const allRecords = await findAll()
      const todayRecords = allRecords.filter(record => {
        const timestamp = new Date(record.timestamp)
        return timestamp >= today && timestamp < tomorrow && record.type === '处方'
      })
      
      const count = todayRecords.length
      const duration = Date.now() - startTime
      
      dbLogger.log('query_today_prescription_count_complete', `计算完成`, {
        count,
        duration: `${duration}ms`
      })
      
      return count
    } catch (error) {
      const duration = Date.now() - startTime
      dbLogger.error('query_today_prescription_count_failed', error instanceof Error ? error.message : String(error), {
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : null
      })
      throw error
    }
  }



// 添加解密查询方法到实例
db.findAll = findAll
db.findById = findById
db.findByType = findByType
db.findTodayRecords = findTodayRecords
db.create = create
db.update = update
db.remove = remove
db.getTodayTotal = getTodayTotal
db.getTodayPrescriptionCount = getTodayPrescriptionCount

// 导出类型
export type { Record as DBRecord }