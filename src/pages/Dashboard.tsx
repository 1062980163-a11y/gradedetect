import { useMemo, useState } from 'react'
import { BarChart3, Sparkles, Download, FileText } from 'lucide-react'
import { useStore } from '../store'
import { MiniMarkdown, Spinner } from '../components/ui'
import { generateReviewPlan } from '../lib/ai'

export default function Dashboard() {
  const { state } = useStore()
  const { assignment, submissions, settings } = state
  const [plan, setPlan] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const graded = submissions.filter((s) => s.review)
  const scores = graded.map((s) => s.review!.aiTotal)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const max = scores.length ? Math.max(...scores) : 0
  const min = scores.length ? Math.min(...scores) : 0

  /** 各评分点得分率（由 6 份数据实时计算，不写死） */
  const rubricStats = useMemo(() => {
    return assignment.rubricItems.map((r) => {
      const items = graded
        .map((s) => s.review!.items.find((it) => it.rubricItemId === r.id))
        .filter(Boolean)
      const earned = items.reduce((sum, it) => sum + (it!.teacherScore ?? it!.score), 0)
      const full = items.length * r.score
      return { ...r, rate: full > 0 ? earned / full : 0, count: items.length }
    })
  }, [assignment, graded])

  const worst = [...rubricStats].sort((a, b) => a.rate - b.rate).slice(0, 2)

  const genPlan = async () => {
    setGenerating(true)
    try {
      const statsText = [
        `实验：${assignment.title}（满分 ${assignment.totalScore}）`,
        `班级人数：${submissions.length}，已批改：${graded.length}`,
        `平均分：${avg.toFixed(1)}，最高：${max}，最低：${min}`,
        `各评分点得分率：${rubricStats.map((r) => `${r.name} ${(r.rate * 100).toFixed(0)}%`).join('；')}`,
        `得分率最低的两项：${worst.map((w) => w.name).join('、')}`,
        `真实性检测：调库警告 ${submissions.filter((s) => s.review?.extraChecks.some((c) => c.type === 'lib' && c.level !== 'pass')).length} 份，截图矛盾 ${submissions.filter((s) => s.review?.extraChecks.some((c) => c.type === 'screenshot' && c.level !== 'pass')).length} 份，疑似抄袭 1 对`,
      ].join('\n')
      const md = await generateReviewPlan(settings, statsText)
      setPlan(md)
    } finally {
      setGenerating(false)
    }
  }

  /** CSV 导出（含 AI 建议分/教师定稿分两列） */
  const exportCSV = () => {
    const header = ['学号', '姓名', 'AI建议总分', '教师定稿总分', ...assignment.rubricItems.map((r) => r.name)]
    const rows = submissions.map((s) => {
      const r = s.review
      const teacherTotal = r ? r.items.reduce((sum, it) => sum + (it.teacherScore ?? it.score), 0) : ''
      return [
        s.studentId, s.studentName,
        r ? r.aiTotal : '',
        r ? teacherTotal : '',
        ...assignment.rubricItems.map((item) => {
          const it = r?.items.find((x) => x.rubricItemId === item.id)
          return it ? (it.teacherScore ?? it.score) : ''
        }),
      ]
    })
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `成绩单_${assignment.title}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // 直方图分桶
  const buckets = [0, 20, 40, 60, 80, 100]
  const hist = buckets.slice(0, -1).map((lo, i) => {
    const hi = buckets[i + 1]
    return { label: `${lo}-${hi}`, count: scores.filter((s) => s >= lo && (i === buckets.length - 2 ? s <= hi : s < hi)).length }
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex items-end justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BarChart3 size={22} className="text-blue-700" /> 班级看板
        </h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <Download size={14} /> 导出成绩单 CSV
        </button>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="班级平均分" value={avg.toFixed(1)} sub={`满分 ${assignment.totalScore}`} tone={avg / assignment.totalScore >= 0.7 ? 'green' : avg / assignment.totalScore >= 0.5 ? 'amber' : 'red'} />
        <StatCard label="最高分" value={String(max)} sub={graded.length ? `${graded.find((s) => s.review!.aiTotal === max)?.studentName}` : ''} tone="green" />
        <StatCard label="最低分" value={String(min)} sub={graded.length ? `${graded.find((s) => s.review!.aiTotal === min)?.studentName}` : ''} tone="red" />
        <StatCard label="疑点报告" value={String(submissions.filter((s) => s.status === 'suspect_fraud' || s.status === 'suspect_plagiarism').length)} sub={`已批改 ${graded.length}/${submissions.length}`} tone="red" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        {/* 分数分布直方图 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">分数分布</h2>
          <div className="mt-4 flex h-40 items-end gap-3">
            {hist.map((b) => {
              const h = scores.length ? Math.max((b.count / Math.max(...hist.map((x) => x.count), 1)) * 100, b.count > 0 ? 8 : 2) : 2
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500">{b.count}</span>
                  <div className="w-full rounded-t-md bg-blue-600/85 transition-all hover:bg-blue-700" style={{ height: `${h}%` }} />
                  <span className="text-[11px] text-slate-400">{b.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 评分点得分率 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">评分点得分率 <span className="ml-1 text-xs font-normal text-slate-400">最低项标红，课堂重点讲评</span></h2>
          <div className="mt-4 space-y-3">
            {rubricStats.map((r) => {
              const pct = Math.round(r.rate * 100)
              const worst1 = r.id === worst[0]?.id
              return (
                <div key={r.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={worst1 ? 'font-semibold text-red-600' : 'text-slate-600'}>
                      {r.id}. {r.name}
                      {worst1 && <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-bold text-red-600">全班最低</span>}
                    </span>
                    <span className={`font-mono font-bold ${worst1 ? 'text-red-600' : pct >= 70 ? 'text-green-600' : 'text-slate-500'}`}>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${worst1 ? 'bg-red-500' : pct >= 70 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* 讲评提纲 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText size={15} className="text-slate-400" /> 一键生成讲评提纲
            <span className="text-xs font-normal text-slate-400">针对得分率最低的 {worst.length} 项：典型错误 + 讲解要点 + 课堂提问建议</span>
          </h2>
          <button
            onClick={genPlan}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            <Sparkles size={13} className={generating ? 'animate-pulse' : ''} />
            {generating ? '生成中…' : plan ? '重新生成' : '生成讲评提纲'}
          </button>
        </div>
        {generating && <div className="mt-4"><Spinner text="正在汇总班级数据并生成讲评提纲…" /></div>}
        {plan && !generating && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <MiniMarkdown text={plan} />
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'green' | 'amber' | 'red' }) {
  const toneCls = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600' }[tone]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}
