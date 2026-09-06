import { Fragment, useMemo, useRef, useState } from 'react'
import { ShieldCheck, Fingerprint, ScanEye, GitCompareArrows, ChevronUp, ChevronDown, TriangleAlert, CheckCircle2, CircleAlert } from 'lucide-react'
import { useStore } from '../store'
import { runIntegrityCheck, type IntegrityResult } from '../lib/ai'
import { extractNormalizedCode } from '../lib/algorithms'

export default function Integrity() {
  const { state } = useStore()
  const { submissions } = state
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterSuspect, setFilterSuspect] = useState(false)
  const detailRowRef = useRef<HTMLTableRowElement>(null)

  const toggleExpand = (id: string) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    // 展开后把详情行滚到视野内，避免“点了没反应”的感觉
    if (next) {
      window.setTimeout(() => {
        detailRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }

  const result: IntegrityResult = useMemo(() => runIntegrityCheck(submissions), [submissions])

  const suspectCount = submissions.filter((s, i) =>
    result.libCheck[i].level !== 'pass' || result.screenshotCheck[i].level !== 'pass' || result.suspectPairs.some((p) => p.a.startsWith(s.studentName) || p.b.startsWith(s.studentName)),
  ).length

  const shown = filterSuspect
    ? submissions.filter((s, i) =>
        result.libCheck[i].level !== 'pass' || result.screenshotCheck[i].level !== 'pass' || result.suspectPairs.some((p) => p.a.startsWith(s.studentName) || p.b.startsWith(s.studentName)),
      )
    : submissions

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* 页头 */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ShieldCheck size={22} className="text-blue-700" /> 真实性体检
          </h1>
          <p className="mt-1 text-sm text-slate-500">调库检测 · 截图输出比对 · 代码相似度查重——三重防线，人眼看不出来的，算法看得出来</p>
        </div>
      </div>

      {/* 结论条 */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="text-sm text-slate-600">
            <b className="text-green-700">{submissions.length - suspectCount} 份通过</b>
            <span className="mx-2 text-slate-300">·</span>
            <b className="text-red-600">{suspectCount} 份存在疑点</b>
          </span>
        </div>
        <button
          onClick={() => setFilterSuspect(!filterSuspect)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterSuspect ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          {filterSuspect ? '显示全部' : '只看疑点'}
        </button>
      </div>

      {/* 检测矩阵表 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">学生</th>
              <th className="px-3 py-3 font-medium"><span className="flex items-center gap-1"><Fingerprint size={13} /> 调库检测</span></th>
              <th className="px-3 py-3 font-medium"><span className="flex items-center gap-1"><ScanEye size={13} /> 截图比对</span></th>
              <th className="px-3 py-3 font-medium"><span className="flex items-center gap-1"><GitCompareArrows size={13} /> 相似度</span></th>
              <th className="px-3 py-3 font-medium">检测详情</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const i = submissions.indexOf(s)
              const lib = result.libCheck[i]
              const shot = result.screenshotCheck[i]
              const simPair = result.suspectPairs.find((p) => p.a.startsWith(s.studentName) || p.b.startsWith(s.studentName))
              const simLevel: 'pass' | 'suspect' = simPair ? 'suspect' : 'pass'
              const isOpen = expanded === s.id
              return (
                <Fragment key={s.id}>
                  <tr className={`border-b border-slate-50 ${isOpen ? 'bg-blue-50/40' : 'hover:bg-blue-50/20'}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{s.studentName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{s.studentId}</div>
                    </td>
                    <td className="px-3 py-3"><Check level={lib.level} /></td>
                    <td className="px-3 py-3"><Check level={shot.level} /></td>
                    <td className="px-3 py-3"><Check level={simLevel} /></td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleExpand(s.id)}
                        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                          isOpen ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isOpen ? '收起' : '展开'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr ref={detailRowRef} className="border-b border-slate-100 bg-slate-50/70">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-slate-400">
                          <ChevronUp size={13} /> 检测详情 · {s.studentName}
                        </div>
                        <div className="space-y-3 text-[13px] leading-relaxed">
                          <DetailLine icon={<Fingerprint size={13} />} title="调库检测" level={lib.level} text={lib.detail} />
                          <DetailLine icon={<ScanEye size={13} />} title="截图比对" level={shot.level} text={shot.detail} />
                          {simPair ? (
                            <DetailLine icon={<GitCompareArrows size={13} />} title="相似度检测" level="suspect" text={`与 ${simPair.a.startsWith(s.studentName) ? simPair.b : simPair.a} 存在最长 ${simPair.run} 字连续相同文字段（逐字复制级别，变量名归一化后代码相似度 ${(simPair.sim * 100).toFixed(0)}%）——判定为疑似抄袭对`} />
                          ) : (
                            <DetailLine icon={<GitCompareArrows size={13} />} title="相似度检测" level="pass" text="与全班其他报告的最长公共连续文字段均低于 150 字阈值" />
                          )}
                          {/* 归一化代码预览 */}
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">归一化代码预览（标识符→VARn，字符串→STRn）</div>
                            <pre className="gd-code-block max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-600">
                              {extractNormalizedCode(s.content).slice(0, 600) || '（无代码块）'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 相似度矩阵热力图 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GitCompareArrows size={15} className="text-slate-400" /> 全班相似度矩阵
          <span className="ml-2 text-xs font-normal text-slate-400">归一化代码 3-gram 相似度 · 抄袭判定另叠加"最长公共连续文字段 ≥150字"信号</span>
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th />
                {submissions.map((s) => (
                  <th key={s.id} className="px-2 pb-2 font-medium text-slate-500">{s.studentName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((rowS, i) => (
                <tr key={rowS.id}>
                  <td className="pr-3 text-right font-medium text-slate-500">{rowS.studentName}</td>
                  {submissions.map((colS, j) => {
                    const sim = result.similarity[i][j]
                    const isPlagiarismPair = i !== j && result.textRuns[i][j] >= 150
                    return (
                      <td key={colS.id} className="p-0.5">
                        <div
                          className={`flex h-10 w-14 items-center justify-center rounded font-mono text-[11px] ${i === j ? 'text-slate-300' : isPlagiarismPair ? 'bg-red-500 font-bold text-white' : 'text-slate-600'}`}
                          style={{ backgroundColor: i === j || isPlagiarismPair ? undefined : `rgba(29, 78, 216, ${Math.min(0.08 + sim * 0.5, 0.45)})` }}
                          title={`${rowS.studentName} × ${colS.studentName}：代码相似度 ${(sim * 100).toFixed(1)}%，最长公共文字段 ${result.textRuns[i][j]} 字`}
                        >
                          {i === j ? '—' : `${(sim * 100).toFixed(0)}%`}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.suspectPairs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {result.suspectPairs.map((p, idx) => (
              <span key={idx} className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <TriangleAlert size={12} /> 疑似抄袭对：{p.a} ↔ {p.b}（{p.run} 字逐字相同段落）
              </span>
            ))}
          </div>
        )}
        {result.suspectPairs.length === 0 && (
          <div className="mt-4 text-xs text-slate-400">未发现逐字复制级别的疑似抄袭对（阈值：连续 150 字相同）</div>
        )}
      </section>
    </div>
  )
}

function Check({ level }: { level: 'pass' | 'warn' | 'suspect' }) {
  if (level === 'pass') {
    return <span className="flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={14} /> 通过</span>
  }
  if (level === 'warn') {
    return <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><CircleAlert size={14} /> 警告</span>
  }
  return <span className="flex items-center gap-1 text-xs font-medium text-red-600"><TriangleAlert size={14} /> 疑似</span>
}

function DetailLine({ icon, title, level, text }: { icon: React.ReactNode; title: string; level: string; text: string }) {
  const cls = level === 'pass' ? 'text-slate-600' : level === 'warn' ? 'text-amber-700' : 'text-red-700'
  return (
    <div className={`flex items-start gap-2 ${cls}`}>
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span><b className="mr-1.5">{title}：</b>{text}</span>
    </div>
  )
}
