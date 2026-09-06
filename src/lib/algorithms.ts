// ===== 本地算法层：调库检测 + 代码归一化相似度（纯本地，不依赖 AI）=====

export interface LibCallHit {
  pattern: string
  lineNo: number   // 报告内出现的行号（1-based，全文计）
  lineText: string
}

/**
 * 调库检测：扫描报告全文，查找直接调用"可完成实验目标"的库函数
 * 覆盖：str.find / .index / .indexOf / re.search / re.match / re.findall / in 运算符查找
 */
export function detectLibCalls(fullText: string): LibCallHit[] {
  const patterns: RegExp[] = [
    /\.find\s*\(/,
    /\.index\s*\(/,
    /\.indexOf\s*\(/,
    /\bre\.search\s*\(/,
    /\bre\.match\s*\(/,
    /\bre\.findall\s*\(/,
    /\bstrstr\s*\(/,
  ]
  const hits: LibCallHit[] = []
  const lines = fullText.split('\n')
  lines.forEach((line, idx) => {
    // 跳过 Markdown 表格和纯文本行，只扫代码上下文
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('|') || trimmed.startsWith('#')) return
    for (const re of patterns) {
      if (re.test(line)) {
        hits.push({
          pattern: re.source.replace(/\\b|\\s\*|\\\(/g, ''),
          lineNo: idx + 1,
          lineText: trimmed,
        })
        break
      }
    }
  })
  return hits
}

/**
 * 代码归一化：
 * 1. 提取全部代码块（``` 围栏内）
 * 2. 去注释（# 开头行内注释）、去空行、压缩空白
 * 3. 标识符按首次出现顺序替换为 VAR1, VAR2...
 * 4. 字符串字面量替换为 STRn
 */
export function extractNormalizedCode(fullText: string): string {
  const blocks: string[] = []
  const lines = fullText.split('\n')
  let inCode = false
  let cur: string[] = []
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push(cur.join('\n'))
        cur = []
      }
      inCode = !inCode
      continue
    }
    if (inCode) cur.push(line)
  }

  const raw = blocks.join('\n')
  const varMap = new Map<string, string>()
  const strMap = new Map<string, string>()

  return raw
    .split('\n')
    .map((l) => {
      // 去 # 注释（保留 #! 与字符串内 # 的简化处理：只处理行中第一个 #）
      const h = l.indexOf('#')
      if (h >= 0 && !l.slice(0, h).includes('"') && !l.slice(0, h).includes("'")) {
        l = l.slice(0, h)
      }
      // 字符串字面量 → STRn
      l = l.replace(/(['"])(?:(?!\1).)*\1/g, (m) => {
        if (!strMap.has(m)) strMap.set(m, `STR${strMap.size + 1}`)
        return strMap.get(m)!
      })
      // 标识符 → VARn（跳过关键字）
      const keywords = new Set(['def', 'return', 'if', 'elif', 'else', 'while', 'for', 'in',
        'not', 'and', 'or', 'len', 'range', 'print', 'True', 'False', 'None', 'import', 'from',
        'class', 'str', 'int', 'list', 'break', 'continue', 'pass', 'lambda', 'assert', 'global'])
      l = l.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (m) => {
        if (keywords.has(m)) return m
        if (!varMap.has(m)) varMap.set(m, `VAR${varMap.size + 1}`)
        return varMap.get(m)!
      })
      return l.replace(/\s+/g, ' ').trim()
    })
    .filter((l) => l.length > 0)
    .join('\n')
}

/**
 * 3-gram 集合余弦相似度
 */
export function similarity3gram(a: string, b: string): number {
  const grams = (s: string) => {
    const set = new Map<string, number>()
    const lines = s.split('\n')
    for (const line of lines) {
      const chars = line.replace(/\s/g, '')
      for (let i = 0; i + 3 <= chars.length; i++) {
        const g = chars.slice(i, i + 3)
        set.set(g, (set.get(g) || 0) + 1)
      }
    }
    return set
  }
  const ga = grams(a)
  const gb = grams(b)
  if (ga.size === 0 || gb.size === 0) return 0

  let dot = 0
  for (const [g, ca] of ga) {
    const cb = gb.get(g)
    if (cb) dot += ca * cb
  }
  const normA = Math.sqrt([...ga.values()].reduce((s, v) => s + v * v, 0))
  const normB = Math.sqrt([...gb.values()].reduce((s, v) => s + v * v, 0))
  return dot / (normA * normB)
}

/** 提取报告正文文字（去掉代码块，用于文字查重） */
export function extractProse(fullText: string): string {
  const lines = fullText.split('\n')
  let inCode = false
  const out: string[] = []
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (!inCode && line.trim()) out.push(line.trim())
  }
  return out.join('')
}

/**
 * 最长公共连续文字串（字符级，去空白后二分判定）
 * 反抄袭核心信号：正常同学即使写同一算法，逐字连续相同段落也很短；
 * 抄袭者会成段复制文字，公共串显著变长。
 */
export function longestCommonRun(a: string, b: string): number {
  const A = a.replace(/\s/g, '')
  const B = b.replace(/\s/g, '')
  if (!A.length || !B.length) return 0
  let lo = 10
  let hi = Math.min(A.length, B.length)
  let best = 0
  const has = (len: number): boolean => {
    if (len <= 0) return true
    const set = new Set<string>()
    for (let i = 0; i + len <= A.length; i++) set.add(A.slice(i, i + len))
    for (let i = 0; i + len <= B.length; i++) {
      if (set.has(B.slice(i, i + len))) return true
    }
    return false
  }
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (has(mid)) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

/** 抄袭阈值：最长公共连续文字串 ≥ 150 字符判定疑似抄袭 */
export const PLAGIARISM_RUN_THRESHOLD = 150

/**
 * 全班两两相似度矩阵（对称，对角线为 1）
 */
export function similarityMatrix(codes: string[]): number[][] {
  const n = codes.length
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(1))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = codes[i] && codes[j] ? similarity3gram(codes[i], codes[j]) : 0
      m[i][j] = sim
      m[j][i] = sim
    }
  }
  return m
}

/**
 * 报告行号定位：给定 evidence 原文摘录，在全文中查找首次出现位置
 * 返回 { lineIndex }（0-based）用于滚动定位；找不到返回 -1
 * 摘录可能含换行与缩进，做逐行匹配
 */
export function locateEvidence(fullText: string, evidence: string): number {
  if (!evidence) return -1
  const evLines = evidence.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  if (evLines.length === 0) return -1
  const textLines = fullText.split('\n')

  for (let i = 0; i < textLines.length; i++) {
    let matched = true
    for (let k = 0; k < evLines.length; k++) {
      if (i + k >= textLines.length) { matched = false; break }
      if (textLines[i + k].trim() !== evLines[k]) { matched = false; break }
    }
    if (matched) return i
  }
  // 降级：第一行单独匹配
  for (let i = 0; i < textLines.length; i++) {
    if (textLines[i].includes(evLines[0])) return i
  }
  return -1
}
