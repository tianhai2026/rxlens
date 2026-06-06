/**
 * 异步状态管理工具
 * 将分散的 loading / error / data 收敛为统一的联合类型状态
 * 消除状态不同步隐患，支持声明式模板渲染
 */

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: Error | null
}

export function createIdleState<T>(initialData: T | null = null): AsyncState<T> {
  return { status: 'idle', data: initialData, error: null }
}

export function createLoadingState<T>(prevData: T | null = null): AsyncState<T> {
  return { status: 'loading', data: prevData, error: null }
}

export function createReadyState<T>(data: T): AsyncState<T> {
  return { status: 'ready', data, error: null }
}

export function createErrorState<T>(error: Error, prevData: T | null = null): AsyncState<T> {
  return { status: 'error', data: prevData, error }
}

// ===== 节流工具 =====
export function createThrottler<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): {
  trigger: (...args: Parameters<T>) => void
  cancel: () => void
  flush: () => void
} {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  return {
    trigger: (...args: Parameters<T>) => {
      lastArgs = args
      const now = Date.now()
      if (now - lastTime >= delay) {
        lastTime = now
        fn(...args)
      } else if (!timer) {
        timer = setTimeout(() => {
          lastTime = Date.now()
          timer = null
          if (lastArgs) fn(...lastArgs)
        }, delay - (now - lastTime))
      }
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
    flush: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (lastArgs) {
        lastTime = Date.now()
        fn(...lastArgs)
      }
    }
  }
}

// ===== 防抖工具 =====
export function createDebouncer<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): {
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
