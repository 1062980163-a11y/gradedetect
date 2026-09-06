import type { Submission, Verdict } from '../types'

// ===== 通用 UI 小组件 =====

export function VerdictIcon({ v }: { v: Verdict }) {
  if (v === 'full') return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-700">✓</span>
  if (v === 'partial') return <span className="inline-flex h-5 w-5 items-center justify-center rounded-half bg-amber-100 text-[11px] font-bold text-amber-700">½</span>
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-500">✕</span>
}

export function StatusBadge({ status }: { status: Submission['status'] }) {
  const map: Record<Submission['status'], { label: string; cls: string }> = {
    pending: { label: '待批改', cls: 'bg-slate-100 text-slate-600' },
    graded: { label: '已批改', cls: 'bg-blue-50 text-blue-700' },
    suspect_fraud: { label: '疑似造假', cls: 'bg-red-50 text-red-600' },
    suspect_plagiarism: { label: '疑似抄袭', cls: 'bg-orange-50 text-orange-600' },
  }
  const m = map[status]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>
}

export function ModeBadge({ demo, onClick }: { demo: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${demo ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
      title="点击前往设置"
    >
      <span className={`h-2 w-2 rounded-full ${demo ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`} />
      {demo ? '演示模式' : '在线模式'}
    </button>
  )
}

export function Spinner({ text }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {text}
    </span>
  )
}

/** 简易 Markdown 渲染（标题/粗体/代码块/表格/列表，够用即可） */
export function MiniMarkdown({ text, highlightLine }: { text: string; highlightLine?: number }) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0
  let tableBuf: string[][] = []

  const flushTable = () => {
    if (tableBuf.length === 0) return
    const [head, ...rows] = tableBuf
    out.push(
      <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>{head.map((c, ci) => <th key={ci} className="border-b px-3 py-2 text-left font-medium text-slate-600">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-slate-50/50">
                {r.map((c, ci) => <td key={ci} className="border-b border-slate-100 px-3 py-2">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
    tableBuf = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const hl = highlightLine === i

    // 表格行
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (cells.every((c) => /^-*$/.test(c))) { i++; continue } // 分隔行
      tableBuf.push(cells)
      i++
      continue
    }
    flushTable()

    // 代码块
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3)
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // 跳过收尾 ```
      out.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-lg bg-slate-900 text-slate-100">
          {lang && <div className="border-b border-slate-700 px-3 py-1 text-xs text-slate-400">{lang}</div>}
          <pre className="gd-code-block px-4 py-3">
            {buf.map((l, li) => (
              <div key={li} data-line={i - buf.length + li} className={highlightLine != null && highlightLine === i - buf.length + li ? 'gd-evidence-highlight' : ''}>
                {l || ' '}
              </div>
            ))}
          </pre>
        </div>,
      )
      continue
    }

    // 标题
    const hm = line.match(/^(#{1,4})\s+(.*)/)
    if (hm) {
      const level = hm[1].length
      const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold']
      out.push(<div key={key++} className={`mt-4 mb-2 text-slate-800 ${sizes[level - 1]} ${hl ? 'gd-evidence-highlight' : ''}`}>{hm[2]}</div>)
      i++
      continue
    }

    // 列表
    const lm = line.match(/^\s*[-*]\s+(.*)/)
    if (lm) {
      out.push(
        <div key={key++} className={`my-1 ml-4 flex gap-2 text-sm leading-relaxed text-slate-700 ${hl ? 'gd-evidence-highlight' : ''}`}>
          <span className="text-slate-400">•</span><span>{renderInline(lm[1])}</span>
        </div>,
      )
      i++
      continue
    }

    // 运行截图占位行（演示剧本特殊渲染）
    if (line.trim().startsWith('【运行截图')) {
      out.push(
        <div key={key++} className={`my-3 flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${hl ? 'gd-evidence-highlight' : ''}`}>
          <span className="text-lg">🖼️</span>
          <span>{line.trim().replace(/[【】]/g, '')}</span>
        </div>,
      )
      i++
      continue
    }

    // 空行
    if (!line.trim()) { i++; continue }

    // 普通段落
    out.push(
      <p key={key++} className={`my-2 text-sm leading-relaxed text-slate-700 ${hl ? 'gd-evidence-highlight' : ''}`}>
        {renderInline(line)}
      </p>,
    )
    i++
  }
  flushTable()
  return <div>{out}</div>
}

/** 行内渲染：**bold**、`code` */
function renderInline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let rest = s
  let k = 0
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/
  while (rest.length > 0) {
    const m = rest.match(regex)
    if (!m) { parts.push(<span key={k++}>{rest}</span>); break }
    parts.push(<span key={k++}>{rest.slice(0, m.index)}</span>)
    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={k++} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>)
    } else {
      parts.push(<code key={k++} className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-blue-700">{token.slice(1, -1)}</code>)
    }
    rest = rest.slice(m.index! + token.length)
  }
  return parts
}
