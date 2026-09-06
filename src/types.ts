// ===== 类型定义 =====

export type Verdict = 'full' | 'partial' | 'none'

export interface RubricItem {
  id: number
  name: string
  score: number
  checkPoints: string
}

export interface Assignment {
  id: string
  courseName: string
  title: string
  description: string
  deadline: string
  totalScore: number
  rubricItems: RubricItem[]
}

export interface ReviewItem {
  rubricItemId: number
  verdict: Verdict
  score: number
  evidence: string   // 报告原文逐字摘录（用于定位高亮）
  reason: string
  teacherScore?: number  // 教师复核改分（undefined=未改）
}

export interface CodeCheckEvidence {
  type: 'lib' | 'screenshot' | 'similarity'
  level: 'pass' | 'warn' | 'suspect'
  detail: string
}

export interface Review {
  items: ReviewItem[]
  aiTotal: number
  comment: {
    highlights: string
    problems: string
    suggestions: string
  }
  extraChecks: CodeCheckEvidence[]   // 代码核验附加证据
  finalized: boolean
  finalizeTs?: number
}

export type SubmissionStatus = 'pending' | 'graded' | 'suspect_fraud' | 'suspect_plagiarism'

export interface Submission {
  id: string
  studentId: string
  studentName: string
  content: string          // Markdown 报告原文
  screenshotNote?: string  // 运行截图说明
  status: SubmissionStatus
  submittedAt: string
  review?: Review
}

export interface Settings {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AppState {
  assignment: Assignment
  submissions: Submission[]
  settings: Settings
}
