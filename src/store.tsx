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
  resetAll: () => void
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
