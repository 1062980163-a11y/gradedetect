import { useState } from 'react'
import { Settings as SettingsIcon, Plug, RotateCcw, TriangleAlert, GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { testConnection } from '../lib/ai'
import { Spinner } from '../components/ui'

export default function SettingsPage() {
  const { state, setSettings, resetAll, clearDemoData, restoreDemoData } = useStore()
  const { settings, submissions } = state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [confirmTeach, setConfirmTeach] = useState(false)

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testConnection(settings))
    } finally {
      setTesting(false)
    }
  }

  const demo = !settings.apiKey.trim()
  // 判定当前是否载有演示剧本：演示报告的学生ID集合（与 demoData 一致）
  const DEMO_IDS = ['2023010101', '2023010102', '2023010103', '2023010104', '2023010105', '2023010106']
  const hasDemoData = submissions.some((s) => DEMO_IDS.includes(s.studentId))
  const teachMode = submissions.length === 0

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <SettingsIcon size={22} className="text-blue-700" /> 设置
      </h1>

      {/* 工作模式 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">工作模式</h2>
        <p className="mt-1 text-xs text-slate-500">演示模式内置 6 份剧本报告用于展示；真实教学请切换到教学模式，清空演示人名后上传你自己的学生作业。</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* 演示模式卡片 */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${hasDemoData ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-800">演示模式</span>
              {hasDemoData && <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">当前</span>}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">内置 6 份剧本报告（陈墨、张一帆等）与批改结果，适合快速了解产品能力、参赛评审演示。</p>
            {!hasDemoData && (
              <button
                onClick={() => { if (window.confirm('载入演示数据？将补充预置的 6 份报告与批改结果（你已上传的学生报告将保留在列表后面）。')) restoreDemoData() }}
                className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                载入演示数据
              </button>
            )}
          </div>

          {/* 真实教学模式卡片 */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${teachMode ? 'border-green-500 bg-green-50/50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-green-600" />
              <span className="text-sm font-bold text-slate-800">真实教学模式</span>
              {teachMode && <span className="ml-auto rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">当前</span>}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">清空全部演示人名，得到干净系统：自己上传学生报告、配置评分细则、真实批改。强烈建议同时配置 API Key 使用在线批改。</p>
            {!teachMode && (
              <button
                onClick={() => setConfirmTeach(true)}
                className="mt-3 w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
              >
                切换到教学模式
              </button>
            )}
          </div>
        </div>

        {/* 清空确认弹窗 */}
        {confirmTeach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmTeach(false)}>
            <div className="w-[440px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <TriangleAlert size={18} className="text-amber-500" /> 切换到真实教学模式？
              </h3>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <p>将执行以下操作：</p>
                <ul className="ml-4 list-disc space-y-1 text-[13px]">
                  <li>清空当前 <b className="text-slate-800">{submissions.length}</b> 份报告（含演示人名与批改结果）</li>
                  <li>保留实验任务标题与评分细则（可继续使用或用 AI 重新生成）</li>
                  <li>保留 AI 接口配置</li>
                </ul>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">注意：此操作不可撤销。如有已批改的真实成绩需要保留，请先在班级看板导出 CSV 成绩单。</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setConfirmTeach(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">取消</button>
                <button
                  onClick={() => { clearDemoData(); setConfirmTeach(false) }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 确认清空，进入教学模式</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* BYOK 配置 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">AI 服务配置（BYOK · 自带 Key）</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          本应用为纯前端应用，AI 调用使用你自己的 OpenAI 兼容接口（Base URL + API Key）。数据仅保存在浏览器本地，不上传任何服务器。
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Base URL</label>
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">API Key</label>
            <input
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value })}
              type="password"
              placeholder="sk-…（留空则为演示模式）"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">模型名</label>
            <input
              value={settings.model}
              onChange={(e) => setSettings({ model: e.target.value })}
              placeholder="gpt-4o-mini / deepseek-chat / qwen-plus …"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              disabled={testing || demo}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plug size={14} /> 测试连接
            </button>
            {testing && <Spinner />}
            {testResult && (
              <span className={`text-xs ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.ok ? '✓ ' : '✕ '}{testResult.message}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 演示模式说明 */}
      {demo && (
        <section className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm leading-relaxed text-amber-800">
            <b>当前为演示模式</b>：未配置 API Key，所有 AI 功能（评分细则生成、逐项核查、讲评提纲）将返回内置的高质量预置数据，可完整体验全部流程。
            填入真实 Key 后自动切换为在线模式，走真实 API 调用。
          </div>
        </section>
      )}

      {/* 数据管理 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">数据管理</h2>
        <p className="mt-1 text-xs text-slate-500">所有数据保存在浏览器 localStorage（键前缀 gd_），刷新不丢失。</p>
        <button
          onClick={() => {
            if (window.confirm('确认重置演示数据？将清空所有批改状态与设置，恢复初始演示剧本。')) {
              resetAll()
              window.location.reload()
            }
          }}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          <RotateCcw size={14} /> 重置演示数据
        </button>
      </section>
    </div>
  )
}
