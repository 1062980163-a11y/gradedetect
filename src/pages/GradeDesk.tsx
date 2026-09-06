import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Sparkles, ChevronDown, ChevronRight, Play, Loader2, Upload, Trash2, ScanSearch } from 'lucide-react'
import { useStore } from '../store'
import { StatusBadge, Spinner } from '../components/ui'
import UploadModal from '../components/UploadModal'
import { gradeSubmission, generateRubric, isDemoMode, sleep, demoLectureNote } from '../lib/ai'
import type { RubricItem } from '../types'

export default function GradeDesk() {
  const { state, updateSubmission, removeSubmission, updateAssignment } = useStore()
  const { assignment, submissions, settings } = state
  const [rubricOpen, setRubricOpen] = useState(false)
  const [grading, setGrading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const demo = isDemoMode(settings)
  const gradedCount = submissions.filter((s) => s.review).length

  /** 一键批改全部（演示模式逐份间隔模拟） */
  const gradeAll = async () => {
    if (grading) return
    setGrading(true)
    setProgress(0)
    const targets = submissions.filter((s) => !s.review)
    // 演示模式：为保留"一键批改"体验，重置后逐份批改；已批改的跳过
    const list = targets.length > 0 ? targets : []
    for (let idx = 0; idx < list.length; idx++) {
      const sub = list[idx]
      const review = await gradeSubmission(settings, assignment, sub)
      updateSubmission(sub.id, { review, status: deriveStatus(review) })
      await sleep(demo ? 800 : 200)
      setProgress(Math.round(((idx + 1) / list.length) * 100))
    }
    setGrading(false)
  }

  /** AI 生成评分细则（粘贴指导书） */
  const [lectureText, setLectureText] = useState('')
  const [rubricDraft, setRubricDraft] = useState<RubricItem[] | null>(null)
  const [rubricTitle, setRubricTitle] = useState('')
  const genRubric = async () => {
    const text = lectureText.trim() || demoLectureNote
    setGenerating(true)
    try {
      const r = await generateRubric(settings, text)
      setRubricDraft(r.rubricItems)
      setRubricTitle(r.title)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* 实验任务卡片 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-blue-600">{assignment.courseName} · 当前实验任务</div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{assignment.title}</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{assignment.description}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>截止 {assignment.deadline}</span>
              <span>满分 {assignment.totalScore}</span>
              <span>{submissions.length} 份报告</span>
              <span className={gradedCount === submissions.length ? 'text-green-600' : ''}>已批改 {gradedCount}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Upload size={15} /> 上传报告
              </button>
              <button
                onClick={gradeAll}
                disabled={grading || gradedCount === submissions.length}
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {grading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {grading ? `批改中 ${progress}%` : gradedCount === submissions.length ? '全部已批改' : '一键批改全部'}
              </button>
            </div>
            {grading && (
              <div className="h-1.5 w-44 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* 评分细则 */}
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60">
          <button
            onClick={() => setRubricOpen(!rubricOpen)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <span className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              评分细则（{assignment.rubricItems.length} 项 · 共 {assignment.rubricItems.reduce((s, r) => s + r.score, 0)} 分）
            </span>
            {rubricOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </button>
          {rubricOpen && (
            <div className="space-y-1.5 px-4 pb-4">
              {assignment.rubricItems.map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-50 text-[11px] font-bold text-blue-700">{r.id}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{r.name} <span className="ml-1 text-xs font-normal text-slate-400">{r.score} 分</span></div>
                    <div className="text-xs text-slate-500">{r.checkPoints}</div>
                  </div>
                </div>
              ))}

              {/* AI 生成评分细则 */}
              <div className="mt-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <Sparkles size={14} /> AI 生成评分细则
                </div>
                <textarea
                  value={lectureText}
                  onChange={(e) => setLectureText(e.target.value)}
                  placeholder={`粘贴实验指导书文本，AI 自动抽取评分细则。（演示模式下留空并点击按钮，将加载示例指导书）`}
                  className="mt-2 h-20 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
                <button
                  onClick={genRubric}
                  disabled={generating}
                  className="mt-2 flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:bg-slate-300"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {generating ? '解析中…' : '解析指导书，生成评分细则'}
                </button>
                {rubricDraft && (
                  <div className="mt-3 rounded-md bg-white p-3 text-xs">
                    <div className="mb-2 font-semibold text-slate-700">生成结果：{rubricTitle}</div>
                    <ul className="list-inside list-decimal space-y-1 text-slate-600">
                      {rubricDraft.map((r) => <li key={r.id}>{r.name}（{r.score} 分）— {r.checkPoints}</li>)}
                    </ul>
                    <button
                      onClick={() => {
                        if (window.confirm('应用新评分细则？现有批改结果保留，新批改将按新细则执行。')) {
                          updateAssignment({ rubricItems: rubricDraft })
                          setRubricDraft(null)
                        }
                      }}
                      className="mt-2.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      应用为新评分细则
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 报告列表 */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ScanSearch size={15} className="text-slate-400" /> 学生报告（{submissions.length} 份）
          </span>
          {submissions.some((s) => s.status === 'pending') && (
            <span className="text-xs text-slate-400">有 {submissions.filter((s) => s.status === 'pending').length} 份待批改</span>
          )}
        </div>

        {submissions.length === 0 ? (
          /* 真实教学模式空状态：上传引导 */
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Upload size={28} className="text-blue-600" />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-800">真实教学模式已就绪</h3>
            <p className="mt-1.5 max-w-md text-center text-sm leading-relaxed text-slate-500">
              演示人名已清空。开始真实教学三步走：<br />
              ① 粘贴实验指导书，AI 生成评分细则（可手动微调）<br />
              ② 上传学生报告（Markdown / 纯文本）<br />
              ③ 一键批改，逐项证据核查
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => { setRubricOpen(true) }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Sparkles size={14} /> 先配置评分细则
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Upload size={14} /> 上传第一份报告
              </button>
            </div>
          </div>
        ) : (
        <>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
              <th className="px-5 py-2.5 font-medium">学号</th>
              <th className="px-3 py-2.5 font-medium">姓名</th>
              <th className="px-3 py-2.5 font-medium">提交时间</th>
              <th className="px-3 py-2.5 font-medium">状态</th>
              <th className="px-3 py-2.5 text-right font-medium">总分</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                <td className="px-5 py-3 font-mono text-[13px] text-slate-600">{s.studentId}</td>
                <td className="px-3 py-3 font-medium text-slate-800">{s.studentName}</td>
                <td className="px-3 py-3 text-xs text-slate-400">{s.submittedAt}</td>
                <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-3 py-3 text-right">
                  {s.review ? (
                    <span className="font-mono text-[15px] font-bold text-slate-900">{s.review.aiTotal}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/review/${s.id}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                    >
                      {s.review ? '查看批改' : '去批改'}
                    </Link>
                    {!s.review && (
                      <button
                        onClick={() => { if (window.confirm(`确认删除 ${s.studentName}（${s.studentId}）的报告？`)) removeSubmission(s.id) }}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        title="删除报告"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
           </tbody>
        </table>
        </>
        )}
      </section>

      {grading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-white shadow-xl">
          <Spinner text={`正在逐项核查第 ${progress > 0 ? Math.ceil((progress / 100) * submissions.filter((s) => !s.review).length + submissions.filter((s) => s.review).length) : 1} 份…`} />
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  )
}

function deriveStatus(review: NonNullable<import('../types').Submission['review']>): import('../types').Submission['status'] {
  const hasSuspect = review.extraChecks.some((c) => c.level === 'suspect')
  if (hasSuspect) {
    const sim = review.extraChecks.find((c) => c.type === 'similarity')
    return sim ? 'suspect_plagiarism' : 'suspect_fraud'
  }
  return 'graded'
}
