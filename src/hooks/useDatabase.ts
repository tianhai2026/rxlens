import { useState, useEffect, useCallback } from 'react'
import { db, type Record as DBRecord } from '@/lib/db'
import {
  type AsyncState,
  createIdleState,
  createLoadingState,
  createReadyState,
  createErrorState
} from '@/lib/asyncState'
import { dataCache } from '@/lib/cache'

const RECORDS_CACHE_KEY = 'all_records'

// ===== useDatabaseRecords =====
export function useDatabaseRecords() {
  const [state, setState] = useState<AsyncState<DBRecord[]>>(createIdleState<DBRecord[]>([]))

  const loadRecords = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = dataCache.get<DBRecord[]>(RECORDS_CACHE_KEY)
      if (cached) {
        setState(createReadyState(cached))
        return
      }
    }

    setState(prev => createLoadingState(prev.data))
    try {
      const data = await db.findAll()
      dataCache.set(RECORDS_CACHE_KEY, data)
      setState(createReadyState(data))
    } catch (err) {
      setState(prev => createErrorState(err instanceof Error ? err : new Error('加载失败'), prev.data))
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const invalidateCache = useCallback(() => {
    dataCache.delete(RECORDS_CACHE_KEY)
    dataCache.delete(TODAY_STATS_CACHE_KEY)
    dataCache.delete(ALL_STATS_CACHE_KEY)
  }, [])

  const createRecord = useCallback(async (record: Omit<DBRecord, 'id' | 'schema_version' | 'timestamp'>) => {
    try {
      const newRecord: DBRecord = {
        ...record,
        schema_version: 'v1',
        timestamp: new Date()
      }
      const id = await db.create(newRecord)
      invalidateCache()
      await loadRecords(true)
      return id
    } catch (err) {
      throw err
    }
  }, [loadRecords, invalidateCache])

  const deleteRecord = useCallback(async (id: number) => {
    try {
      await db.remove(id)
      invalidateCache()
      await loadRecords(true)
    } catch (err) {
      throw err
    }
  }, [loadRecords, invalidateCache])

  const updateRecord = useCallback(async (id: number, updates: Partial<DBRecord>) => {
    try {
      await db.update(id, updates)
      invalidateCache()
      await loadRecords(true)
    } catch (err) {
      throw err
    }
  }, [loadRecords, invalidateCache])

  const refresh = useCallback(() => {
    invalidateCache()
    loadRecords(true)
  }, [loadRecords, invalidateCache])

  return {
    state,
    records: state.data ?? [],
    createRecord,
    updateRecord,
    deleteRecord,
    refresh
  }
}

// ===== useTodayStats =====
export interface TodayStatsData {
  totalAmount: number
  prescriptionCount: number
}

const TODAY_STATS_CACHE_KEY = 'today_stats'

export function useTodayStats() {
  const [state, setState] = useState<AsyncState<TodayStatsData>>(createIdleState({ totalAmount: 0, prescriptionCount: 0 }))

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = dataCache.get<TodayStatsData>(TODAY_STATS_CACHE_KEY)
      if (cached) {
        setState(createReadyState(cached))
        return
      }
    }

    setState(prev => createLoadingState(prev.data))
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const allRecords = await db.findAll()
      const todayRecords = allRecords.filter(record => {
        const timestamp = new Date(record.timestamp)
        return timestamp >= today && timestamp < tomorrow
      })

      const total = todayRecords.reduce((sum, record) => sum + record.total, 0)
      const count = todayRecords.filter(record => record.type === '处方').length

      const result = { totalAmount: total, prescriptionCount: count }
      dataCache.set(TODAY_STATS_CACHE_KEY, result)
      setState(createReadyState(result))
    } catch (err) {
      setState(prev => createErrorState(err instanceof Error ? err : new Error('加载今日统计失败'), prev.data))
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refresh = useCallback(() => {
    dataCache.delete(TODAY_STATS_CACHE_KEY)
    loadStats(true)
  }, [loadStats])

  return {
    state,
    totalAmount: state.data?.totalAmount ?? 0,
    prescriptionCount: state.data?.prescriptionCount ?? 0,
    refresh
  }
}

// ===== useAllStats =====
export interface AllStatsData {
  totalRecords: number
  totalAmount: number
  prescriptionCount: number
  receiptCount: number
  earliestRecord: string | null
  latestRecord: string | null
}

const ALL_STATS_CACHE_KEY = 'all_stats'

export function useAllStats() {
  const [state, setState] = useState<AsyncState<AllStatsData>>(createIdleState({
    totalRecords: 0,
    totalAmount: 0,
    prescriptionCount: 0,
    receiptCount: 0,
    earliestRecord: null,
    latestRecord: null
  }))

  const loadAllStats = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = dataCache.get<AllStatsData>(ALL_STATS_CACHE_KEY)
      if (cached) {
        setState(createReadyState(cached))
        return
      }
    }

    setState(prev => createLoadingState(prev.data))
    try {
      const allRecords = await db.findAll()

      const totalRecords = allRecords.length
      const totalAmount = allRecords.reduce((sum, record) => sum + record.total, 0)
      const prescriptionCount = allRecords.filter(record => record.type === '处方').length
      const receiptCount = allRecords.filter(record => record.type === '小票').length

      let earliestRecord: string | null = null
      let latestRecord: string | null = null

      if (allRecords.length > 0) {
        const timestamps = allRecords.map(record => new Date(record.timestamp).getTime())
        const earliestTimestamp = Math.min(...timestamps)
        const latestTimestamp = Math.max(...timestamps)

        earliestRecord = new Date(earliestTimestamp).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })

        latestRecord = new Date(latestTimestamp).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      const result = {
        totalRecords,
        totalAmount,
        prescriptionCount,
        receiptCount,
        earliestRecord,
        latestRecord
      }
      dataCache.set(ALL_STATS_CACHE_KEY, result)
      setState(createReadyState(result))
    } catch (err) {
      setState(prev => createErrorState(err instanceof Error ? err : new Error('加载统计数据失败'), prev.data))
    }
  }, [])

  useEffect(() => {
    loadAllStats()
  }, [loadAllStats])

  const refresh = useCallback(() => {
    dataCache.delete(ALL_STATS_CACHE_KEY)
    loadAllStats(true)
  }, [loadAllStats])

  return {
    state,
    stats: state.data ?? {
      totalRecords: 0,
      totalAmount: 0,
      prescriptionCount: 0,
      receiptCount: 0,
      earliestRecord: null,
      latestRecord: null
    },
    refresh
  }
}
