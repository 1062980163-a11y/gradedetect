import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppState, Submission, Settings } from './types'
import { initialAssignment, initialSubmissions } from './data/demoData'

// ===== 全局状态：localStorage 持久化 =====

const STORAGE_KEY = 'gd_state_v1'

const defaultSettings: Settings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      return {
        assignment: parsed.assignment ?? initialAssignment,
        submissions: parsed.submissions ?? initialSubmissions,
        settings: { ...defaultSettings, ...parsed.settings },
      }
    }
  } catch { /* 损坏则重置 */ }
  return { assignment: initialAssignment, submissions: initialSubmissions, settings: defaultSettings }
}

interface Store {
  state: AppState
  setSettings: (s: Partial<Settings>) => void
  updateSubmission: (id: string, patch: Partial<Submission>) => void
  updateReview: (id: string, patch: Partial<NonNullable<Submission['review']>>) => void
  addSubmission: (sub: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => string
  updateAssignment: (patch: Partial<AppState['assignment']>) => void
  removeSubmission: (id: string) => void
  resetAll: () => void
  /** 真实教学模式：清空全部演示报告，保留评分细则与设置，得到干净系统供真实教学使用 */
  clearDemoData: () => void
  /** 恢复演示数据（预置 6 份报告与批改结果） */
  restoreDemoData: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { /* 存储满时忽略 */ }
  }, [state])

  const store: Store = {
    state,
    setSettings: (s) => setState((prev) => ({ ...prev, settings: { ...prev.settings, ...s } })),
    updateSubmission: (id, patch) => setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
    })),
    updateReview: (id, patch) => setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((sub) =>
        sub.id === id && sub.review ? { ...sub, review: { ...sub.review, ...patch } } : sub,
      ),
    })),
    addSubmission: (sub) => {
      const id = `s${Date.now()}`
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const submittedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
      setState((prev) => ({
        ...prev,
        submissions: [...prev.submissions, { ...sub, id, status: 'pending', submittedAt }],
      }))
      return id
    },
    updateAssignment: (patch) => setState((prev) => ({ ...prev, assignment: { ...prev.assignment, ...patch } })),
    removeSubmission: (id) => setState((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => s.id !== id),
    })),
    clearDemoData: () => setState((prev) => ({
      ...prev,
      submissions: [],
    })),
    restoreDemoData: () => setState((prev) => {
      const demoSubs = JSON.parse(JSON.stringify(initialSubmissions)) as Submission[]
      // 保留已有的真实报告（非演示学号），演示数据追加在后面；同 ID/同学号去重
      const demoIds = new Set(demoSubs.map((s) => s.studentId))
      const kept = prev.submissions.filter((s) => !demoIds.has(s.studentId))
      return { ...prev, submissions: [...kept, ...demoSubs] }
    }),
    resetAll: () => {
      localStorage.removeItem(STORAGE_KEY)
      setState({ assignment: initialAssignment, submissions: initialSubmissions, settings: defaultSettings })
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
