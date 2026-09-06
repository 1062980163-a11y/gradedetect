import type { AppState, Submission, Review, RubricItem } from '../types'

// ===== 预置演示数据（与剧本严格自洽）=====
// 实验任务：KMP 字符串匹配，满分 100，5 项评分细则

const rubricItems: RubricItem[] = [
  { id: 1, name: 'next 数组计算逻辑正确', score: 20, checkPoints: 'next 数组边界、失配回退逻辑、初始值定义是否正确' },
  { id: 2, name: 'KMP 主匹配流程正确', score: 25, checkPoints: '主循环推进、失配时指针移动是否按 next 数组回退，不回退主串指针' },
  { id: 3, name: '边界情况处理', score: 15, checkPoints: '空串、单字符、模式串长于主串等边界是否处理' },
  { id: 4, name: '代码规范与注释', score: 10, checkPoints: '命名清晰、有关键注释、结构整洁' },
  { id: 5, name: '报告完整性与结果分析', score: 30, checkPoints: '含算法思路、实现说明、测试用例、复杂度分析' },
]

// ---------- 6 份学生报告 ----------

const report1 = `# 实验三：KMP 字符串匹配

## 一、算法思路

KMP 算法的核心在于利用已匹配部分的信息，避免主串指针回退。通过预处理模式串生成 next 数组（失配指针数组），失配时模式串指针按 next 数组回退到合适位置继续比较，主串指针保持不动。

next[j] 的含义：模式串 P[0..j-1] 中最长相等前后缀的长度。当 P[i] 与 S[j] 失配时，i 回退到 next[i]，此时 P[0..next[i]-1] 已无需再比较（它们与主串当前位置前的字符必然相等）。

## 二、核心实现

\`\`\`python
def build_next(p: str) -> list[int]:
    """计算模式串 p 的 next 数组（最长相等前后缀）"""
    n = len(p)
    nxt = [0] * n
    k = 0
    for i in range(1, n):
        while k > 0 and p[i] != p[k]:
            k = nxt[k - 1]  # 失配回退
        if p[i] == p[k]:
            k += 1
        nxt[i] = k
    return nxt

def kmp_search(s: str, p: str) -> int:
    """在主串 s 中查找模式串 p 首次出现位置，未找到返回 -1"""
    if not p:
        return 0        # 空模式串约定匹配于位置 0
    if len(p) > len(s):
        return -1       # 模式串比主串长，必不匹配
    nxt = build_next(p)
    i = j = 0
    while i < len(s):
        if s[i] == p[j]:
            i += 1
            j += 1
            if j == len(p):
                return i - j   # 找到匹配
        elif j > 0:
            j = nxt[j - 1]    # 模式串回退，主串指针 i 不动
        else:
            i += 1
    return -1
\`\`\`

## 三、边界情况

- 空模式串：返回 0
- 模式串长于主串：直接返回 -1
- 单字符模式串：next 数组退化为 [0]，行为等同暴力匹配但正确

## 四、测试用例

| 用例 | 主串 | 模式串 | 期望 | 实测 | 结果 |
|------|------|--------|------|------|------|
| T1 | ABABDABACDABABCABAB | ABABAB | -1 | -1 | 通过 |
| T2 | hello | ll | 2 | 2 | 通过 |
| T3 | aaaaab | aaab | 2 | 2 | 通过 |
| T4 | abc | (空串) | 0 | 0 | 通过 |
| T5 | abc | abcd | -1 | -1 | 通过 |

全部 5 组用例通过。

## 五、复杂度分析

build_next 为 O(m)，主匹配循环中 i 只前进不回退（最多 n 次），j 的回退总量不超过其前进总量，故总时间复杂度 O(n+m)，空间复杂度 O(m)。相比朴素算法 O(n·m)，在主串与模式串存在大量重复前缀时优势显著。

## 六、实验总结

通过本次实验理解了 next 数组的本质是"最长相等前后缀"，而不是简单的"失配后回退几个字符"。初版实现中我曾把失配时 j 回退写成 j = nxt[j]，导致 T3 用例超时，后经手工模拟发现应回退到 nxt[j-1]，修正后全部通过。`

const report2 = `# 实验三：KMP 字符串匹配

## 一、算法思路

KMP 通过预处理模式串得到 next 数组，失配时模式串指针回退而主串指针不动，从而把匹配复杂度从 O(n·m) 降到 O(n+m)。

## 二、核心实现

\`\`\`python
def build_next(p):
    n = len(p)
    nxt = [0] * n
    k = 0
    for i in range(1, n):
        while k > 0 and p[i] != p[k]:
            k = nxt[k - 1]
        if p[i] == p[k]:
            k = k + 1
        nxt[i] = k
    return nxt

def kmp_search(s, p):
    nxt = build_next(p)
    i = j = 0
    while i < len(s):
        if s[i] == p[j]:
            i += 1
            j += 1
            if j == len(p):
                return i - j
        elif j > 0:
            j = nxt[j - 1]
        else:
            i += 1
    return -1
\`\`\`

## 三、测试用例

| 用例 | 主串 | 模式串 | 期望 | 实测 | 结果 |
|------|------|--------|------|------|------|
| T1 | ABABDABACDABABCABAB | ABABC | 10 | 10 | 通过 |
| T2 | hello | ll | 2 | 2 | 通过 |
| T3 | aaaaab | aaab | 2 | 3 | 不通过 |

T3 未通过，未找到原因。

## 四、实验总结

整体实现参考了课件伪代码，主流程可以工作，T3 用例存在一个下标偏差问题，由于时间原因未能定位。`

const report3 = `# 实验三：字符串匹配

## 一、算法思路

在主串中逐个位置尝试匹配模式串，如果不匹配就往后挪一位重新比。

## 二、核心实现

\`\`\`python
def search(s, p):
    for i in range(len(s) - len(p) + 1):
        ok = True
        for j in range(len(p)):
            if s[i + j] != p[j]:
                ok = False
                break
        if ok:
            return i
    return -1
\`\`\`

## 三、测试

测试了几个例子都能正确返回位置。

## 四、总结

本次实验实现了字符串匹配功能，运行结果正确。`

const report4 = `# 实验三：KMP 字符串匹配

## 一、算法思路

KMP 算法通过预处理模式串生成 next 数组，实现失配时主串指针不回退，将匹配复杂度优化到 O(n+m)。next 数组记录了模式串每个位置失配时应当回退到的位置，其本质是模式串前后缀的自我匹配信息，从而避免了重复比较。

## 二、核心实现

以下是我的完整实现，包含 next 数组构建与主匹配流程：

\`\`\`python
def kmp_search(s, p):
    """KMP 主匹配入口"""
    return s.find(p)   # 核心匹配逻辑已封装

def build_next(p):
    """构建 next 数组"""
    # 数组构建逻辑已按课件完成
    return [0] * len(p)
\`\`\`

## 三、测试结果

程序运行截图显示全部测试用例通过（见附图）。

【运行截图：全部 8 组测试用例通过 ✓】

## 四、复杂度分析

KMP 算法时间复杂度 O(n+m)，空间复杂度 O(m)，其中 build_next 为 O(m)。

## 五、实验总结

本次实验深入理解了 next 数组的构造原理，实现过程一次通过，深刻体会到 KMP 相比朴素算法在重复子串场景下的效率优势。`

const report5 = `# 实验三：KMP 字符串匹配

## 一、算法思路

用 next 数组记录模式串的失配回退位置，主串指针不回退。

## 二、核心实现

\`\`\`python
def build_next(p):
    n = len(p)
    nxt = [0] * n
    k = 0
    for i in range(1, n):
        while k > 0 and p[i] != p[k]:
            k = nxt[k - 1]
        if p[i] == p[k]:
            k = k + 1
        nxt[i] = k
    return nxt

def kmp_search(s, p):
    nxt = build_next(p)
    i = j = 0
    while i < len(s):
        if s[i] == p[j]:
            i += 1
            j = j
            if j == len(p):
                return i - j
        elif j > 0:
            j = nxt[j - 1]
        else:
            i += 1
    return -1
\`\`\`

注意主匹配循环里 j 的推进写在了 else 分支中（部分场景漏推进），这是我发现的一个问题但没来得及修。

## 三、测试结果

【运行截图：全部测试用例通过 ✓】

## 四、实验总结

代码基本完成，截图显示测试通过。`

const report6 = `# 实验三：KMP 字符串匹配

## 一、算法思路

KMP 算法的核心在于利用已匹配部分的信息，避免主串指针回退。通过预处理模式串生成 next 数组（失配指针数组），失配时模式串指针按 next 数组回退到合适位置继续比较，主串指针保持不动。

next[j] 的含义：模式串 P[0..j-1] 中最长相等前后缀的长度。当 P[i] 与 S[j] 失配时，i 回退到 next[i]，此时 P[0..next[i]-1] 已无需再比较。

## 二、核心实现

\`\`\`python
def build_next(p):
    n = len(p)
    nxt = [0] * n
    k = 0
    for i in range(1, n):
        while k > 0 and p[i] != p[k]:
            k = nxt[k - 1]
        if p[i] == p[k]:
            k = k + 1
        nxt[i] = k
    return nxt

def kmp_search(s, p):
    nxt = build_next(p)
    i = j = 0
    while i < len(s):
        if s[i] == p[j]:
            i += 1
            j = nxt[j]      # 用 next 数组回退
            if j == len(p):
                return i - j
        elif j > 0:
            j = nxt[j - 1]
        else:
            i += 1
    return -1
\`\`\`

## 三、测试用例

| 用例 | 主串 | 模式串 | 期望 | 实测 | 结果 |
|------|------|--------|------|------|------|
| T1 | ABABDABACDABABCABAB | ABABAB | -1 | -1 | 通过 |
| T2 | hello | ll | 2 | 2 | 通过 |

## 四、复杂度分析

build_next 为 O(m)，主匹配循环中 i 只前进不回退（最多 n 次），故总时间复杂度 O(n+m)。

## 五、实验总结

通过本次实验理解了 next 数组的本质。实现过程一次通过。`

// ---------- 批改结果（与评分细则、剧情严格对应） ----------

const review1: Review = {
  items: [
    { rubricItemId: 1, verdict: 'full', score: 20, evidence: 'nxt = [0] * n\n    k = 0\n    for i in range(1, n):\n        while k > 0 and p[i] != p[k]:\n            k = nxt[k - 1]  # 失配回退', reason: 'next 数组构建逻辑完整正确：失配回退、相等前缀推进、初始值处理均符合定义' },
    { rubricItemId: 2, verdict: 'full', score: 25, evidence: 'elif j > 0:\n            j = nxt[j - 1]    # 模式串回退，主串指针 i 不动', reason: '主匹配流程正确：失配回退使用 nxt[j-1]，主串指针 i 始终不回退' },
    { rubricItemId: 3, verdict: 'full', score: 15, evidence: 'if not p:\n        return 0        # 空模式串约定匹配于位置 0\n    if len(p) > len(s):\n        return -1       # 模式串比主串长，必不匹配', reason: '空串、模式串长于主串等边界均已显式处理，并有单字符场景说明' },
    { rubricItemId: 4, verdict: 'full', score: 10, evidence: 'def build_next(p: str) -> list[int]:\n    """计算模式串 p 的 next 数组（最长相等前后缀）"""', reason: '类型标注完整、docstring 清晰、关键行有注释、命名规范' },
    { rubricItemId: 5, verdict: 'partial', score: 26, evidence: 'build_next 为 O(m)，主匹配循环中 i 只前进不回退（最多 n 次），j 的回退总量不超过其前进总量，故总时间复杂度 O(n+m)，空间复杂度 O(m)。', reason: '报告结构完整、含 5 组测试用例与复杂度分析；结果分析部分略简，未对重复前缀场景做对比实验' },
  ],
  aiTotal: 96,
  comment: {
    highlights: 'next 数组构建与主匹配流程实现标准规范，边界处理完整（空串/超长模式串/单字符均有显式处理），5 组测试用例覆盖到位，且在总结中主动记录了 j=nxt[j]→nxt[j-1] 的调试过程，工程习惯优秀。',
    problems: '结果分析深度不足：未对重复前缀主串做 KMP 与朴素算法的对比实验，复杂度分析停留在结论层面。',
    suggestions: '可补充一组大规模重复串（如 "a"*10^6）的朴素 vs KMP 耗时对比表，用数据支撑 O(n+m) 的结论；总结中可进一步说明 next 数组与有限状态自动机的联系。',
  },
  extraChecks: [
    { type: 'lib', level: 'pass', detail: '未检测到调库绕过：核心逻辑为自主实现' },
  ],
  finalized: false,
}

const review2: Review = {
  items: [
    { rubricItemId: 1, verdict: 'partial', score: 12, evidence: 'for i in range(1, n):\n        while k > 0 and p[i] != p[k]:\n            k = nxt[k - 1]\n        if p[i] == p[k]:\n            k = k + 1\n        nxt[i] = k', reason: 'next 数组主流程正确，但 T3（aaaaab/aaab）暴露边界偏差：失配回退路径在极端重复串下未返回正确位置' },
    { rubricItemId: 2, verdict: 'full', score: 25, evidence: 'elif j > 0:\n            j = nxt[j - 1]\n        else:\n            i += 1', reason: '主匹配流程实现正确，主串指针不回退' },
    { rubricItemId: 3, verdict: 'partial', score: 8, evidence: 'def kmp_search(s, p):\n    nxt = build_next(p)\n    i = j = 0', reason: '未处理空模式串与模式串长于主串的边界情况，直接进入循环' },
    { rubricItemId: 4, verdict: 'partial', score: 6, evidence: 'def build_next(p):\n    n = len(p)', reason: '无类型标注、无 docstring、关键步骤缺少注释' },
    { rubricItemId: 5, verdict: 'partial', score: 20, evidence: 'T3 未通过，未找到原因。', reason: '含算法思路与测试表格，但 T3 失败后未做定位分析，总结流于表面' },
  ],
  aiTotal: 71,
  comment: {
    highlights: '主匹配流程实现正确，报告结构基本完整，能如实记录 T3 失败现象，态度诚实。',
    problems: '①T3 用例失败暴露 next 数组在重复串场景的边界缺陷，未定位原因；②空串、超长模式串边界未处理；③代码缺少注释与类型标注；④对失败用例缺少归因分析。',
    suggestions: '建议对 T3 手工模拟 nxt 构建过程逐步核对；补充边界判断分支；为关键函数补充 docstring；将"未找到原因"改为记录排查思路——即使未解决，排查过程本身也是实验收获。',
  },
  extraChecks: [
    { type: 'lib', level: 'pass', detail: '未检测到调库绕过' },
  ],
  finalized: false,
}

const review3: Review = {
  items: [
    { rubricItemId: 1, verdict: 'none', score: 0, evidence: 'def search(s, p):\n    for i in range(len(s) - len(p) + 1):\n        ok = True', reason: '未实现 next 数组，代码中不存在任何失配回退预处理逻辑' },
    { rubricItemId: 2, verdict: 'none', score: 0, evidence: 'for j in range(len(p)):\n            if s[i + j] != p[j]:\n                ok = False\n                break', reason: '实现为双重循环暴力匹配，主串指针逐位回退，非 KMP 算法' },
    { rubricItemId: 3, verdict: 'none', score: 0, evidence: 'for i in range(len(s) - len(p) + 1):', reason: '循环边界处理了模式串长于主串的情况（range 为空），但无空模式串判断，空模式串会错误返回 -1' },
    { rubricItemId: 4, verdict: 'partial', score: 5, evidence: 'def search(s, p):', reason: '命名尚可但全篇无注释，函数无返回值说明' },
    { rubricItemId: 5, verdict: 'partial', score: 18, evidence: '测试了几个例子都能正确返回位置。', reason: '报告过于简略：无算法思路阐述、无具体测试用例表格、无复杂度分析、总结一句话带过' },
  ],
  aiTotal: 42,
  comment: {
    highlights: '暴力匹配实现本身正确，能跑通基本测试。',
    problems: '①本实验要求实现 KMP，提交的是朴素双重循环匹配，与实验目标不符；②未实现 next 数组；③报告内容严重不足，无思路、无用例表、无复杂度分析。',
    suggestions: '请按实验要求实现 next 数组构建与 KMP 主流程；报告需补齐"算法思路—实现—测试用例表—复杂度分析—总结"五段结构。若时间紧张，优先完成 next 数组实现与 3 组标准用例。',
  },
  extraChecks: [
    { type: 'lib', level: 'pass', detail: '未检测到调库绕过（但为暴力实现，非 KMP）' },
  ],
  finalized: false,
}

const review4: Review = {
  items: [
    { rubricItemId: 1, verdict: 'none', score: 0, evidence: 'def build_next(p):\n    """构建 next 数组"""\n    # 数组构建逻辑已按课件完成\n    return [0] * len(p)', reason: '报告声称"构建逻辑已按课件完成"，但代码实际返回全零数组，未实现任何构建逻辑' },
    { rubricItemId: 2, verdict: 'none', score: 0, evidence: 'return s.find(p)   # 核心匹配逻辑已封装', reason: '直接调用 Python 内置 str.find() 完成匹配，未实现 KMP 主流程' },
    { rubricItemId: 3, verdict: 'partial', score: 6, evidence: 'def kmp_search(s, p):\n    """KMP 主匹配入口"""\n    return s.find(p)', reason: 'str.find 本身覆盖了空串与超长边界，但该正确性来源于库函数而非本人实现' },
    { rubricItemId: 4, verdict: 'partial', score: 4, evidence: 'def kmp_search(s, p):\n    """KMP 主匹配入口"""', reason: 'docstring 与"已封装"等注释具有误导性，掩盖了实际未实现的事实' },
    { rubricItemId: 5, verdict: 'partial', score: 25, evidence: '本次实验深入理解了 next 数组的构造原理，实现过程一次通过，深刻体会到 KMP 相比朴素算法在重复子串场景下的效率优势。', reason: '报告文本完整流畅，但与代码事实不符：代码未实现任何 KMP 逻辑，总结中的"深入理解"缺乏支撑' },
  ],
  aiTotal: 35,
  comment: {
    highlights: '报告文本结构完整，文字表达流畅。',
    problems: '⚠ 严重问题：代码核验检测到 kmp_search 直接调用 str.find() 库函数，build_next 返回全零数组——即实际未实现 KMP 算法，而报告声称"实现过程一次通过"，存在调库绕过与报告失实双重问题。',
    suggestions: '请删除 s.find(p) 调用，自主实现 build_next 与 KMP 主流程后重新提交；报告中"已封装""已按课件完成"等描述需与真实代码一致。本次成绩按未实现评分，重新提交后将按新代码评分。',
  },
  extraChecks: [
    { type: 'lib', level: 'warn', detail: '检测到第 5 行直接调用 str.find() 库函数，疑似绕过自主实现' },
    { type: 'screenshot', level: 'warn', detail: '截图显示"全部 8 组测试用例通过"，与代码事实（全零 next 数组 + str.find）可能不符，建议当面复核运行环境' },
  ],
  finalized: false,
}

const review5: Review = {
  items: [
    { rubricItemId: 1, verdict: 'full', score: 20, evidence: 'for i in range(1, n):\n        while k > 0 and p[i] != p[k]:\n            k = nxt[k - 1]\n        if p[i] == p[k]:\n            k = k + 1\n        nxt[i] = k', reason: 'next 数组构建逻辑正确' },
    { rubricItemId: 2, verdict: 'none', score: 0, evidence: 'if s[i] == p[j]:\n            i += 1\n            j = j\n            if j == len(p):\n                return i - j', reason: '主匹配循环存在致命 bug：相等分支中 j 未推进（写作 j = j），导致匹配永远无法完成，代码实际不可运行成功' },
    { rubricItemId: 3, verdict: 'none', score: 0, evidence: 'def kmp_search(s, p):\n    nxt = build_next(p)\n    i = j = 0', reason: '未处理空模式串与超长模式串边界' },
    { rubricItemId: 4, verdict: 'partial', score: 6, evidence: '注意主匹配循环里 j 的推进写在了 else 分支中（部分场景漏推进），这是我发现的一个问题但没来得及修。', reason: '报告中主动记录了已知 bug，态度诚实，但代码本身无注释无类型标注' },
    { rubricItemId: 5, verdict: 'partial', score: 22, evidence: '【运行截图：全部测试用例通过 ✓】', reason: '报告含思路与截图，但截图内容与代码逻辑推演结果矛盾（存在漏推进 bug 的代码不可能全部通过），报告未做复杂度分析' },
  ],
  aiTotal: 58,
  comment: {
    highlights: 'next 数组实现正确；报告主动披露了已知 bug，态度诚实值得肯定。',
    problems: '①主匹配循环相等分支 j 未推进（j = j），代码逻辑上无法完成任何完整匹配；②运行截图显示"全部测试用例通过"与代码逻辑矛盾，截图真实性存疑；③无边界处理；④无复杂度分析。',
    suggestions: '将相等分支改为 j += 1 后重新测试；重新提交真实的运行截图；补充边界分支与复杂度分析。鼓励保持"如实记录问题"的习惯，但需先修复再声明通过。',
  },
  extraChecks: [
    { type: 'lib', level: 'pass', detail: '未检测到调库绕过' },
    { type: 'screenshot', level: 'suspect', detail: '截图比对：代码存在漏推进 bug（相等分支 j=j），按此代码逻辑推演不可能"全部通过"，截图输出与代码逻辑推演结果疑似不符' },
  ],
  finalized: false,
}

const review6: Review = {
  items: [
    { rubricItemId: 1, verdict: 'none', score: 0, evidence: 'if s[i] == p[j]:\n            i += 1\n            j = nxt[j]      # 用 next 数组回退', reason: '相等分支中 j 被错误地赋值为 nxt[j] 而非 j+1，改变了 next 数组语义，引入主流程错误' },
    { rubricItemId: 2, verdict: 'partial', score: 13, evidence: 'elif j > 0:\n            j = nxt[j - 1]\n        else:\n            i += 1', reason: '失配回退分支正确，但相等分支被错误改写，整体主匹配流程无法正确工作' },
    { rubricItemId: 3, verdict: 'none', score: 0, evidence: 'def kmp_search(s, p):\n    nxt = build_next(p)\n    i = j = 0', reason: '未处理空模式串与超长模式串边界' },
    { rubricItemId: 4, verdict: 'partial', score: 6, evidence: 'def build_next(p):\n    n = len(p)', reason: '无 docstring、无注释、无类型标注' },
    { rubricItemId: 5, verdict: 'partial', score: 20, evidence: 'build_next 为 O(m)，主匹配循环中 i 只前进不回退（最多 n 次），故总时间复杂度 O(n+m)。', reason: '报告结构与复杂度分析完整，但 T1/T2 之外的边界用例缺失，且"实现过程一次通过"的表述与代码 bug 矛盾' },
  ],
  aiTotal: 39,
  comment: {
    highlights: 'build_next 实现正确，报告结构完整。',
    problems: '⚠ 相似度检测：本报告与 2023010101 陈墨的报告归一化后相似度达 94%，算法思路段落几乎逐字相同，且抄写过程中将 j += 1 误写为 j = nxt[j] 引入新 bug——"实现过程一次通过"的总结与代码事实矛盾。按学术诚信要求，本份报告成绩单独核定。',
    suggestions: '请独立完成实验并重新提交。如对判定有异议，可携带原始开发记录（如编辑历史、草稿）当面说明。',
  },
  extraChecks: [
    { type: 'lib', level: 'pass', detail: '未检测到调库绕过' },
    { type: 'similarity', level: 'suspect', detail: '与 2023010101 陈墨报告归一化相似度 94%（变量名全部改变），判定为疑似抄袭对' },
  ],
  finalized: false,
}

// ---------- 提交列表 ----------

function mkSub(
  id: string, studentId: string, studentName: string, content: string,
  status: Submission['status'], submittedAt: string, review?: Review,
): Submission {
  return { id, studentId, studentName, content, status, submittedAt, review }
}

export const initialSubmissions: Submission[] = [
  mkSub('s1', '2023010101', '陈墨', report1, 'graded', '2026-09-24 21:14', review1),
  mkSub('s2', '2023010102', '李然', report2, 'graded', '2026-09-24 22:03', review2),
  mkSub('s3', '2023010103', '王浩', report3, 'graded', '2026-09-24 23:47', review3),
  mkSub('s4', '2023010104', '张一帆', report4, 'suspect_fraud', '2026-09-25 08:22', review4),
  mkSub('s5', '2023010105', '刘思远', report5, 'suspect_fraud', '2026-09-25 09:15', review5),
  mkSub('s6', '2023010106', '赵子昂', report6, 'suspect_plagiarism', '2026-09-25 12:40', review6),
]

export const initialAssignment: AppState['assignment'] = {
  id: 'a1',
  courseName: '数据结构',
  title: '实验三：实现 KMP 字符串匹配',
  description: '实现 next 数组构建与 KMP 主匹配算法，完成边界处理、测试用例与复杂度分析。',
  deadline: '2026-09-25 23:59',
  totalScore: 100,
  rubricItems,
}

export const demoLectureNote = `实验三指导书：KMP 字符串匹配
一、实验目的
1. 理解 next 数组（失配指针数组）的定义与构造方法
2. 掌握 KMP 主匹配流程，理解"主串指针不回退"的原理
3. 对比朴素算法，分析时间复杂度差异
二、实验内容
1. 实现 build_next(p) 函数：计算模式串 p 的最相等前后缀数组（20分，要求处理边界）
2. 实现 kmp_search(s, p)：主匹配流程，失配时按 next 数组回退，禁止直接调用语言内置查找函数（25分）
3. 边界处理：空模式串返回 0、模式串长于主串返回 -1（15分）
4. 代码规范：命名、注释、类型标注（10分）
5. 实验报告：算法思路、测试用例表（至少 5 组）、复杂度分析 O(n+m)、总结（30分）
三、提交要求
Markdown 格式报告 + 运行截图，于 9 月 25 日 23:59 前提交。`

export const demoGeneratedRubric: { title: string; rubricItems: RubricItem[] } = {
  title: '实验三：实现 KMP 字符串匹配',
  rubricItems,
}

export const demoReviewPlan = `# 实验三讲评提纲

## 一、总体情况
全班 6 份报告，平均分 56.8（去除疑似抄袭/造假份后为 69.7）。两极分化明显：标准实现与未完成实现并存。

## 二、重点讲评：next 数组计算（全班得分率 42%，最低）
**典型错误 1：相等分支 j 未推进（李然 T3、刘思远）**
\`\`\`
错误：if s[i] == p[j]:  i += 1;  j = j        # j 没有动
正确：if s[i] == p[j]:  i += 1;  j += 1
\`\`\`
课堂提问建议：请学生上讲台手工模拟 "aaaaab" 与 "aaab" 的 nxt 构建过程，逐步指出 i、k 的变化。

**典型错误 2：把回退公式误用到相等分支（赵子昂）**
\`\`\`
错误：if s[i] == p[j]:  j = nxt[j]   # 相等时不该回退
\`\`\`
讲解要点：next 数组只服务"失配时刻"，相等分支唯一动作就是双指针同时前进。板书演示状态机转移图。

## 三、次重点：边界处理（得分率 53%）
- 空模式串约定返回 0（陈墨的处理是标准答案，投屏展示）
- 模式串长于主串：进入循环前显式拦截
- 建议：测试用例必须包含"空串、单字符、超长模式串"三件套

## 四、学术诚信通报（不点名，面向全班）
本次检测发现 1 份调库绕过（str.find 冒充自实现）、1 份截图与代码逻辑矛盾、1 份高度相似报告。说明检测原理：静态扫描 + 截图比对 + 归一化相似度（改变量名无效）。强调：改错不可怕，造假零容忍。

## 五、课后任务
1. 订正：T3（aaaaab/aaab）手工模拟 nxt 构建并提交过程
2. 预习：Boyer-Moore 算法思想`
