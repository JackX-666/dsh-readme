/**
 * dsh-task-readme — browser half.
 *
 * Registers one `conversation.view` entry, so the Readme appears as a tab next
 * to Chat and Trajectory. The whole payload comes from the Host projection
 * (`useProjection('taskReadme')`) — the tab never folds Session events itself
 * and never polls.
 *
 * History is a collapsed accordion: the button shows the date plus a distilled
 * line, the detail appears only when opened, and its footer jumps either to the
 * matching section of the Readme or back to that Turn in the Chat view.
 */
window.__ModuleLoader__.load({
  id: 'dsh-task-readme',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PROJECTION_KEY = 'taskReadme'
    const CLASS = 'dsh-tr'

    const DICT = {
      en: {
        tab: 'Readme',
        title: 'Task Readme',
        subtitle: 'Regenerated after every task · newest version only',
        updated: 'updated',
        empty: 'No task recorded yet. Finish one turn and the Readme appears here automatically.',
        copy: 'Copy',
        copyHandoff: 'Copy handoff',
        copyTurn: 'Copy',
        copied: 'Copied',
        history: 'History',
        source: 'Readme',
        expandAll: 'Expand all',
        collapseAll: 'Collapse all',
        question: 'Asked',
        answer: 'Done',
        files: 'Changed',
        readFiles: 'Read',
        tools: 'Tools',
        errors: 'failed calls',
        noQuestion: '(no user message recorded)',
        noAnswer: '(no answer recorded)',
        jumpChat: 'Open in chat',
        locate: 'Locate in Readme',
        resize: 'Drag to resize',
        status: {
          completed: 'done',
          running: 'running',
          aborted: 'aborted',
          blocked: 'blocked',
          error: 'error',
          'max-tokens': 'max tokens',
          interrupted: 'interrupted',
          forked: 'forked',
        },
      },
      zh: {
        tab: 'Readme',
        title: '任务 Readme',
        subtitle: '每个任务结束后整体重写 · 只保留最新一版',
        updated: '更新于',
        empty: '还没有任务记录。完成一轮对话后，Readme 会自动出现在这里。',
        copy: '复制全文',
        copyHandoff: '复制交接摘要',
        copyTurn: '复制',
        copied: '已复制',
        history: '历史记录',
        source: 'Readme',
        expandAll: '展开全部',
        collapseAll: '收起全部',
        question: '问题',
        answer: '结果',
        files: '改动',
        readFiles: '读到',
        tools: '工具',
        errors: '次失败',
        noQuestion: '（未记录到用户消息）',
        noAnswer: '（未记录到回答）',
        jumpChat: '在对话中查看',
        locate: '在 Readme 中定位',
        resize: '拖动调整宽度（← → 微调）',
        status: {
          completed: '完成',
          running: '进行中',
          aborted: '已中止',
          blocked: '受阻',
          error: '出错',
          'max-tokens': '长度超限',
          interrupted: '已中断',
          forked: '已分叉',
        },
      },
    }

    const CSS = `
.${CLASS}-root{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;gap:10px;padding:14px 18px 18px;color:var(--dsw-alias-label-primary);font-family:inherit}
.${CLASS}-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.${CLASS}-title{margin:0;font-size:15px;font-weight:600;line-height:1.4}
.${CLASS}-meta{font-size:12px;color:var(--dsw-alias-label-secondary)}
.${CLASS}-grow{flex:1 1 auto}
.${CLASS}-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:4px 10px;font-size:12px;line-height:1.5;cursor:pointer;font-family:inherit;white-space:nowrap}
.${CLASS}-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.${CLASS}-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.${CLASS}-btn[data-accent="1"]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.${CLASS}-body{flex:1 1 auto;min-height:0;display:grid;gap:0;align-items:stretch}
.${CLASS}-split{position:relative;cursor:col-resize;touch-action:none;border-radius:4px}
.${CLASS}-split::after{content:'';position:absolute;left:50%;top:8px;bottom:8px;width:2px;transform:translateX(-50%);border-radius:1px;background:var(--dsw-alias-border-l1)}
.${CLASS}-split:hover::after,.${CLASS}-split:focus-visible::after{background:var(--dsw-alias-brand-primary);width:3px}
.${CLASS}-split:focus-visible{outline:none}
.${CLASS}-pane{min-height:0;display:flex;flex-direction:column;gap:8px}
.${CLASS}-pane-head{display:flex;align-items:center;gap:8px;height:20px;min-height:20px}
.${CLASS}-pane-label{font-size:11px;line-height:1;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.${CLASS}-link{appearance:none;border:0;background:none;color:var(--dsw-alias-brand-primary);font-size:11.5px;line-height:1;cursor:pointer;padding:0 2px;font-family:inherit;white-space:nowrap}
.${CLASS}-link:hover{text-decoration:underline}
.${CLASS}-scroll{min-height:0;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px}
.${CLASS}-timeline{display:flex;flex-direction:column;gap:10px}
.${CLASS}-day{margin:2px 0 0;padding:0 0 4px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);position:sticky;top:-10px;background:var(--dsw-alias-bg-layer-1);z-index:1}
.${CLASS}-card{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base);overflow:hidden}
.${CLASS}-card[data-open="1"]{border-color:var(--dsw-alias-border-l2)}
.${CLASS}-row{appearance:none;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer}
.${CLASS}-row:hover{background:var(--dsw-alias-bg-layer-2)}
.${CLASS}-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.${CLASS}-chev{flex:0 0 auto;width:10px;font-size:10px;line-height:1;color:var(--dsw-alias-label-secondary);transition:transform .15s ease}
.${CLASS}-card[data-open="1"] .${CLASS}-chev{transform:rotate(90deg)}
.${CLASS}-stamp{flex:0 0 auto;font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.${CLASS}-pill{flex:0 0 auto;font-size:11px;line-height:1.6;padding:0 7px;border-radius:999px;border:1px solid currentColor;opacity:.9}
.${CLASS}-summary{flex:1 1 auto;min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${CLASS}-count{flex:0 0 auto;font-size:11px;color:var(--dsw-alias-label-secondary)}
.${CLASS}-detail{display:flex;flex-direction:column;gap:7px;padding:2px 10px 10px;border-top:1px solid var(--dsw-alias-border-l1)}
.${CLASS}-block{display:flex;flex-direction:column;gap:2px;padding-top:7px}
.${CLASS}-k{font-size:11px;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.${CLASS}-v{font-size:12.5px;line-height:1.68;word-break:break-word;white-space:pre-wrap}
.${CLASS}-tag{font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary);word-break:break-all}
.${CLASS}-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:0 4px}
.${CLASS}-foot{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;padding-top:8px;margin-top:2px;border-top:1px dashed var(--dsw-alias-border-l1)}
.${CLASS}-foot .${CLASS}-btn{padding:3px 9px;flex:0 0 auto}
.${CLASS}-arrow{appearance:none;margin-left:auto;flex:0 0 auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:999px;padding:3px 10px;font-size:11.5px;line-height:1.6;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.${CLASS}-arrow:hover{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.${CLASS}-arrow:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.${CLASS}-doc{font-size:13px;line-height:1.72;word-break:break-word}
.${CLASS}-doc h1{font-size:16px;margin:0 0 10px}
.${CLASS}-doc h2{font-size:14px;margin:16px 0 6px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.${CLASS}-doc h3{font-size:13px;margin:12px 0 4px;color:var(--dsw-alias-label-primary)}
.${CLASS}-doc h4{font-size:12.5px;margin:10px 0 2px;color:var(--dsw-alias-label-primary);scroll-margin-top:12px;border-radius:5px;padding:2px 4px}
.${CLASS}-doc h4[data-flash="1"]{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}
.${CLASS}-doc p{margin:4px 0;color:var(--dsw-alias-label-secondary)}
.${CLASS}-doc ul{margin:4px 0;padding-left:18px}
.${CLASS}-doc li{margin:2px 0;color:var(--dsw-alias-label-secondary)}
.${CLASS}-doc blockquote{margin:6px 0;padding:2px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12px}
.${CLASS}-doc code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:0 4px}
.${CLASS}-doc strong{color:var(--dsw-alias-label-primary);font-weight:600}
.${CLASS}-doc table{border-collapse:collapse;margin:6px 0;font-size:12px;width:100%}
.${CLASS}-doc th,.${CLASS}-doc td{border:1px solid var(--dsw-alias-border-l1);padding:3px 7px;text-align:left;vertical-align:top;color:var(--dsw-alias-label-secondary)}
.${CLASS}-doc th{color:var(--dsw-alias-label-primary);font-weight:600;background:var(--dsw-alias-bg-layer-2)}
.${CLASS}-empty{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);max-width:46ch;line-height:1.7}
`

    function pad2(value) {
      return value < 10 ? `0${value}` : String(value)
    }

    function fmtDateTime(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return '—'
      const date = new Date(value)
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
    }

    function fmtStamp(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return '—'
      const date = new Date(value)
      return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    function fmtTime(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return '—'
      const date = new Date(value)
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    function dayKey(time) {
      const date = new Date(Number(time) || 0)
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    }

    function activeLocale(locale) {
      try {
        const snapshot = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null
        const id = snapshot && (snapshot.id || snapshot.locale || snapshot.current)
        if (typeof id === 'string' && id) return id.toLowerCase().startsWith('zh') ? 'zh' : 'en'
      } catch {}
      return 'en'
    }

    function tone(status) {
      if (status === 'completed') return 'var(--dsw-alias-state-success-primary)'
      if (status === 'error' || status === 'blocked') return 'var(--dsw-alias-state-error-primary)'
      if (status === 'running') return 'var(--dsw-alias-state-idle-primary)'
      return 'var(--dsw-alias-state-warn-primary)'
    }

    function turnKey(turn) {
      return `${turn.turn}-${turn.start || 0}`
    }

    function groupByDay(turns) {
      const buckets = new Map()
      for (const turn of turns) {
        const at = Number(turn.end || turn.start) || 0
        const key = dayKey(at)
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key).push({ turn, at })
      }
      return Array.from(buckets.keys())
        .sort()
        .reverse()
        .map(key => ({ key, items: buckets.get(key).slice().reverse() }))
    }

    /** Inline `` `code` `` and `**bold**`, without any HTML injection. */
    function renderInline(text, keyPrefix) {
      const parts = String(text || '').split(/(`[^`]*`|\*\*[^*]+\*\*)/g)
      const nodes = []
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index]
        if (!part) continue
        const key = `${keyPrefix}-${index}`
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          nodes.push(h('code', { key }, part.slice(1, -1)))
        } else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          nodes.push(h('strong', { key }, part.slice(2, -2)))
        } else {
          nodes.push(h('span', { key }, part))
        }
      }
      return nodes
    }

    /** Line-based Markdown: headings, quotes, lists, tables, paragraphs. */
    function renderMarkdown(markdown, flashTurn) {
      const lines = String(markdown || '').split('\n')
      const block = []
      let list = []
      let listKey = 0
      let table = []
      let tableKey = 0

      const flushList = () => {
        if (list.length === 0) return
        block.push(h('ul', { key: `ul-${listKey}` }, list))
        list = []
        listKey += 1
      }

      const flushTable = () => {
        if (table.length === 0) return
        const rows = table.filter(row => !/^\|[\s:|-]+\|$/.test(row.trim()))
        const cells = rows.map(row => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
        if (cells.length === 0) {
          table = []
          return
        }
        const head = cells[0]
        const body = cells.slice(1)
        block.push(h('table', { key: `tb-${tableKey}` },
          h('thead', null, h('tr', null, head.map((cell, index) => h('th', { key: `th-${index}` }, ...renderInline(cell, `th-${index}`))))),
          h('tbody', null, body.map((row, rowIndex) => h('tr', { key: `tr-${rowIndex}` },
            row.map((cell, cellIndex) => h('td', { key: `td-${cellIndex}` }, ...renderInline(cell, `td-${rowIndex}-${cellIndex}`))))),
        )))
        table = []
        tableKey += 1
      }

      for (let index = 0; index < lines.length; index += 1) {
        const trimmed = lines[index].trim()
        if (!trimmed) {
          flushList()
          flushTable()
          continue
        }
        if (trimmed.startsWith('|')) {
          flushList()
          table.push(trimmed)
          continue
        }
        flushTable()
        if (trimmed.startsWith('#### ')) {
          flushList()
          const label = trimmed.slice(5)
          const match = /任务\s+(\d+)/.exec(label)
          const turn = match ? Number(match[1]) : null
          block.push(h('h4', {
            key: `h4-${index}`,
            id: turn === null ? undefined : `dsh-tr-task-${turn}`,
            'data-turn': turn === null ? undefined : String(turn),
            'data-flash': turn !== null && turn === flashTurn ? '1' : undefined,
          }, ...renderInline(label, `i-${index}`)))
        } else if (trimmed.startsWith('### ')) {
          flushList()
          block.push(h('h3', { key: `h3-${index}` }, ...renderInline(trimmed.slice(4), `i-${index}`)))
        } else if (trimmed.startsWith('## ')) {
          flushList()
          block.push(h('h2', { key: `h2-${index}` }, ...renderInline(trimmed.slice(3), `i-${index}`)))
        } else if (trimmed.startsWith('# ')) {
          flushList()
          block.push(h('h1', { key: `h1-${index}` }, ...renderInline(trimmed.slice(2), `i-${index}`)))
        } else if (trimmed.startsWith('> ')) {
          flushList()
          block.push(h('blockquote', { key: `q-${index}` }, ...renderInline(trimmed.slice(2), `i-${index}`)))
        } else if (trimmed.startsWith('- ')) {
          list.push(h('li', { key: `li-${index}` }, ...renderInline(trimmed.slice(2), `i-${index}`)))
        } else {
          flushList()
          block.push(h('p', { key: `p-${index}` }, ...renderInline(trimmed, `i-${index}`)))
        }
      }
      flushList()
      flushTable()
      return block
    }

    function normalize(value, dict) {
      if (!value || typeof value !== 'object') return null
      const turns = Array.isArray(value.turns) ? value.turns : []
      return {
        updatedAt: Number(value.updatedAt) || 0,
        file: typeof value.file === 'string' && value.file ? value.file : 'README.dsh.md',
        latest: typeof value.latest === 'string' ? value.latest : '',
        handoff: typeof value.handoff === 'string' ? value.handoff : '',
        turns,
        days: groupByDay(turns),
        dict,
      }
    }

    function copyText(text) {
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(() => true, () => false)
        }
      } catch {}
      return Promise.resolve(false)
    }

    function turnText(turn, dict) {
      const status = (dict.status && dict.status[turn.status]) || turn.status
      const files = Array.isArray(turn.writes) ? turn.writes : []
      return [
        `# 任务 ${turn.turn} · ${status}`,
        '',
        `- 问题：${turn.question || dict.noQuestion}`,
        `- 结果：${turn.answer || dict.noAnswer}`,
        files.length > 0 ? `- 改动：${files.map(file => `\`${file}\``).join('、')}` : '',
        Array.isArray(turn.tools) && turn.tools.length > 0
          ? `- 工具：${turn.tools.map(tool => `${tool.name}×${tool.count}`).join('、')}`
          : '',
      ].filter(Boolean).join('\n')
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined

        const dict = () => DICT[activeLocale(locale)]
        const t = key => dict()[key] || key

        function ReadmeView(props) {
          const readProjection = props && props.useProjection
          const value = readProjection ? readProjection(PROJECTION_KEY) : undefined
          const model = React.useMemo(() => normalize(value, dict()), [value])
          const [open, setOpen] = React.useState({})
          const [flashTurn, setFlashTurn] = React.useState(null)
          const [copied, setCopied] = React.useState('')
          const [split, setSplit] = React.useState(340)
          const [bodyWidth, setBodyWidth] = React.useState(0)
          const paneRef = React.useRef(null)
          const bodyRef = React.useRef(null)
          const dragRef = React.useRef(null)

          React.useEffect(() => {
            const node = bodyRef.current
            if (!node || typeof ResizeObserver === 'undefined') return undefined
            const observer = new ResizeObserver(entries => {
              const width = entries && entries[0] ? entries[0].contentRect.width : 0
              if (width > 0) setBodyWidth(width)
            })
            observer.observe(node)
            return () => observer.disconnect()
          }, [model])

          const narrow = bodyWidth > 0 && bodyWidth < 760
          const maxLeft = Math.max(240, (bodyWidth || 900) - 280)
          const left = Math.max(220, Math.min(split, maxLeft))

          const startDrag = React.useCallback(event => {
            dragRef.current = { x: event.clientX, width: left }
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {}
          }, [left])

          const moveDrag = React.useCallback(event => {
            const drag = dragRef.current
            if (!drag) return
            const next = drag.width + (event.clientX - drag.x)
            setSplit(Math.max(220, Math.min(next, maxLeft)))
          }, [maxLeft])

          const endDrag = React.useCallback(event => {
            dragRef.current = null
            try {
              event.currentTarget.releasePointerCapture(event.pointerId)
            } catch {}
          }, [])

          const nudge = React.useCallback(event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const delta = event.key === 'ArrowLeft' ? -24 : 24
            setSplit(Math.max(220, Math.min(left + delta, maxLeft)))
          }, [left, maxLeft])

          React.useEffect(() => {
            if (flashTurn === null) return undefined
            const timer = setTimeout(() => setFlashTurn(null), 1600)
            return () => clearTimeout(timer)
          }, [flashTurn])

          React.useEffect(() => {
            if (!copied) return undefined
            const timer = setTimeout(() => setCopied(''), 1500)
            return () => clearTimeout(timer)
          }, [copied])

          const copy = React.useCallback((kind, text) => {
            copyText(text || '').then(ok => {
              if (ok) setCopied(kind)
            })
          }, [])

          const locate = React.useCallback(turn => {
            setFlashTurn(turn)
            const node = paneRef.current && paneRef.current.querySelector(`[data-turn="${turn}"]`)
            if (node && typeof node.scrollIntoView === 'function') {
              node.scrollIntoView({ block: 'center' })
            }
          }, [])

          const jumpToChat = React.useCallback(turn => {
            try {
              if (props && typeof props.openView === 'function') props.openView('chat', String(turn))
            } catch {}
          }, [props])

          const toggle = React.useCallback(key => {
            setOpen(previous => {
              const next = { ...previous }
              if (next[key]) delete next[key]
              else next[key] = true
              return next
            })
          }, [])

          const statusLabel = status => (dict().status && dict().status[status]) || status

          const header = h('header', { className: `${CLASS}-head`, key: 'head' },
            h('h2', { className: `${CLASS}-title` }, t('title')),
            h('span', { className: `${CLASS}-meta` },
              model ? `${model.file} · ${t('updated')} ${fmtDateTime(model.updatedAt)}` : t('subtitle')),
            h('span', { className: `${CLASS}-grow` }),
            model && model.handoff
              ? h('button', {
                  key: 'handoff',
                  type: 'button',
                  className: `${CLASS}-btn`,
                  'data-accent': '1',
                  onClick: () => copy('handoff', model.handoff),
                }, copied === 'handoff' ? t('copied') : t('copyHandoff'))
              : null,
            model && model.latest
              ? h('button', {
                  key: 'all',
                  type: 'button',
                  className: `${CLASS}-btn`,
                  onClick: () => copy('all', model.latest),
                }, copied === 'all' ? t('copied') : t('copy'))
              : null,
          )

          if (!model || model.turns.length === 0) {
            return h('section', { className: `${CLASS}-root` },
              h('style', { key: 'css' }, CSS),
              header,
              h('p', { className: `${CLASS}-empty` }, t('empty')),
            )
          }

          const anyOpen = model.turns.some(turn => open[turnKey(turn)])

          const timeline = h('div', { className: `${CLASS}-pane`, key: 'timeline' },
            h('div', { className: `${CLASS}-pane-head` },
              h('span', { className: `${CLASS}-pane-label` }, `${t('history')} · ${model.turns.length}`),
              h('span', { className: `${CLASS}-grow` }),
              h('button', {
                type: 'button',
                className: `${CLASS}-link`,
                onClick: () => {
                  if (anyOpen) {
                    setOpen({})
                    return
                  }
                  const next = {}
                  for (const turn of model.turns) next[turnKey(turn)] = true
                  setOpen(next)
                },
              }, anyOpen ? t('collapseAll') : t('expandAll')),
            ),
            h('div', { className: `${CLASS}-scroll` },
              h('div', { className: `${CLASS}-timeline` },
                model.days.map(day => h('div', { key: day.key },
                  h('h3', { className: `${CLASS}-day` }, day.key),
                  day.items.map(({ turn, at }) => {
                    const key = turnKey(turn)
                    const expanded = Boolean(open[key])
                    const detailId = `dsh-tr-detail-${key}`
                    const writes = Array.isArray(turn.writes) ? turn.writes : []
                    const reads = Array.isArray(turn.files) ? turn.files : []
                    return h('article', { key, className: `${CLASS}-card`, 'data-open': expanded ? '1' : '0' },
                      h('button', {
                        type: 'button',
                        className: `${CLASS}-row`,
                        'aria-expanded': expanded,
                        'aria-controls': detailId,
                        onClick: () => toggle(key),
                      },
                        h('span', { className: `${CLASS}-chev`, 'aria-hidden': true }, '▶'),
                        h('span', { className: `${CLASS}-stamp` }, fmtStamp(at)),
                        h('span', { className: `${CLASS}-pill`, style: { color: tone(turn.status) } }, statusLabel(turn.status)),
                        h('span', { className: `${CLASS}-summary`, title: turn.question || '' }, turn.keywords || turn.question || t('noQuestion')),
                        writes.length > 0
                          ? h('span', { className: `${CLASS}-count` }, `· ${writes.length} ${t('files')}`)
                          : null,
                      ),
                      expanded
                        ? h('div', { className: `${CLASS}-detail`, id: detailId },
                            h('div', { className: `${CLASS}-block` },
                              h('span', { className: `${CLASS}-k` }, t('question')),
                              h('div', { className: `${CLASS}-v` }, turn.question || t('noQuestion')),
                            ),
                            h('div', { className: `${CLASS}-block` },
                              h('span', { className: `${CLASS}-k` }, t('answer')),
                              h('div', { className: `${CLASS}-v` }, turn.answer || t('noAnswer')),
                            ),
                            writes.length > 0
                              ? h('div', { className: `${CLASS}-block` },
                                  h('span', { className: `${CLASS}-k` }, t('files')),
                                  h('div', { className: `${CLASS}-tag` },
                                    writes.map((file, index) => h('span', { key: `${file}-${index}` },
                                      index > 0 ? ' · ' : '',
                                      h('span', { className: `${CLASS}-code` }, file)))),
                                )
                              : (reads.length > 0
                                ? h('div', { className: `${CLASS}-block` },
                                    h('span', { className: `${CLASS}-k` }, t('readFiles')),
                                    h('div', { className: `${CLASS}-tag` },
                                      reads.slice(0, 6).map((file, index) => h('span', { key: `${file}-${index}` },
                                        index > 0 ? ' · ' : '',
                                        h('span', { className: `${CLASS}-code` }, file)))),
                                  )
                                : null),
                            Array.isArray(turn.tools) && turn.tools.length > 0
                              ? h('div', { className: `${CLASS}-block` },
                                  h('span', { className: `${CLASS}-k` }, t('tools')),
                                  h('div', { className: `${CLASS}-tag` },
                                    turn.tools.slice(0, 8).map(tool => `${tool.name}×${tool.count}`).join(' · '),
                                    turn.errors > 0 ? ` · ${turn.errors} ${t('errors')}` : ''),
                                )
                              : null,
                            h('div', { className: `${CLASS}-foot` },
                              h('button', {
                                type: 'button',
                                className: `${CLASS}-btn`,
                                onClick: () => copy(`turn-${key}`, turnText(turn, dict())),
                              }, copied === `turn-${key}` ? t('copied') : t('copyTurn')),
                              h('button', {
                                type: 'button',
                                className: `${CLASS}-btn`,
                                onClick: () => locate(turn.turn),
                              }, t('locate')),
                              h('button', {
                                type: 'button',
                                className: `${CLASS}-arrow`,
                                title: t('jumpChat'),
                                onClick: () => jumpToChat(turn.turn),
                              }, t('jumpChat'), h('span', { 'aria-hidden': true }, '↗')),
                            ),
                          )
                        : null,
                    )
                  }),
                )),
              ),
            ),
          )

          const content = h('div', { className: `${CLASS}-pane`, key: 'content' },
            h('div', { className: `${CLASS}-pane-head` },
              h('span', { className: `${CLASS}-pane-label` }, `${t('source')} · ${model.file}`),
            ),
            h('div', { className: `${CLASS}-scroll ${CLASS}-doc`, ref: paneRef },
              renderMarkdown(model.latest, flashTurn)),
          )

          return h('section', { className: `${CLASS}-root` },
            h('style', { key: 'css' }, CSS),
            header,
            h('div', {
              className: `${CLASS}-body`,
              ref: bodyRef,
              style: narrow
                ? { gridTemplateColumns: 'minmax(0,1fr)' }
                : { gridTemplateColumns: `${left}px 12px minmax(0,1fr)` },
            },
              timeline,
              narrow
                ? null
                : h('div', {
                    key: 'split',
                    className: `${CLASS}-split`,
                    role: 'separator',
                    'aria-orientation': 'vertical',
                    'aria-valuenow': Math.round(left),
                    'aria-label': t('resize'),
                    title: t('resize'),
                    tabIndex: 0,
                    onPointerDown: startDrag,
                    onPointerMove: moveDrag,
                    onPointerUp: endDrag,
                    onPointerCancel: endDrag,
                    onKeyDown: nudge,
                  }),
              content,
            ),
          )
        }

        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view',
          id: 'task-readme',
          order: 20,
          label: () => t('tab'),
        }, ReadmeView))
      },
    }
  },
})
