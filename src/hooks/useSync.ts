import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabase, checkSupabaseStatus, supabaseLogger, type EncryptedRecord } from '@/lib/supabase'
import { db, type LocalChange, type PendingSyncRecord, type SyncOperationType } from '@/lib/db'
import { encryptData, decryptData } from '@/lib/encryption'

// ===== 防抖工具 =====
function createDebouncer<T extends (...args: any[]) => void>(fn: T, delay: number): {
  trigger: (...args: Parameters<T>) => void
  cancel: () => void
} {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    trigger: (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn(...args), delay)
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
}

// ===== 指数退避重试工具 =====
const RETRY_DELAYS = [2000, 4000, 8000] // 2s, 4s, 8s
const MAX_RETRY_COUNT = 3

interface RetryState {
  retryCount: number
  isRetrying: boolean
  currentDelay: number
}

// 同步状态类型
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'pending'
export type SyncDirection = 'local-to-remote' | 'remote-to-local' | 'bidirectional'

interface SyncStats {
  localRecords: number
  remoteRecords: number
  lastSync: Date | null
  syncCount: number
}

interface SyncHookReturn {
  status: SyncStatus
  direction: SyncDirection
  stats: SyncStats
  isConnected: boolean
  lastError: string | null
  pendingCount: number
  startSync: () => Promise<void>
  stopSync: () => void
  triggerSync: () => Promise<void>
  triggerQueueSync: () => Promise<void>  // 触发队列同步
}

// 记录 ID 映射（本地 ID -> 远程 ID）
let localToRemoteIdMap = new Map<number, string>()
let remoteToLocalIdMap = new Map<string, number>()

export function useSync(): SyncHookReturn {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [direction, setDirection] = useState<SyncDirection>('bidirectional')
  const [stats, setStats] = useState<SyncStats>({
    localRecords: 0,
    remoteRecords: 0,
    lastSync: null,
    syncCount: 0
  })
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  
  const realtimeSubscription = useRef<any>(null)
  const localChangeListener = useRef<(() => void) | null>(null)
  const retryStateRef = useRef<RetryState>({ retryCount: 0, isRetrying: false, currentDelay: 0 })
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // 更新统计信息
  const updateStats = useCallback(async () => {
    try {
      const localCount = await db.encryptedRecords.count()
      
      const supabase = getSupabase()
      let remoteCount = 0
      
      if (supabase) {
        const { data: remoteRecords, error } = await supabase.from('records').select('id')
        remoteCount = error ? 0 : Array.isArray(remoteRecords) ? remoteRecords.length : 0
      }
      
      setStats(prev => ({
        ...prev,
        localRecords: localCount,
        remoteRecords: remoteCount
      }))
    } catch (error) {
      supabaseLogger.error('update_stats_failed', '更新统计信息失败', { error })
    }
  }, [])

  // 处理冲突：比较 timestamp，返回应该保留的记录
  const resolveConflict = (localRecord: EncryptedRecord, remoteRecord: EncryptedRecord): 'local' | 'remote' => {
    if (localRecord.timestamp > remoteRecord.timestamp) {
      supabaseLogger.log('conflict_resolved', '保留本地记录（timestamp 较新）', {
        localTs: localRecord.timestamp,
        remoteTs: remoteRecord.timestamp
      })
      return 'local'
    } else {
      supabaseLogger.log('conflict_resolved', '保留远程记录（timestamp 较新）', {
        localTs: localRecord.timestamp,
        remoteTs: remoteRecord.timestamp
      })
      return 'remote'
    }
  }

  // 将本地记录同步到远程（带指数退避重试）
  const syncLocalToRemote = useCallback(async (operationType?: SyncOperationType, localRecordId?: number, encryptedData?: string) => {
    const supabase = getSupabase()
    
    if (!supabase || !checkSupabaseStatus().configured) {
      supabaseLogger.warn('sync_skipped', 'Supabase 未配置，跳过同步')
      return
    }

    // 如果离线，不尝试同步，直接添加到队列
    if (!isOnlineRef.current) {
      supabaseLogger.warn('sync_skipped_offline', '检测到离线状态，跳过同步')
      if (operationType && localRecordId !== undefined) {
        await db.addToPendingSyncQueue(localRecordId, operationType, encryptedData)
        const count = await db.getPendingSyncCount()
        setPendingCount(count)
        setStatus('pending')
      }
      return
    }

    const syncWithRetry = async (): Promise<boolean> => {
      const retryCount = retryStateRef.current.retryCount
      
      try {
        setDirection('local-to-remote')
        setStatus('syncing')
        supabaseLogger.log('sync_start', `开始从本地同步到远程 (重试 ${retryCount}/${MAX_RETRY_COUNT})...`)

        // 如果是单条记录同步
        if (operationType && localRecordId !== undefined && encryptedData) {
          const remoteId = localToRemoteIdMap.get(localRecordId)
          
          if (operationType === 'DELETE') {
            if (remoteId) {
              const { error } = await supabase.from('records').delete().eq('id', remoteId)
              if (error) throw new Error(`删除远程记录失败: ${error.message}`)
              localToRemoteIdMap.delete(localRecordId)
              remoteToLocalIdMap.delete(remoteId)
            }
          } else {
            const recordToUpsert: EncryptedRecord = {
              id: remoteId || undefined,
              encrypted_data: encryptedData,
              encryption_version: 'AES-256-GCM-v1',
              timestamp: Date.now()
            }
            
            const { error } = await supabase.from('records').upsert(recordToUpsert, {
              onConflict: 'id'
            })
            
            if (error) throw new Error(`Supabase upsert 失败: ${error.message}`)
            
            // 获取插入/更新的记录 ID
            const { data: inserted, error: fetchError } = await supabase
              .from('records')
              .select('id')
              .eq('encrypted_data', encryptedData)
              .single()
            
            if (!fetchError && inserted?.id) {
              if (!remoteId) {
                localToRemoteIdMap.set(localRecordId, inserted.id)
                remoteToLocalIdMap.set(inserted.id, localRecordId)
              }
            }
          }
        } else {
          // 全量同步
          const localRecords = await db.getRawEncryptedData()
          
          if (localRecords.length === 0) {
            supabaseLogger.log('sync_no_data', '本地没有数据需要同步')
            setStatus('synced')
            return true
          }

          // 批量 upsert 到 Supabase
          const recordsToUpsert: EncryptedRecord[] = localRecords.map(record => ({
            id: localToRemoteIdMap.get(record.id) || undefined,
            encrypted_data: record.encrypted_data,
            encryption_version: record.encryption_version,
            timestamp: Date.now()
          }))

          const { error } = await supabase.from('records').upsert(recordsToUpsert, {
            onConflict: 'id'
          })

          if (error) {
            throw new Error(`Supabase upsert 失败: ${error.message}`)
          }

          // 更新 ID 映射
          for (const record of localRecords) {
            const { data: inserted, error: fetchError } = await supabase
              .from('records')
              .select('id')
              .eq('encrypted_data', record.encrypted_data)
              .single()
            
            if (!fetchError && inserted?.id) {
              localToRemoteIdMap.set(record.id, inserted.id)
              remoteToLocalIdMap.set(inserted.id, record.id)
            }
          }
        }

        supabaseLogger.log('sync_complete', `成功同步到远程`)
        
        setStats(prev => ({
          ...prev,
          lastSync: new Date(),
          syncCount: prev.syncCount + 1
        }))
        
        // 重置重试状态
        retryStateRef.current = { retryCount: 0, isRetrying: false, currentDelay: 0 }
        
        await updateStats()
        setStatus('synced')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        supabaseLogger.error('sync_failed', `同步失败: ${errorMessage}`, { retryCount })
        
        // 检查是否还有重试次数
        if (retryCount < MAX_RETRY_COUNT - 1) {
          const delay = RETRY_DELAYS[retryCount]
          retryStateRef.current = { retryCount: retryCount + 1, isRetrying: true, currentDelay: delay }
          
          supabaseLogger.log('sync_retry_scheduled', `计划 ${delay}ms 后重试`, { nextRetry: retryCount + 1 })
          
          return new Promise((resolve) => {
            setTimeout(async () => {
              const success = await syncWithRetry()
              resolve(success)
            }, delay)
          })
        } else {
          // 重试次数用尽，将操作添加到待同步队列
          supabaseLogger.error('sync_exhausted', '重试次数用尽，添加到待同步队列')
          
          if (operationType && localRecordId !== undefined) {
            await db.addToPendingSyncQueue(localRecordId, operationType, encryptedData)
            const count = await db.getPendingSyncCount()
            setPendingCount(count)
          }
          
          setLastError(`同步失败: ${errorMessage} (已加入待同步队列)`)
          setStatus('pending')
          retryStateRef.current = { retryCount: 0, isRetrying: false, currentDelay: 0 }
          return false
        }
      }
    }

    await syncWithRetry()
  }, [updateStats])

  // 将远程记录同步到本地
  const syncRemoteToLocal = useCallback(async () => {
    const supabase = getSupabase()
    
    if (!supabase || !checkSupabaseStatus().configured) {
      supabaseLogger.warn('sync_skipped', 'Supabase 未配置，跳过同步')
      return
    }

    try {
      setDirection('remote-to-local')
      setStatus('syncing')
      supabaseLogger.log('sync_start', '开始从远程同步到本地...')

      // 获取所有远程记录
      const { data: remoteRecords, error } = await supabase.from('records').select('*')
      
      if (error) {
        throw new Error(`获取远程记录失败: ${error.message}`)
      }

      if (!remoteRecords || remoteRecords.length === 0) {
        supabaseLogger.log('sync_no_data', '远程没有数据需要同步')
        setStatus('synced')
        return
      }

      for (const remoteRecord of remoteRecords) {
        const localId = remoteToLocalIdMap.get(remoteRecord.id)
        
        if (localId) {
          // 检查本地是否存在相同记录
          const localRecord = await db.encryptedRecords.get(localId)
          
          if (localRecord) {
            // 冲突处理
            const decision = resolveConflict({
              encrypted_data: localRecord.encrypted_data,
              encryption_version: localRecord.encryption_version,
              timestamp: localRecord.encrypted_data.includes(':') ? Date.now() : 0
            }, remoteRecord)

            if (decision === 'remote') {
              // 使用远程记录覆盖本地
              await db.encryptedRecords.update(localId, {
                encrypted_data: remoteRecord.encrypted_data,
                encryption_version: remoteRecord.encryption_version
              })
              supabaseLogger.log('conflict_remote_wins', `远程记录覆盖本地记录 ID: ${localId}`)
            }
          }
        } else {
          // 新记录，插入本地
          const newId = await db.encryptedRecords.add({
            encrypted_data: remoteRecord.encrypted_data,
            encryption_version: remoteRecord.encryption_version
          })
          
          // 更新 ID 映射
          localToRemoteIdMap.set(newId, remoteRecord.id)
          remoteToLocalIdMap.set(remoteRecord.id, newId)
          
          supabaseLogger.log('new_record', `从远程同步新记录: ${remoteRecord.id} -> ${newId}`)
        }
      }

      supabaseLogger.log('sync_complete', `成功同步 ${remoteRecords.length} 条记录到本地`)
      
      setStats(prev => ({
        ...prev,
        lastSync: new Date(),
        syncCount: prev.syncCount + 1
      }))
      
      await updateStats()
      setStatus('synced')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      supabaseLogger.error('sync_failed', errorMessage)
      setLastError(errorMessage)
      setStatus('error')
    }
  }, [updateStats])

  // 双向同步
  const triggerSync = useCallback(async () => {
    if (isSyncing) {
      supabaseLogger.warn('sync_in_progress', '同步正在进行中，请等待完成')
      return
    }
    
    setIsSyncing(true)
    try {
      setDirection('bidirectional')
      await syncLocalToRemote()
      await syncRemoteToLocal()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, syncLocalToRemote, syncRemoteToLocal])

  // 处理本地变更（带 2 秒防抖）
  const syncDebouncer = useRef(createDebouncer(() => {
    if (statusRef.current !== 'syncing' && statusRef.current !== 'pending') {
      syncLocalToRemote()
    }
  }, 2000))

  // 状态引用，用于防抖回调中访问最新状态
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // 更新待同步队列数量
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await db.getPendingSyncCount()
      setPendingCount(count)
      if (count > 0) {
        setStatus('pending')
      }
    } catch (error) {
      supabaseLogger.error('update_pending_count_failed', '更新待同步数量失败', { error })
    }
  }, [])

  const handleLocalChange = useCallback((change: LocalChange) => {
    if (!checkSupabaseStatus().configured) return
    
    supabaseLogger.log('local_change_detected', `检测到本地变更: ${change.type}`, { recordId: change.record.id })
    
    // 获取加密数据用于同步
    const localRecordId = change.record.id
    let encryptedData: string | undefined
    let encryptionVersion: string | undefined
    
    if (change.type !== 'DELETE') {
      encryptedData = change.record.encrypted_data
      encryptionVersion = change.record.encryption_version
    }
    
    // 如果在线，尝试同步；离线则直接添加到队列
    if (isOnlineRef.current) {
      // 使用防抖：连续 2 秒内无新变更才触发同步
      syncDebouncer.current.trigger()
    } else {
      // 离线模式，直接添加到队列
      db.addToPendingSyncQueue(localRecordId, change.type, encryptedData, encryptionVersion).then(() => {
        updatePendingCount()
        setStatus('pending')
      })
    }
  }, [updatePendingCount])

  // 启动实时同步
  const startSync = useCallback(async () => {
    const supabase = getSupabase()
    
    if (!supabase || !checkSupabaseStatus().configured) {
      supabaseLogger.warn('start_sync_skipped', 'Supabase 未配置，无法启动同步')
      return
    }

    try {
      supabaseLogger.log('start_sync', '启动实时同步...')
      setStatus('syncing')
      setIsConnected(true)

      // 先执行一次全量同步
      await triggerSync()

      // 订阅本地变更
      localChangeListener.current = db.onLocalChange(handleLocalChange)

      // 订阅 Supabase 实时变更
      realtimeSubscription.current = supabase.channel('rxlens-sync-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'records'
        }, (payload: any) => {
          supabaseLogger.log('realtime_insert', '检测到远程插入', { id: payload.new.id })
          syncRemoteToLocal()
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'records'
        }, (payload: any) => {
          supabaseLogger.log('realtime_update', '检测到远程更新', { id: payload.new.id })
          syncRemoteToLocal()
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'records'
        }, (payload: any) => {
          supabaseLogger.log('realtime_delete', '检测到远程删除', { id: payload.old.id })
          // 删除本地对应记录
          const localId = remoteToLocalIdMap.get(payload.old.id)
          if (localId) {
            db.encryptedRecords.delete(localId)
            remoteToLocalIdMap.delete(payload.old.id)
            localToRemoteIdMap.delete(localId)
          }
        })
        .subscribe()

      supabaseLogger.log('realtime_subscribed', '已订阅 Supabase 实时变更')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      supabaseLogger.error('start_sync_failed', errorMessage)
      setLastError(errorMessage)
      setStatus('error')
      setIsConnected(false)
    }
  }, [triggerSync, syncRemoteToLocal, handleLocalChange])

  // 停止实时同步
  const stopSync = useCallback(() => {
    supabaseLogger.log('stop_sync', '停止实时同步...')
    
    // 取消待执行的防抖同步
    syncDebouncer.current.cancel()
    
    // 取消本地变更监听
    if (localChangeListener.current) {
      localChangeListener.current()
      localChangeListener.current = null
    }

    // 取消远程实时订阅
    const supabase = getSupabase()
    if (supabase && realtimeSubscription.current) {
      supabase.removeChannel(realtimeSubscription.current)
      realtimeSubscription.current = null
      supabaseLogger.log('realtime_unsubscribed', '已取消订阅 Supabase 实时变更')
    }
    
    setStatus('idle')
    setIsConnected(false)
  }, [])

  // 从待同步队列同步（按时间戳顺序）
  const triggerQueueSync = useCallback(async () => {
    if (!checkSupabaseStatus().configured) {
      supabaseLogger.warn('queue_sync_skipped', 'Supabase 未配置，跳过队列同步')
      return
    }

    if (!isOnlineRef.current) {
      supabaseLogger.warn('queue_sync_skipped', '离线状态，跳过队列同步')
      return
    }

    try {
      const queue = await db.getPendingSyncQueue()
      
      if (queue.length === 0) {
        supabaseLogger.log('queue_sync_empty', '待同步队列为空')
        setStatus('synced')
        return
      }

      supabaseLogger.log('queue_sync_start', `开始同步待同步队列，共 ${queue.length} 条`)
      setStatus('syncing')

      let successCount = 0
      const failedRecords: number[] = []

      for (const record of queue) {
        try {
          // 重置重试计数
          retryStateRef.current = { retryCount: 0, isRetrying: false, currentDelay: 0 }
          
          // 尝试同步
          await syncLocalToRemote(record.operationType, record.localRecordId, record.encryptedData)
          
          // 如果状态变为 synced，移除记录
          if (status === 'synced') {
            await db.removeFromPendingSyncQueue(record.id!)
            successCount++
          } else {
            failedRecords.push(record.id!)
          }
        } catch (error) {
          supabaseLogger.error('queue_item_sync_failed', `队列项同步失败`, { recordId: record.id, error })
          failedRecords.push(record.id!)
          
          // 更新重试次数
          await db.updatePendingSyncRetry(record.id!, record.retryCount + 1, error instanceof Error ? error.message : String(error))
        }
      }

      // 更新待同步数量
      await updatePendingCount()

      if (failedRecords.length === 0) {
        supabaseLogger.log('queue_sync_complete', `队列同步完成，成功 ${successCount} 条`)
        setStatus('synced')
      } else {
        supabaseLogger.warn('queue_sync_partial', `队列同步部分失败`, { successCount, failedCount: failedRecords.length })
        setStatus('pending')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      supabaseLogger.error('queue_sync_failed', `队列同步失败: ${errorMessage}`)
      setLastError(errorMessage)
      setStatus('pending')
    }
  }, [updatePendingCount])

  // 初始化检查
  useEffect(() => {
    const status = checkSupabaseStatus()
    setIsConnected(status.configured)
    
    if (status.configured) {
      updateStats()
      updatePendingCount()
    } else {
      supabaseLogger.warn('not_configured', 'Supabase 未配置，请设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    return () => {
      stopSync()
    }
  }, [updateStats, updatePendingCount, stopSync])

  // 监听浏览器 online/offline 事件
  useEffect(() => {
    const handleOnline = async () => {
      supabaseLogger.log('browser_online', '检测到网络恢复')
      isOnlineRef.current = true
      
      // 网络恢复时，尝试同步待同步队列
      const pendingCount = await db.getPendingSyncCount()
      if (pendingCount > 0) {
        supabaseLogger.log('browser_online_resume', `待同步队列中有 ${pendingCount} 条记录，开始同步`)
        setStatus('syncing')
        await triggerQueueSync()
      }
    }

    const handleOffline = () => {
      supabaseLogger.warn('browser_offline', '检测到网络断开')
      isOnlineRef.current = false
      setLastError('网络已断开，数据将在恢复连接后同步')
    }

    // 设置初始状态
    isOnlineRef.current = typeof navigator !== 'undefined' ? navigator.onLine : true

    // 添加事件监听
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerQueueSync])

  return {
    status,
    direction,
    stats,
    isConnected,
    lastError,
    pendingCount,
    startSync,
    stopSync,
    triggerSync,
    triggerQueueSync
  }
}
