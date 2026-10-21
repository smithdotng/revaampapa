'use client'
import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered, Heading2, Undo2 } from 'lucide-react'

/**
 * Small rich-text box for listing descriptions. Writes HTML into a hidden
 * input named `name`; the server cleans it before saving.
 */
export function RichText({ name, defaultValue = '', error, label, hint }: { name: string; defaultValue?: string; error?: string; label: string; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(defaultValue)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== defaultValue) ref.current.innerHTML = defaultValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const cmd = (c: string, v?: string) => {
    ref.current?.focus()
    document.execCommand(c, false, v)
    setHtml(ref.current?.innerHTML || '')
  }
  const tools: [string, React.ComponentType<{ className?: string }>, () => void][] = [
    ['Bold', Bold, () => cmd('bold')],
    ['Italic', Italic, () => cmd('italic')],
    ['Heading', Heading2, () => cmd('formatBlock', 'h3')],
    ['Bulleted list', List, () => cmd('insertUnorderedList')],
    ['Numbered list', ListOrdered, () => cmd('insertOrderedList')],
    ['Undo', Undo2, () => cmd('undo')],
  ]
  return (
    <div>
      <span id={`${name}-label`} className="field-label">{label}</span>
      <div className={`overflow-hidden rounded-[var(--radius-sm)] border bg-white focus-within:border-teal focus-within:ring-[3px] focus-within:ring-teal/15 ${error ? 'border-danger' : 'border-line-2'}`}>
        <div role="toolbar" aria-label="Formatting" className="flex gap-0.5 border-b border-line bg-paper p-1">
          {tools.map(([t, Icon, fn]) => (
            <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn} title={t} aria-label={t}
              className="grid size-9 place-items-center rounded-[6px] text-ink-2 hover:bg-white hover:text-ink">
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${name}-label`}
          aria-invalid={error ? true : undefined}
          contentEditable
          suppressContentEditableWarning
          onInput={() => setHtml(ref.current?.innerHTML || '')}
          className="prose-rv min-h-[200px] px-4 py-3 text-base outline-none [&_h3]:text-lg"
        />
      </div>
      <input type="hidden" name={name} value={html} />
      {(error || hint) && <p className={`field-hint ${error ? '!text-danger' : ''}`}>{error || hint}</p>}
    </div>
  )
}
