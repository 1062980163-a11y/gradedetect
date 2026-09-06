import { useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Quote, CircleAlert, Lock, Pencil, Loader2, FileSearch } from 'lucide-react'
import { useStore } from '../store'
import { MiniMarkdown, VerdictIcon } from '../components/ui'
import { gradeSubmission, isDemoMode } from '../lib/ai'
import { locateEvidence } from '../lib/algorithms'
import type { ReviewItem } from '../types'

export default function ReviewDetail() {
  const { id } = useParams()
  const { state, updateSubmission, updateReview } = useStore()
  const { assignment, submissions, settings } = state

  const idx = submissions.findIndex((s) => s.id === id)
  const sub = submissions[idx]
  const reportRef = useRef<HTMLDivElement>(null)
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined)
  const [grading, setGrading] = useState(false)
  const [commentTone, setCommentTone] = useState<'严谨' | '鼓励' | '简洁'>('严谨')

  if (!sub) {
    return <div className="p-10 text-center text-slate-400">未找到该报告</div>
  }

  const demo = isDemoMode(settings)
  const review = sub.review
  void demo
  const rubricMap = useMemo(() => new Map(assignment.rubricItems.map((r) => [r.id, r])), [assignment.rubricItems])

  /** 灵魂交互：点击证据 → 左侧报告滚动定位 + 高亮 */
  const locate = (evidence: string) => {
    const line = locateEvidence(sub.content, evidence)
    if (line < 0 || !reportRef.current) return
    // 目标行元素：MiniMarkdown 中代码块行有 data-line，普通行按行高估算滚动
    const el = reportRef.current.querySelector(`[data-line="${line}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightLine(line)
    } else {
      // 非代码行：按行序估算（段落数与行数接近，用 28px 行高滚动）
      reportRef.current.scrollTo({ top: Math.max(0, line * 28 - 120), behavior: 'smooth' })
      setHighlightLine(line)
    }
    window.setTimeout(() => setHighlightLine(undefined), 2200)
  }

  /** 批改当前报告 */
  const doGrade = async () => {
    if (grading) return
    setGrading(true)
    try {
      const r = await gradeSubmission(settings, assignment, sub)
      updateSubmission(sub.id, { review: r, status: r.extraChecks.some((c) => c.level === 'suspect') ? 'suspect_fraud' : 'graded' })
    } finally {
      setGrading(false)
    }
  }

  /** 教师改分 */
  const setTeacherScore = (itemId: number, val: number) => {
    if (!review) return
    const items = review.items.map((it) => it.rubricItemId === itemId ? { ...it, teacherScore: val } : it)
    updateReview(sub.id, { items })
  }

  const finalize = () => {
    if (!review || review.finalized) return
    if (window.confirm('确认定稿？定稿后本次批改结果将锁定（可撤销）。')) {
      updateReview(sub.id, { finalized: true, finalizeTs: Date.now() })
    }
  }

  const teacherTotal = review ? review.items.reduce((s, it) => s + (it.teacherScore ?? it.score), 0) : 0

  const toneComment = useMemo(() => {
    if (!review) return null
    const { highlights, problems, suggestions } = review.comment
    const name = sub.studentName
    switch (commentTone) {
      case '鼓励':
        return { h: `${name}同学，${highlights}`, p: `可以做得更好的地方：${problems}`, s: `下一步建议：${suggestions}` }
      case '简洁':
        return { h: `亮点：${highlights.slice(0, 60)}…`, p: `问题：${problems.slice(0, 60)}…`, s: `建议：${suggestions.slice(0, 60)}…` }
      default:
        return { h: highlights, p: problems, s: suggestions }
    }
  }, [review, commentTone, sub.studentName])

  return (
    <div className="flex h-full">
      {/* 左侧：报告原文 */}
      <div className="flex w-[58%] flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600">
              <ChevronLeft size={16} /> 返回
            </Link>
            <span className="text-sm font-semibold text-slate-800">{sub.studentName} 的报告</span>
            <span className="font-mono text-xs text-slate-400">{sub.studentId}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <FileSearch size={13} /> 点击右侧证据可定位原文
          </div>
        </div>
        <div ref={reportRef} className="flex-1 overflow-y-auto px-6 py-4">
          <MiniMarkdown text={sub.content} highlightLine={highlightLine} />
        </div>
      </div>

      {/* 右侧：评分结果 */}
      <div className="flex w-[42%] flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-5 py-3">
          {!review ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">尚未批改</span>
              <button
                onClick={doGrade}
                disabled={grading}
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                {grading ? <Loader2 size={15} className="animate-spin" /> : null}
                {grading ? '逐项核查中…' : '开始逐项核查'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-400">总分 / 满分</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">{review.finalized ? teacherTotal : review.aiTotal}</span>
                    <span className="text-sm text-slate-400">/ {assignment.totalScore}</span>
                    {review.finalized && <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">已定稿</span>}
                  </div>
                  {teacherTotal !== review.aiTotal && (
                    <div className="mt-0.5 text-xs text-amber-600">教师复核分 {teacherTotal}（AI 建议 {review.aiTotal}）</div>
                  )}
                </div>
                <ScoreRing score={review.finalized ? teacherTotal : review.aiTotal} total={assignment.totalScore} />
              </div>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />全对 {review.items.filter((i) => i.verdict === 'full').length}</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />部分 {review.items.filter((i) => i.verdict === 'partial').length}</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-400" />未达成 {review.items.filter((i) => i.verdict === 'none').length}</span>
              </div>
            </>
          )}
        </div>

        {review && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 评分点卡片流 */}
            <div className="space-y-3">
              {review.items.map((item) => (
                <RubricCard
                  key={item.rubricItemId}
                  item={item}
                  rubricName={rubricMap.get(item.rubricItemId)?.name ?? `评分点 ${item.rubricItemId}`}
                  rubricScore={rubricMap.get(item.rubricItemId)?.score ?? 0}
                  onLocate={() => locate(item.evidence)}
                  onTeacherScore={(v) => setTeacherScore(item.rubricItemId, v)}
                  locked={review.finalized}
                />
              ))}
            </div>

            {/* 代码核验附加证据 */}
            {review.extraChecks.filter((c) => c.level !== 'pass').length > 0 && (
              <div className="mt-4 space-y-2">
                {review.extraChecks.filter((c) => c.level !== 'pass').map((c, i) => (
                  <div key={i} className={`rounded-lg border px-3 py-2.5 text-sm ${c.level === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CircleAlert size={14} /> {c.type === 'lib' ? '调库检测' : c.type === 'screenshot' ? '截图比对' : '相似度检测'}
                    </div>
                    <div className="mt-1 text-[13px] leading-relaxed">{c.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 总评 */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">总评</div>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
                  {(['严谨', '鼓励', '简洁'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCommentTone(t)}
                      className={`rounded-md px-2.5 py-1 transition-colors ${commentTone === t ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {toneComment && (
                <div className="mt-3 space-y-2.5">
                  <CommentBlock label="亮点" cls="border-green-300 bg-green-50 text-green-900" text={toneComment.h} />
                  <CommentBlock label="问题" cls="border-amber-300 bg-amber-50 text-amber-900" text={toneComment.p} />
                  <CommentBlock label="建议" cls="border-blue-300 bg-blue-50 text-blue-900" text={toneComment.s} />
                </div>
              )}
            </div>

            {/* 定稿 */}
            <div className="mt-4 flex justify-end gap-2">
              {review.finalized ? (
                <button
                  onClick={() => updateReview(sub.id, { finalized: false, finalizeTs: undefined })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  撤销定稿
                </button>
              ) : (
                <button
                  onClick={finalize}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Lock size={14} /> 确认定稿
                </button>
              )}
            </div>

            {/* 上一份/下一份 */}
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
              <PagerBtn dir={-1} disabled={idx <= 0} targetId={submissions[idx - 1]?.id} label={submissions[idx - 1] ? `${submissions[idx - 1].studentName} 的报告` : '已是第一份'} />
              <PagerBtn dir={1} disabled={idx >= submissions.length - 1} targetId={submissions[idx + 1]?.id} label={submissions[idx + 1] ? `${submissions[idx + 1].studentName} 的报告` : '已是最后一份'} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RubricCard({ item, rubricName, rubricScore, onLocate, onTeacherScore, locked }: {
  item: ReviewItem
  rubricName: string
  rubricScore: number
  onLocate: () => void
  onTeacherScore: (v: number) => void
  locked: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VerdictIcon v={item.verdict} />
          <span className="text-sm font-semibold text-slate-800">{rubricName}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.teacherScore !== undefined && item.teacherScore !== item.score && (
            <span className="text-[11px] text-slate-400 line-through">{item.score}</span>
          )}
          <span className={`font-mono text-lg font-bold ${item.verdict === 'full' ? 'text-green-600' : item.verdict === 'partial' ? 'text-amber-600' : 'text-slate-400'}`}>
            {item.teacherScore ?? item.score}
          </span>
          <span className="text-xs text-slate-400">/ {rubricScore}</span>
        </div>
      </div>

      {/* 证据引用块（灵魂交互：点击定位原文） */}
      <button
        onClick={onLocate}
        className="group mt-3 block w-full rounded-lg border-l-4 border-blue-400 bg-blue-50/60 px-3 py-2 text-left transition-colors hover:bg-blue-100/70"
        title="点击定位报告原文"
      >
        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-blue-500">
          <Quote size={10} /> 证据 · 点击定位原文
        </div>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-slate-700">{item.evidence}</pre>
      </button>

      <div className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.reason}</div>

      {/* 教师复核 */}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
        <Pencil size={12} className="text-slate-400" />
        <span className="text-xs text-slate-400">教师复核：</span>
        <input
          type="number"
          min={0}
          max={rubricScore}
          value={item.teacherScore ?? item.score}
          disabled={locked}
          onChange={(e) => onTeacherScore(Number(e.target.value))}
          className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <span className="text-xs text-slate-300">分（满分 {rubricScore}）</span>
        {item.teacherScore !== undefined && item.teacherScore !== item.score && (
          <span className="text-[11px] text-amber-600">AI 建议 {item.score} 分 → 教师改为 {item.teacherScore} 分</span>
        )}
      </div>
    </div>
  )
}

function CommentBlock({ label, cls, text }: { label: string; cls: string; text: string }) {
  return (
    <div className={`rounded-lg border-l-4 px-3 py-2 text-[13px] leading-relaxed ${cls}`}>
      <span className="mr-1.5 font-semibold">{label}</span>{text}
    </div>
  )
}

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? score / total : 0
  const r = 26
  const c = 2 * Math.PI * r
  const color = pct >= 0.8 ? '#059669' : pct >= 0.6 ? '#D97706' : '#DC2626'
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 34 34)" />
      <text x="34" y="38" textAnchor="middle" className="fill-slate-800" fontSize="14" fontWeight="bold">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

function PagerBtn({ dir, disabled, targetId, label }: { dir: -1 | 1; disabled: boolean; targetId?: string; label: string }) {
  if (disabled || !targetId) {
    return <span className="cursor-not-allowed text-xs text-slate-300">{label}</span>
  }
  return (
    <Link to={`/review/${targetId}`} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
      {dir === -1 && <ChevronLeft size={14} />}
      {label}
      {dir === 1 && <ChevronRight size={14} />}
    </Link>
  )
}
