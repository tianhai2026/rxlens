import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase 日志记录器
const supabaseLogger = {
  log: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  warn: (stage: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    
  },
  error: (stage: string, error: string, context?: any) => {
    const timestamp = new Date().toISOString()
    
  }
}

// 从环境变量获取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 检查 Supabase 配置状态
export const checkSupabaseStatus = (): {
  configured: boolean
  urlSet: boolean
  keySet: boolean
} => {
  return {
    configured: !!supabaseUrl && !!supabaseAnonKey,
    urlSet: !!supabaseUrl,
    keySet: !!supabaseAnonKey
  }
}

// 创建 Supabase 客户端（仅在浏览器环境中）
let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient | null => {
  if (typeof window === 'undefined') {
    return null
  }
  
  if (!supabaseInstance && checkSupabaseStatus().configured) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }
  
  return supabaseInstance
}

// 测试 Supabase 连接
export const testSupabaseConnection = async (): Promise<{
  success: boolean
  error?: string
}> => {
  const supabase = getSupabase()
  
  if (!supabase) {
    return { success: false, error: 'Supabase 客户端不可用' }
  }
  
  try {
    supabaseLogger.log('test_connection', '测试 Supabase 连接...')
    
    const { data, error } = await supabase.from('records').select('id').limit(1)
    
    if (error) {
      supabaseLogger.error('connection_failed', error.message)
      return { success: false, error: error.message }
    }
    
    supabaseLogger.log('connection_success', 'Supabase 连接成功')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    supabaseLogger.error('connection_error', errorMessage)
    return { success: false, error: errorMessage }
  }
}

// Supabase 记录类型（加密后存储）
export interface EncryptedRecord {
  id?: string
  encrypted_data: string
  encryption_version: string
  timestamp: number
  created_at?: string
  updated_at?: string
}

export { supabaseLogger }
