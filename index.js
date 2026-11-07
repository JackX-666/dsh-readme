/**
 * dsh-task-readme — Host half.
 *
 * Two responsibilities, both derived from the Session log (the single source of
 * truth for this Harness):
 *
 * 1. A `sessionProjections` unit folds committed Session events into one record
 *    per Turn (the task): what was asked, what came back, which files/tools were
 *    involved, how the Turn ended. Its `wire.view` is the whole current value the
 *    Client reads through the `useProjection` standard prop — so the Readme tab
 *    needs no transport, no polling and no client-side folding.
 * 2. A `session/event` listener regenerates one Markdown handbook after every
 *    `turn/end`, overwriting the previous version: later edits to earlier Tasks
 *    therefore leave only the newest Readme on disk.
 *
 * The handbook is written for a reader who comes back later (or starts a fresh
 * Session): a handoff block that can be pasted into a new conversation, an
 * inventory of produced files with usage hints, then one journal entry per Task.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const DEFAULT_CONFIG = {
  /** Workspace-relative Readme file; the newest version overwrites it. */
  readmeFile: 'README.dsh.md',
  /** How many Turns the unit keeps, newest last. */
  maxTurns: 80,
  /** Write the Markdown file after each `turn/end`. */
  writeFile: true,
  /** How many recent Tasks the handoff block repeats. */
  handoffTasks: 4,
  /** Ask the model for a verb+object label on each finished turn. */
  modelLabels: true,
}

/**
 * One short prompt section: after a task the model already understands what it
 * did, so it — not a token-splicing heuristic — names the task. The label rides
 * in a CommonMark link-reference definition, which the parser consumes and
 * never renders (raw HTML comments are shown as literal text by this UI).
 */
const LABEL_INSTRUCTION = [
  '## 任务标签',
  '每轮收尾回复的最后一行，单独一行输出这条链接引用定义（不要解释它、不要写进正文）：',
  '`[//]: # (动词+宾语)`',
  '规则：4–8 个汉字；动词开头（如 创建 / 修复 / 重构 / 新增 / 优化 / 接入 / 清理 / 排查）；',
  '宾语必须是这一轮真正产出的东西；概括整轮含义，不要照抄用户原句，不要罗列一串名词。',
].join('\n')

/** `[//]: # (创建插件)` — a Markdown definition line, invisible in the output. */
const LABEL_DEFINITION = /^[ \t]*\[\/\/\]:[ \t]*#[ \t]*\(([^)\n]{1,40})\)[ \t]*$/gm

/** Legacy form; still parsed so older turns keep their labels. */
const LABEL_COMMENT = /<!--\s*(?:task|任务)\s*[:：]\s*([^<>\n]{1,40}?)\s*-->/gi

/** Projection key; the Client reads the same string through `useProjection`. */
const KEY = 'taskReadme'

/** Doubles as a Zod-compatible schema when the real `zod` cannot be resolved. */
const passthrough = {
  parse(value) {
    return value
  },
  safeParse(value) {
    return { success: true, data: value }
  },
}

const STATUS_LABEL = {
  completed: '完成',
  running: '进行中',
  aborted: '已中止',
  blocked: '受阻',
  error: '出错',
  'max-tokens': '长度超限',
  interrupted: '已中断',
  forked: '已分叉',
}

/** Tools whose path argument names a read target rather than a product. */
const READ_ONLY_TOOLS = new Set(['read', 'read_image', 'glob', 'grep', 'list', 'ls', 'stat', 'search', 'session_search'])

// --- short label ("创建插件") extracted from the question -------------------

const FILLERS = [
  '我想要', '我觉得', '我认为', '我需要', '我希望', '最好能', '最好是', '我想', '我要', '我们需要',
  '帮我', '帮忙', '请你', '请帮', '麻烦你', '麻烦', '能否', '能不能', '可不可以',
  '可以帮', '给我', '咱们', '我们', '现在', '目前', '另外', '然后', '接着', '顺便',
  '这个', '那个', '这些', '那些',
  '就是', '请', '你', '我', '再',
]

const QUANTIFIERS = ['一下', '一个', '一些', '一份', '一套', '个', '份', '套', '下', '条', '种']

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'is', 'are', 'it', 'for', 'with',
  'this', 'that', 'be', 'by', 'as', 'at', 'from', 'into', 'can', 'should', 'would', 'please',
])

const ACTION_WORDS = [
  '创建', '新建', '制作', '实现', '开发', '增加', '新增', '添加', '修复', '修改',
  '改成', '改为', '删除', '移除', '重构', '优化', '调整', '升级', '安装', '配置',
  '迁移', '测试', '检查', '编写', '生成', '导出', '导入', '整理', '清理', '排查',
  '部署', '接入', '替换', '合并', '拆分', '补充', '完善', '支持', '分析', '比较',
  '对比', '解释', '说明', '转换', '打包', '发布', '运行', '调试', '验证', '写',
  '做', '弄', '改', '换', '画', '删',
]

const ACTION_WORDS_EN = [
  'create', 'add', 'build', 'implement', 'make', 'write', 'fix', 'update', 'change',
  'remove', 'delete', 'refactor', 'improve', 'optimize', 'rename', 'move', 'split',
  'merge', 'upgrade', 'install', 'configure', 'migrate', 'test', 'check', 'debug',
  'document', 'export', 'import', 'generate', 'convert', 'review', 'explain',
].map(word => word.toLowerCase())

/** Harness-injected runtime preamble lines that are not the user's request. */
const PREAMBLE = /^(the approval policy|time sampled|elapsed since|current runtime context|current dsh|current deepseek|approval prompts|browser time zone|you are an ai agent|tokens prefixed with)/i

const EDGE_NOISE = /^[\s，,。.：:、；;！!？?~～\-—'"“”‘’`*#]+/
const CHINESE_ONLY = /^[\u4e00-\u9fa5]+$/
const LATIN_WORD = /^[A-Za-z][A-Za-z0-9_.+#-]*$/

/**
 * Deterministic 1–2 word label so the collapsed History button answers
 * "what was I doing then?" at a glance: action verb first, then the object.
 * @param text - the Turn's user message.
 * @returns a short label, or an empty string when nothing survives.
 */
export function keywordsOf(text) {
  let value = stripPreamble(String(text || ''))
  if (!value) return ''
  value = value.slice(0, 240)

  for (let guard = 0; guard < 8; guard += 1) {
    const trimmed = value.replace(EDGE_NOISE, '')
    const filler = FILLERS.find(item => trimmed.startsWith(item))
    const next = filler
      ? trimmed.slice(filler.length)
      : trimmed.replace(/^(把|将|给|对|向|从|用|在|和|跟)/u, '')
    if (next === trimmed) {
      value = trimmed
      break
    }
    value = next
  }
  value = value.replace(EDGE_NOISE, '')

  let action = ''
  for (const word of ACTION_WORDS) {
    if (value.startsWith(word)) {
      action = word
      value = value.slice(word.length).replace(EDGE_NOISE, '')
      break
    }
  }
  if (!action) {
    const head = value.match(/^([A-Za-z]+)/)
    const word = head ? head[1].toLowerCase() : ''
    if (word && ACTION_WORDS_EN.includes(word)) {
      action = head[1]
      value = value.slice(head[1].length).replace(EDGE_NOISE, '')
    }
  }

  for (let guard = 0; guard < 3; guard += 1) {
    const quantifier = QUANTIFIERS.find(item => value.startsWith(item))
    if (!quantifier) break
    value = value.slice(quantifier.length).replace(EDGE_NOISE, '')
  }
  value = value.replace(/^的/u, '')

  const tokens = (value.match(/[A-Za-z][A-Za-z0-9_.+#-]*|[\u4e00-\u9fa5]+/g) || [])
    .filter(token => !STOPWORDS.has(token.toLowerCase()))

  const chineseRaw = tokens.filter(token => CHINESE_ONLY.test(token) && token.length >= 2)
  const chinese = chineseRaw
    .filter(token => !ACTION_WORDS.some(word => token.startsWith(word) && token.length > word.length))
    .map(cleanChinese)
    .filter(token => token.length >= 2)
  const latin = tokens.filter(token => LATIN_WORD.test(token) && token.length >= 2)

  const headIsAction = chineseRaw.length > 0 && cleanChinese(chineseRaw[0]) !== chinese[0]

  const parts = []
  if (action) parts.push(action)

  let object = ''
  if (action) {
    object = headIsAction
      ? (latin.slice(0, 2).join(' ') || chinese[0] || '')
      : (chinese[0] || latin.slice(0, 2).join(' '))
  } else {
    const distinctive = latin.find(token => token.length >= 4)
    object = distinctive || latin.slice(0, 2).join(' ') || chinese[0] || ''
  }
  if (object) parts.push(object)

  if (parts.length === 0) {
    const fallback = value.replace(EDGE_NOISE, '').trim()
    return fallback ? fallback.slice(0, 10) : ''
  }
  const joined = parts.join(' ')
  return joined.length > 18 ? joined.slice(0, 18) : joined
}

/** Drop Harness runtime preamble lines so only the user's own request remains. */
function stripPreamble(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const kept = lines.filter(line => !PREAMBLE.test(line.trim()))
  const joined = kept.join('\n').trim()
  return joined || text.trim()
}

/** Keep the head of one CJK run: cut at the first particle, then cap at 4. */
function cleanChinese(token) {
  const head = token.split(/[的了是在时，、：:；;]/u)[0]
  const trimmed = head.replace(/[上中里]$/u, '')
  return trimmed.length > 4 ? trimmed.slice(0, 4) : trimmed
}



export const inject = ['sessionProjections']

export async function apply(ctx, config) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) }
  const maxTurns = Math.max(1, Number(cfg.maxTurns) || DEFAULT_CONFIG.maxTurns)
  const handoffTasks = Math.max(1, Number(cfg.handoffTasks) || DEFAULT_CONFIG.handoffTasks)
  const schema = await resolveSchema()

  if (cfg.modelLabels !== false) {
    try {
      const prompt = typeof ctx.get === 'function' ? ctx.get('systemPrompt') : undefined
      if (prompt && typeof prompt.section === 'function') {
        prompt.section({ name: 'task-readme-label', order: 900, text: LABEL_INSTRUCTION })
      }
    } catch (error) {
      report(ctx, 'label section unavailable', error)
    }
  }

  ctx.sessionProjections.register({
    key: KEY,
    stateSchema: schema,
    stateVersion: 4,
    init(header) {
      return {
        v: 2,
        sid: String(header.id || ''),
        cwd: typeof header.cwd === 'string' ? header.cwd : '',
        updatedAt: Number(header.createdAt) || 0,
        turns: [],
      }
    },
    apply(state, event) {
      return fold(state, event, maxTurns)
    },
    wire: {
      viewSchema: schema,
      view(state) {
        return {
          v: 2,
          sid: state.sid,
          cwd: state.cwd,
          updatedAt: state.updatedAt,
          file: cfg.readmeFile,
          handoff: buildHandoff(state, handoffTasks),
          latest: buildMarkdown(state, handoffTasks),
          deliverables: buildDeliverables(state),
          turns: state.turns.map(turn => ({
            turn: turn.turn,
            start: turn.start,
            end: turn.end,
            status: turn.status,
            question: turn.question,
            keywords: turn.keywords,
            answer: turn.answer,
            tools: countTools(turn.tools),
            files: turn.files.slice(0, 12),
            writes: turn.writes.slice(0, 12),
            errors: turn.errors,
          })),
        }
      },
    },
  })

  const chains = new Map()

  const flush = async (session) => {
    if (!cfg.writeFile) return
    const state = ctx.sessionProjections.stateOf(session, KEY)
    if (!state || !Array.isArray(state.turns) || state.turns.length === 0) return
    const cwd = state.cwd || workingDirectoryOf(ctx, session)
    if (!cwd) return
    const file = join(cwd, String(cfg.readmeFile))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, buildMarkdown(state, handoffTasks), 'utf8')
  }

  const schedule = (session) => {
    if (!tracksWorkspace(session)) return
    const id = String(session.id)
    const previous = chains.get(id) || Promise.resolve()
    const next = previous.then(() => flush(session)).catch(error => report(ctx, 'write failed', error))
    chains.set(id, next)
    next.then(() => {
      if (chains.get(id) === next) chains.delete(id)
    })
  }

  ctx.on('session/event', (session, event) => {
    if (!event || event.type !== 'turn/end') return
    schedule(session)
  })
}

/** Real Zod when it resolves; a pass-through schema otherwise. */
async function resolveSchema() {
  try {
    const module = await import('zod')
    const z = module && (module.z || module.default)
    if (z && typeof z.unknown === 'function') return z.unknown()
  } catch {}
  return passthrough
}

function report(ctx, message, error) {
  try {
    const logger = ctx.logger || ctx.get('logger')
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[dsh-task-readme] ${message}`, error)
      return
    }
  } catch {}
  try {
    console.warn(`[dsh-task-readme] ${message}`, error)
  } catch {}
}

/** Delegate Sessions share their parent's directory; they must not clobber its Readme. */
function tracksWorkspace(session) {
  const header = session && session.header
  if (!header) return false
  return header.origin !== 'subagent'
}

function workingDirectoryOf(ctx, session) {
  const header = session && session.header
  if (header && typeof header.cwd === 'string' && header.cwd) return header.cwd
  try {
    const service = ctx.get('workingDirectory')
    if (service) return service.get(session) || ''
  } catch {}
  return ''
}

// ---------------------------------------------------------------------------
// Fold: committed Session events → one record per Turn
// ---------------------------------------------------------------------------

function fold(state, event, maxTurns) {
  const type = event && event.type
  if (typeof type !== 'string') return state
  const data = event.data || {}
  switch (type) {
    case 'turn/start':
      return openTurn(state, Number(data.turn) || 0, event.time, maxTurns)
    case 'user/message':
      return addQuestion(state, readText(data.content))
    case 'assistant/message':
      return addAnswer(state, readText(data.message && data.message.content))
    case 'tool/call':
      return addToolCall(state, data)
    case 'tool/result':
      return data.error ? bumpError(state) : state
    case 'turn/end':
      return closeTurn(state, Number(data.turn) || 0, event.time, data.reason)
    default:
      return state
  }
}

function openTurn(state, turn, time, maxTurns) {
  const turns = state.turns.concat([{
    turn,
    start: Number(time) || 0,
    end: 0,
    status: 'running',
    question: '',
    keywords: '',
    answer: '',
    tools: [],
    files: [],
    writes: [],
    errors: 0,
  }])
  const trimmed = turns.length > maxTurns ? turns.slice(turns.length - maxTurns) : turns
  return { ...state, turns: trimmed }
}

function lastOpenIndex(turns) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].status === 'running') return index
  }
  return -1
}

function replaceTurn(state, index, patch) {
  const turns = state.turns.slice()
  turns[index] = { ...turns[index], ...patch }
  return { ...state, turns }
}

function addQuestion(state, text) {
  const index = lastOpenIndex(state.turns)
  const question = snippet(text, 300)
  if (index < 0 || !question) return state
  if (state.turns[index].question) return state
  return replaceTurn(state, index, { question, keywords: keywordsOf(text) })
}

function addAnswer(state, text) {
  const index = lastOpenIndex(state.turns)
  if (index < 0) return state
  const label = labelFromMarker(text)
  const answer = snippet(stripMarkers(text), 600)
  if (!answer && !label) return state
  const patch = {}
  if (answer) patch.answer = answer
  if (label) patch.keywords = label
  return replaceTurn(state, index, patch)
}

/** The model's own verb+object label for the finished task. */
function labelFromMarker(text) {
  const value = String(text || '')
  let found = lastLabel(value, LABEL_DEFINITION)
  if (!found) found = lastLabel(value, LABEL_COMMENT)
  return found.slice(0, 16)
}

function lastLabel(value, pattern) {
  pattern.lastIndex = 0
  let found = ''
  let match = pattern.exec(value)
  while (match !== null) {
    const label = match[1].replace(/[`'"“”‘’]/g, '').replace(/\s+/g, ' ').trim()
    if (label) found = label
    match = pattern.exec(value)
  }
  return found
}

/** Keep the label out of the stored answer and the Readme body. */
function stripMarkers(text) {
  LABEL_DEFINITION.lastIndex = 0
  LABEL_COMMENT.lastIndex = 0
  return String(text || '')
    .replace(LABEL_DEFINITION, '')
    .replace(LABEL_COMMENT, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/u, '')
}

function addToolCall(state, data) {
  const index = lastOpenIndex(state.turns)
  if (index < 0) return state
  const current = state.turns[index]
  const name = typeof data.name === 'string' ? data.name : ''
  if (!name) return state
  const tools = current.tools.length >= 60 ? current.tools : current.tools.concat([name])
  const patch = { tools }
  const file = fileFromArguments(data.arguments)
  if (file && !current.files.includes(file)) patch.files = current.files.concat([file]).slice(0, 40)
  if (file && !READ_ONLY_TOOLS.has(name) && !current.writes.includes(file)) {
    patch.writes = current.writes.concat([file]).slice(0, 20)
  }
  return replaceTurn(state, index, patch)
}

function bumpError(state) {
  const index = lastOpenIndex(state.turns)
  if (index < 0) return state
  return replaceTurn(state, index, { errors: state.turns[index].errors + 1 })
}

function closeTurn(state, turn, time, reason) {
  let index = -1
  for (let cursor = state.turns.length - 1; cursor >= 0; cursor -= 1) {
    if (state.turns[cursor].turn === turn) {
      index = cursor
      break
    }
  }
  if (index < 0) return state
  const status = reason && typeof reason.kind === 'string' ? reason.kind : 'completed'
  const next = replaceTurn(state, index, { end: Number(time) || 0, status })
  return { ...next, updatedAt: Number(time) || next.updatedAt }
}

// ---------------------------------------------------------------------------
// Event payload helpers
// ---------------------------------------------------------------------------

function readText(content) {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') text += block.text
  }
  return text
}

function snippet(text, max) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

function fileFromArguments(argumentsText) {
  if (typeof argumentsText !== 'string' || argumentsText.length === 0 || argumentsText.length > 20000) return ''
  let parsed
  try {
    parsed = JSON.parse(argumentsText)
  } catch {
    return ''
  }
  if (!parsed || typeof parsed !== 'object') return ''
  for (const key of ['file_path', 'filePath', 'path', 'output_path', 'file']) {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function countTools(tools) {
  const counts = new Map()
  for (const name of tools) counts.set(name, (counts.get(name) || 0) + 1)
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 12)
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

function formatDate(time) {
  const date = new Date(Number(time) || 0)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatTime(time) {
  const date = new Date(Number(time) || 0)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

/** Deterministic usage hint so the inventory reads like a manual. */
function usageHint(path) {
  const name = String(path || '').toLowerCase()
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  if (extension === 'md' || extension === 'txt') return '文档，直接阅读'
  if (extension === 'json' || extension === 'yaml' || extension === 'yml' || extension === 'jsonc') return '配置，改完重载对应服务'
  if (extension === 'ps1' || extension === 'bat' || extension === 'cmd' || extension === 'sh') return '脚本，可重复执行'
  if (extension === 'js' || extension === 'mjs' || extension === 'ts' || extension === 'tsx' || extension === 'jsx') return '代码，修改前先读一遍'
  if (extension === 'svg' || extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp' || extension === 'ico') return '图像资源'
  if (extension === 'zip' || extension === '7z') return '打包产物，解压后使用'
  return '产物，按上下文使用'
}

/** Files the Session produced, most recently touched first. */
function buildDeliverables(state) {
  const byPath = new Map()
  for (const turn of state.turns) {
    for (const path of turn.writes) {
      const entry = byPath.get(path) || { path, count: 0, lastTurn: turn.turn, lastAt: turn.start, hint: usageHint(path) }
      entry.count += 1
      if (turn.start >= entry.lastAt) {
        entry.lastAt = turn.start
        entry.lastTurn = turn.turn
      }
      byPath.set(path, entry)
    }
  }
  return Array.from(byPath.values()).sort((left, right) => right.lastAt - left.lastAt)
}

function statusLabel(status) {
  return STATUS_LABEL[status] || status || '未知'
}

function oneLine(text, max) {
  return snippet(text, max) || '—'
}

// ---------------------------------------------------------------------------
// Markdown: handoff + inventory + task journal (one file, newest version)
// ---------------------------------------------------------------------------

export function buildHandoff(state, handoffTasks = 4) {
  const turns = Array.isArray(state.turns) ? state.turns : []
  const done = turns.filter(turn => turn.status === 'completed').length
  const recent = turns.slice(-handoffTasks)
  const deliverables = buildDeliverables(state)
  const open = turns.filter(turn => turn.status !== 'completed')

  const lines = []
  lines.push('## 交接摘要（整段复制到新会话，即可让我快速接手）', '')
  lines.push(`- 工作区：\`${state.cwd || '(未记录)'}\``)
  lines.push(`- 会话：\`${state.sid}\``)
  lines.push(`- 最近更新：${formatDate(state.updatedAt)} ${formatTime(state.updatedAt)}`)
  lines.push(`- 任务进度：共 ${turns.length} 个 · 完成 ${done} 个${turns.length - done > 0 ? ` · 其他 ${turns.length - done} 个` : ''}`)
  if (deliverables.length > 0) {
    lines.push(`- 最近改动：${deliverables.slice(0, 6).map(item => `\`${item.path}\``).join('、')}`)
  }
  if (recent.length > 0) {
    lines.push('- 最近做的事：')
    for (const turn of recent) {
      lines.push(`  - ${formatTime(turn.start)} · ${oneLine(turn.question, 60)} → ${oneLine(turn.answer, 60)}`)
    }
  }
  if (open.length > 0) {
    lines.push(`- 未收尾：${open.map(turn => `任务 ${turn.turn}（${statusLabel(turn.status)}）`).join('、')}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function buildMarkdown(state, handoffTasks = 4) {
  const turns = Array.isArray(state.turns) ? state.turns : []
  const deliverables = buildDeliverables(state)
  const lines = [
    '# 任务 Readme',
    '',
    '> 由 dsh-task-readme 自动生成：每个任务结束整体重写，只保留最新一版。',
    `> 会话 \`${state.sid}\` · 更新于 ${formatDate(state.updatedAt)} ${formatTime(state.updatedAt)}`,
    '',
    '## 这份文档怎么用',
    '',
    '1. 想看现在做到哪了：读下面的「交接摘要」。',
    '2. 想在新会话里延续工作：把「交接摘要」整段粘过去。',
    '3. 想知道某个东西是什么、怎么用：看「产出清单」。',
    '4. 想回顾某一次具体做了什么：看「任务手账」，左侧 History 里点开对应按钮即可跳到那轮对话。',
    '',
  ]

  if (turns.length === 0) {
    lines.push('_还没有任务记录。完成一次对话后，这里会自动写入。_', '')
    return lines.join('\n')
  }

  lines.push(buildHandoff(state, handoffTasks))

  if (deliverables.length > 0) {
    lines.push('## 产出清单（这些文件是做什么的）', '')
    lines.push('| 文件 | 改动次数 | 最后任务 | 说明 |')
    lines.push('| --- | --- | --- | --- |')
    for (const item of deliverables) {
      lines.push(`| \`${item.path}\` | ${item.count} | 任务 ${item.lastTurn} | ${item.hint} |`)
    }
    lines.push('')
  }

  lines.push('## 任务手账', '')

  let currentDay = ''
  for (const turn of turns) {
    const day = formatDate(turn.start || turn.end || state.updatedAt)
    if (day !== currentDay) {
      currentDay = day
      lines.push(`### ${day}`, '')
    }
    const label = turn.keywords ? ` · ${turn.keywords}` : ''
    lines.push(`#### ${formatTime(turn.start || state.updatedAt)} · 任务 ${turn.turn}${label} · ${statusLabel(turn.status)}`, '')
    lines.push(`- **当时要做什么**：${turn.question || '（未记录到用户消息）'}`)
    lines.push(`- **做成了什么**：${turn.answer || '（未记录到回答）'}`)
    if (turn.writes && turn.writes.length > 0) {
      lines.push(`- **改动的文件**：${turn.writes.map(file => `\`${file}\``).join('、')}`)
    } else if (turn.files && turn.files.length > 0) {
      lines.push(`- **读到的文件**：${turn.files.map(file => `\`${file}\``).join('、')}`)
    }
    const tools = countTools(turn.tools || [])
    if (tools.length > 0) {
      lines.push(`- **用到的工具**：${tools.map(tool => `${tool.name} ×${tool.count}`).join('、')}`)
    }
    if (turn.errors > 0) lines.push(`- **失败次数**：${turn.errors}`)
    if (turn.status !== 'completed') {
      lines.push(`- **接着做**：这一轮是「${statusLabel(turn.status)}」结束，继续时先确认上面的改动是否已生效。`)
    }
    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}
