import type { RubricItem, Review, Submission } from '../types'
import { detectLibCalls, extractNormalizedCode, similarityMatrix, extractProse, longestCommonRun, PLAGIARISM_RUN_THRESHOLD } from './algorithms'
import { demoGeneratedRubric, demoLectureNote, demoReviewPlan } from '../data/demoData'

// ===== AI 接口层：BYOK 在线模式 + 演示模式双轨 =====

export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const isDemoMode = (cfg: AIConfig): boolean => !cfg.apiKey.trim()

// ---------- OpenAI 兼容 Chat Completions ----------

async function chat(cfg: AIConfig, messages: unknown[], useVision = false): Promise<string> {
  const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions'
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: 0.2,
  }
  if (useVision) {
    // 视觉模型参数由具体网关决定，这里保持默认
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  return (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content ?? ''
}

/** 从模型回复中提取 JSON（容忍 ```json 围栏与前后杂文） */
function extractJSON<T>(raw: string): T {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  const start = s.search(/[{[]/)
  if (start > 0) s = s.slice(start)
  const lastBrace = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'))
  if (lastBrace >= 0) s = s.slice(0, lastBrace + 1)
  return JSON.parse(s) as T
}

async function chatJSON<T>(cfg: AIConfig, messages: unknown[]): Promise<T> {
  const raw = await chat(cfg, messages)
  try {
    return extractJSON<T>(raw)
  } catch {
    // 重试一次
    const retry = await chat(cfg, [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: '上面输出无法解析为 JSON。请只输出纯 JSON，不要任何其他文字。' },
    ])
    return extractJSON<T>(retry)
  }
}

// ---------- 1. 评分细则生成 ----------

export interface GeneratedRubric { title: string; rubricItems: RubricItem[] }

export async function generateRubric(cfg: AIConfig, lectureText: string): Promise<GeneratedRubric> {
  if (isDemoMode(cfg)) {
    await sleep(1200)
    return demoGeneratedRubric
  }
  const prompt = `你是教学助理。以下是某计算机实验的指导书，请从中抽取评分细则。
要求总分 100，每项含 name（评分点名称）、score（分值）、checkPoints（核查要点一句话）。
只输出 JSON，格式：{"title":"实验标题","rubricItems":[{"name":"...","score":20,"checkPoints":"..."}]}

指导书：
${lectureText.slice(0, 6000)}`
  const data = await chatJSON<GeneratedRubric>(cfg, [{ role: 'user', content: prompt }])
  data.rubricItems = data.rubricItems.map((r, i) => ({ ...r, id: i + 1 }))
  return data
}

// ---------- 2. 批改（逐项核查） ----------

export async function gradeSubmission(
  cfg: AIConfig, assignment: { title: string; rubricItems: RubricItem[] }, sub: Submission,
): Promise<Review> {
  if (isDemoMode(cfg)) {
    await sleep(900)
    // 演示模式：预置剧本优先；新上传的报告用本地规则引擎生成合理结果
    if (sub.review) return sub.review
    return demoGrade(assignment.rubricItems, sub)
  }
  const prompt = `你是严谨的高校助教，按评分细则逐项核查实验报告。
规则：
1. 对每个评分点输出 verdict（full=完全达成 / partial=部分达成 / none=未达成）、score（得分，不超过该项满分）
2. evidence 必须是报告原文的逐字摘录（保留换行缩进），这是评分证据，禁止改写或概括
3. reason 一句话说明给分/扣分依据
只输出 JSON，格式：
{"items":[{"rubricItemId":1,"verdict":"full","score":20,"evidence":"...","reason":"..."}],
"comment":{"highlights":"亮点","problems":"问题","suggestions":"改进建议"}}

实验：${assignment.title}
评分细则：
${assignment.rubricItems.map((r) => `${r.id}. ${r.name}（${r.score}分，核查：${r.checkPoints}）`).join('\n')}

学生报告（${sub.studentId} ${sub.studentName}）：
${sub.content.slice(0, 12000)}`

  const data = await chatJSON<{
    items: { rubricItemId: number; verdict: 'full' | 'partial' | 'none'; score: number; evidence: string; reason: string }[]
    comment: { highlights: string; problems: string; suggestions: string }
  }>(cfg, [{ role: 'user', content: prompt }])

  // 本地调库检测作为附加证据
  const libHits = detectLibCalls(sub.content)
  const extraChecks: Review['extraChecks'] = [
    libHits.length > 0
      ? { type: 'lib', level: 'warn', detail: `检测到第 ${libHits.map((h) => h.lineNo).join('、')} 行直接调用库函数（${libHits.map((h) => h.lineText).join('；')}），疑似绕过自主实现` }
      : { type: 'lib', level: 'pass', detail: '未检测到调库绕过' },
  ]

  const aiTotal = data.items.reduce((s, it) => s + (Number(it.score) || 0), 0)
  return {
    items: data.items,
    aiTotal,
    comment: data.comment,
    extraChecks,
    finalized: false,
  }
}

// ---------- 3. 截图比对（在线模式读图；演示模式返回预置） ----------

export async function compareScreenshot(
  cfg: AIConfig, sub: Submission,
): Promise<{ screenshotOutput: string; consistent: boolean; detail: string }> {
  if (isDemoMode(cfg)) {
    await sleep(800)
    const preset = sub.review?.extraChecks.find((c) => c.type === 'screenshot')
    if (preset) {
      return { screenshotOutput: '截图文字提取（演示数据）', consistent: preset.level !== 'suspect', detail: preset.detail }
    }
    return { screenshotOutput: '（演示数据：截图与代码一致）', consistent: true, detail: '截图输出与代码逻辑推演结果一致' }
  }
  const prompt = `你是代码审查员。以下学生的实验报告声称"运行截图显示测试全部通过"。请阅读报告全文，推演其代码逻辑能否真的产生"全部通过"的结果，输出 JSON：
{"screenshotOutput":"截图中声称显示的内容","consistent":true或false,"detail":"比对结论一句话"}

报告：
${sub.content.slice(0, 8000)}`
  return chatJSON(cfg, [{ role: 'user', content: prompt }])
}

// ---------- 4. 讲评提纲 ----------

export async function generateReviewPlan(
  cfg: AIConfig, stats: string,
): Promise<string> {
  if (isDemoMode(cfg)) {
    await sleep(1000)
    return demoReviewPlan
  }
  const prompt = `你是高校教师。根据班级实验批改统计，生成一份课堂讲评提纲（Markdown），要求包含：总体情况、得分率最低的 2 个评分点的典型错误展示（附错误代码与正确写法对比）、讲解要点与课堂提问建议、学术诚信提醒（如有疑似造假/抄袭）、课后任务。

统计：
${stats}`
  const raw = await chat(cfg, [{ role: 'user', content: prompt }])
  return raw
}

// ---------- 工具 ----------

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** 测试连接 */
export async function testConnection(cfg: AIConfig): Promise<{ ok: boolean; message: string }> {
  if (!cfg.apiKey.trim()) return { ok: false, message: '未填写 API Key' }
  try {
    const reply = await chat(cfg, [{ role: 'user', content: '回复"连接成功"四个字' }])
    return { ok: true, message: `连接成功：${reply.trim().slice(0, 40) || '（空响应）'}` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '连接失败' }
  }
}

// ---------- 全班真实性体检（本地算法 + 演示数据合成） ----------

export interface IntegrityResult {
  libCheck: { level: 'pass' | 'warn' | 'suspect'; detail: string }[]
  screenshotCheck: { level: 'pass' | 'warn' | 'suspect'; detail: string }[]
  similarity: number[][]   // 全班矩阵（3-gram 全文档，展示用）
  textRuns: number[][]     // 最长公共连续文字串（字符数，判定用）
  suspectPairs: { a: string; b: string; sim: number; run: number }[]
}

export function runIntegrityCheck(subs: Submission[]): IntegrityResult {
  const libCheck = subs.map((s) => {
    // 演示剧本优先（保持与预置报告完全一致的判定）
    const preset = s.review?.extraChecks.find((c) => c.type === 'lib')
    if (preset) return { level: preset.level, detail: preset.detail }
    const hits = detectLibCalls(s.content)
    return hits.length > 0
      ? { level: 'warn' as const, detail: `检测到第 ${hits.map((h) => h.lineNo).join('、')} 行调用库函数：${hits[0].lineText}` }
      : { level: 'pass' as const, detail: '未检测到调库绕过' }
  })

  const screenshotCheck = subs.map((s) => {
    const preset = s.review?.extraChecks.find((c) => c.type === 'screenshot')
    if (preset) return { level: preset.level, detail: preset.detail }
    return { level: 'pass' as const, detail: '截图与代码逻辑一致' }
  })

  // 相似度矩阵（展示用）：归一化代码 3-gram
  const codes = subs.map((s) => extractNormalizedCode(s.content))
  const sim = similarityMatrix(codes)

  // 抄袭判定（核心信号）：报告正文最长公共连续文字串
  const proses = subs.map((s) => extractProse(s.content))
  const textRuns: number[][] = Array.from({ length: subs.length }, () => Array(subs.length).fill(0))
  const suspectPairs: IntegrityResult['suspectPairs'] = []
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const run = longestCommonRun(proses[i], proses[j])
      textRuns[i][j] = run
      textRuns[j][i] = run
      if (run >= PLAGIARISM_RUN_THRESHOLD) {
        suspectPairs.push({
          a: `${subs[i].studentName}(${subs[i].studentId})`,
          b: `${subs[j].studentName}(${subs[j].studentId})`,
          sim: sim[i][j],
          run,
        })
      }
    }
  }

  return { libCheck, screenshotCheck, similarity: sim, textRuns, suspectPairs }
}

export { demoLectureNote }

// ---------- 演示模式：新上传报告的本地规则批改引擎 ----------
// 逻辑透明可解释：调库→相关项判 none；代码量与关键结构→达成度；无代码块→低分

function demoGrade(rubricItems: RubricItem[], sub: Submission): Review {
  const content = sub.content
  const codeBlocks = content.split('```').length - 1 >= 2 // 至少一对围栏
  const codeLen = extractCodeLen(content)
  const libHits = detectLibCalls(content)
  const hasTests = /测试|用例|T\d|期望/.test(content)
  const hasAnalysis = /复杂度|O\(|分析/.test(content)
  const hasBoundary = /边界|空串|空模式/.test(content)

  const items = rubricItems.map((r) => {
    let verdict: 'full' | 'partial' | 'none' = 'full'
    let score = r.score
    const lowerName = r.name

    // 与"实现"相关的项：没代码或调库 → none/partial
    if (/next|主匹配|流程|实现|算法/.test(lowerName)) {
      if (!codeBlocks || codeLen < 80) {
        verdict = 'none'; score = 0
      } else if (libHits.length > 0) {
        verdict = 'none'; score = 0
      } else if (codeLen < 300) {
        verdict = 'partial'; score = Math.round(r.score * 0.6)
      }
    }
    // 边界项
    if (/边界/.test(lowerName)) {
      if (!codeBlocks || codeLen < 80) { verdict = 'none'; score = 0 }
      else if (!hasBoundary) { verdict = 'partial'; score = Math.round(r.score * 0.5) }
    }
    // 规范项
    if (/规范|注释/.test(lowerName)) {
      if (!codeBlocks) { verdict = 'none'; score = 0 }
      else if (!/"""|#|\/\//.test(content)) { verdict = 'partial'; score = Math.round(r.score * 0.5) }
    }
    // 报告完整性项
    if (/报告|完整|分析/.test(lowerName)) {
      const parts = [content.length > 800, hasTests, hasAnalysis, content.length > 1500].filter(Boolean).length
      if (parts <= 1) { verdict = 'none'; score = Math.round(r.score * 0.2) }
      else if (parts <= 3) { verdict = 'partial'; score = Math.round(r.score * 0.7) }
    }

    return {
      rubricItemId: r.id,
      verdict,
      score,
      evidence: pickEvidence(content, r.name),
      reason: buildReason(verdict, score, r.score, r.name, { libHits: libHits.length, codeLen, hasTests, hasAnalysis, hasBoundary }),
    }
  })

  const aiTotal = items.reduce((s, it) => s + it.score, 0)
  const extraChecks: Review['extraChecks'] = [
    libHits.length > 0
      ? { type: 'lib', level: 'warn', detail: `检测到第 ${libHits.map((h) => h.lineNo).join('、')} 行直接调用库函数（${libHits[0].lineText.slice(0, 40)}…），疑似绕过自主实现` }
      : { type: 'lib', level: 'pass', detail: '未检测到调库绕过' },
  ]

  return {
    items,
    aiTotal,
    comment: {
      highlights: aiTotal >= 60 ? '报告结构完整，核心内容可读。' : '报告内容已收录，但与实验要求存在差距。',
      problems: [
        libHits.length > 0 ? '检测到调库绕过' : null,
        !hasTests ? '缺少测试用例' : null,
        !hasAnalysis ? '缺少复杂度/结果分析' : null,
        !hasBoundary ? '未提及边界处理' : null,
      ].filter(Boolean).join('；') || '整体完成度尚可，细节有待完善。',
      suggestions: '建议补充完整测试用例表与复杂度分析；确保核心算法为自主实现（演示模式规则评分，配置 API Key 后可走 AI 逐项核查）。',
    },
    extraChecks,
    finalized: false,
  }
}

function extractCodeLen(content: string): number {
  const lines = content.split('\n')
  let inCode = false
  let len = 0
  for (const l of lines) {
    if (l.trim().startsWith('```')) { inCode = !inCode; continue }
    if (inCode) len += l.length
  }
  return len
}

function pickEvidence(content: string, rubricName: string): string {
  const lines = content.split('\n')
  // 实现类：找第一个 def 或代码块首行
  if (/next|主匹配|流程|实现|算法/.test(rubricName)) {
    const idx = lines.findIndex((l) => /^\s*def\s|```/.test(l))
    if (idx >= 0) {
      const buf = lines.slice(idx, idx + 4).join('\n').replace(/```python?\n?/, '')
      if (buf.trim()) return buf
    }
  }
  if (/边界/.test(rubricName)) {
    const idx = lines.findIndex((l) => /边界|空串|空模式|if not|len\(/.test(l))
    if (idx >= 0) return lines.slice(idx, idx + 2).join('\n')
  }
  if (/报告|完整|分析/.test(rubricName)) {
    const idx = lines.findIndex((l) => /测试|用例|T\d|复杂度/.test(l))
    if (idx >= 0) return lines.slice(idx, idx + 2).join('\n')
  }
  // 兜底：报告前几行
  return lines.slice(0, 2).join('\n').slice(0, 120)
}

function buildReason(
  verdict: 'full' | 'partial' | 'none', score: number, full: number, name: string,
  ctx: { libHits: number; codeLen: number; hasTests: boolean; hasAnalysis: boolean; hasBoundary: boolean },
): string {
  if (verdict === 'none') {
    if (ctx.libHits > 0 && /next|主匹配|流程|实现|算法/.test(name)) return '检测到调库绕过：核心逻辑疑似未自主实现，该项不计分'
    if (ctx.codeLen < 80) return '报告未见有效代码实现，该项无法核查'
    return '未找到支撑该评分点的内容'
  }
  if (verdict === 'partial') {
    if (/边界/.test(name) && !ctx.hasBoundary) return '未显式说明边界处理，按部分达成计'
    if (/规范|注释/.test(name)) return '代码缺少注释或 docstring，规范项部分达成'
    if (/报告|完整|分析/.test(name)) return ctx.hasTests ? '含测试用例但结果分析不足' : '缺少测试用例，报告完整性部分达成'
    return '实现基本正确但完成度不足（代码量偏少）'
  }
  return `核查通过：${name}，得分 ${score}/${full}`
}
