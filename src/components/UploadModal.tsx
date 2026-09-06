import { useState } from 'react'
import { Upload, X, TriangleAlert, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { detectLibCalls } from '../lib/algorithms'
import { isDemoMode } from '../lib/ai'

/** 上传学生报告弹窗：粘贴 Markdown / 文本，自动调库预检 */
export default function UploadModal({ onClose }: { onClose: () => void }) {
  const { state, addSubmission } = useStore()
  const { settings } = state
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [content, setContent] = useState('')
  const [libPreview, setLibPreview] = useState<{ hits: ReturnType<typeof detectLibCalls>; checked: boolean }>({ hits: [], checked: false })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const runLibCheck = () => {
    setLibPreview({ hits: detectLibCalls(content), checked: true })
  }

  const submit = async () => {
    setError('')
    if (!studentId.trim()) { setError('请填写学号'); return }
    if (!studentName.trim()) { setError('请填写姓名'); return }
    if (content.trim().length < 50) { setError('报告内容太短（至少 50 字），请粘贴完整的实验报告'); return }
    setUploading(true)
    try {
      addSubmission({ studentId: studentId.trim(), studentName: studentName.trim(), content })
      await new Promise((r) => setTimeout(r, 400))
      onClose()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] w-[640px] max-w-[92vw] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Upload size={19} className="text-blue-700" /> 上传学生报告
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">支持粘贴 Markdown / 纯文本格式实验报告（含代码块、测试表格），上传后进入"待批改"状态</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">学号 *</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="2023010107"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">姓名 *</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="学生姓名"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">报告内容 *（Markdown 格式，代码用 ``` 围起来）</label>
            <button
              onClick={runLibCheck}
              disabled={!content.trim()}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              本地预检：调库检测
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setLibPreview({ hits: [], checked: false }) }}
            placeholder={`# 实验三：KMP 字符串匹配\n\n## 一、算法思路\n...\n\n## 二、核心实现\n\`\`\`python\ndef build_next(p):\n    ...\n\`\`\``}
            className="mt-1 h-56 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-blue-400"
          />
          <div className="mt-1 text-right text-[11px] text-slate-400">{content.length} 字符</div>
        </div>

        {/* 调库预检结果 */}
        {libPreview.checked && (
          <div className={`mt-2 rounded-lg border px-3 py-2.5 text-sm ${libPreview.hits.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
            {libPreview.hits.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5 font-semibold text-amber-700">
                  <TriangleAlert size={14} /> 预检发现 {libPreview.hits.length} 处库函数调用
                </div>
                <ul className="mt-1.5 space-y-1 text-[12px] text-amber-800">
                  {libPreview.hits.slice(0, 5).map((h, i) => (
                    <li key={i} className="font-mono">第 {h.lineNo} 行：{h.lineText.slice(0, 60)}</li>
                  ))}
                </ul>
                <div className="mt-1.5 text-[11px] text-amber-600">仍可上传——批改时将作为附加证据展示给教师复核</div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 font-medium text-green-700">
                <CheckCircle2 size={14} /> 预检通过：未检测到调库绕过
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isDemoMode(settings) ? '演示模式：上传后可用"一键批改"体验全流程（评分基于演示剧本）' : '在线模式：上传后批改将走真实 AI 接口'}
          </span>
          <button
            onClick={submit}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            <Upload size={15} />
            {uploading ? '上传中…' : '上传报告'}
          </button>
        </div>
      </div>
    </div>
  )
}
