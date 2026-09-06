import { useState } from 'react'
import { Settings as SettingsIcon, Plug, RotateCcw, TriangleAlert } from 'lucide-react'
import { useStore } from '../store'
import { testConnection } from '../lib/ai'
import { Spinner } from '../components/ui'

export default function SettingsPage() {
  const { state, setSettings, resetAll } = useStore()
  const { settings } = state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <SettingsIcon size={22} className="text-blue-700" /> 设置
      </h1>

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
