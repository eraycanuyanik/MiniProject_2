/** Spoken labels for digits 0–9 (assignment mapping). */
export const DIGIT_SPOKEN = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
] as const

export type OperationId = 'add' | 'subtract' | 'multiply' | 'divide'

const WORD_TO_DIGIT = new Map<string, string>()
for (let i = 0; i <= 9; i++) {
  WORD_TO_DIGIT.set(DIGIT_SPOKEN[i], String(i))
}

/** Accepts STT variants like "to" for "two" in noisy input. */
const WORD_ALIASES: Record<string, string> = {
  oh: 'zero',
  zero: 'zero',
  won: 'one',
  one: 'one',
  /** Common mis-hearings of "one" in Web Speech API */
  wun: 'one',
  wan: 'one',
  on: 'one',
  to: 'two',
  two: 'two',
  too: 'two',
  three: 'three',
  tree: 'three',
  for: 'four',
  four: 'four',
  fore: 'four',
  five: 'five',
  six: 'six',
  sicks: 'six',
  seven: 'seven',
  eight: 'eight',
  ate: 'eight',
  nine: 'nine',
}

const OP_WORDS: Record<string, OperationId | 'equals' | 'decimal'> = {
  plus: 'add',
  '+': 'add',
  minus: 'subtract',
  subtract: 'subtract',
  '-': 'subtract',
  times: 'multiply',
  multiply: 'multiply',
  x: 'multiply',
  over: 'divide',
  divided: 'divide',
  division: 'divide',
  '÷': 'divide',
  '/': 'divide',
  is: 'equals',
  equals: 'equals',
  equal: 'equals',
  point: 'decimal',
  dot: 'decimal',
  decimal: 'decimal',
  '.': 'decimal',
}

/** Normalize one STT token (avoid \\p{} regex — older engines / minifiers can break it). */
export function normalizeToken(raw: string): string {
  let s = raw.toLowerCase().trim()
  s = s.replace(/[,;'"’`]/g, '')
  /* Trim common leading/trailing noise without stripping letters/digits inside words */
  s = s.replace(/^[\s.:;!?()[\]{}«»]+/, '').replace(/[\s.:;!?()[\]{}«»]+$/, '')
  return s.trim()
}

export function tokenToDigit(token: string): string | null {
  const n = normalizeToken(token)
  if (!n) return null
  const viaAlias = WORD_ALIASES[n]
  const key = viaAlias ?? n
  if (WORD_TO_DIGIT.has(key)) return WORD_TO_DIGIT.get(key)!
  /* ASCII or fullwidth digit */
  const ascii = n.replace(/[\uFF10-\uFF19]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  )
  if (/^\d$/.test(ascii)) return ascii
  return null
}

export type ControlAction = 'clear' | 'backspace'

/** Voice-only: all-clear vs delete last digit (matches AC / ⌫ buttons). */
export function tokenToControl(token: string): ControlAction | null {
  const n = normalizeToken(token)
  if (!n) return null
  const map: Record<string, ControlAction> = {
    clear: 'clear',
    reset: 'clear',
    all: 'clear',
    ac: 'clear',
    erase: 'clear',
    empty: 'clear',
    delete: 'backspace',
    back: 'backspace',
    backspace: 'backspace',
    del: 'backspace',
    remove: 'backspace',
    /** spoken ⌫ */
    scratch: 'backspace',
    /* Turkish (mic locale / mixed speech) */
    temizle: 'clear',
    sıfırla: 'clear',
    sifirla: 'clear',
    sil: 'backspace',
    geri: 'backspace',
  }
  return map[n] ?? null
}

export function tokenToCommand(
  token: string,
): OperationId | 'equals' | 'decimal' | null {
  const n = normalizeToken(token)
  return OP_WORDS[n] ?? null
}

/** Speakable form of a calculation result (e.g. 8 → "eight", 3.5 → "three point five"). */
export function resultToSpoken(n: number): string {
  if (!Number.isFinite(n)) return 'error'
  if (n === 0 && 1 / n < 0) return 'negative zero'

  const negative = n < 0
  const v = Math.abs(n)

  if (Number.isInteger(v) && v <= 999999) {
    const words = integerToWords(Math.trunc(v))
    return negative ? `minus ${words}` : words
  }

  const s = v.toString()
  const parts = s.split(/e/i)
  if (parts.length > 1) {
    const compact = negative ? `minus ${n}` : String(n)
    return compact.split('').map(spokenChar).join(' ')
  }

  const [intPart, frac] = s.split('.')
  const intWords =
    intPart && intPart.length > 0
      ? integerToWords(parseInt(intPart, 10))
      : DIGIT_SPOKEN[0]
  if (!frac) return negative ? `minus ${intWords}` : intWords

  const fracWords = frac
    .split('')
    .map((d) => DIGIT_SPOKEN[parseInt(d, 10)] ?? d)
    .join(' ')
  const core = `${intWords} point ${fracWords}`
  return negative ? `minus ${core}` : core
}

function spokenChar(c: string): string {
  if (c === '-' || c === '−') return 'minus'
  if (c === '.') return 'point'
  if (/^\d$/.test(c)) return DIGIT_SPOKEN[parseInt(c, 10)]
  return c
}

function integerToWords(n: number): string {
  if (n === 0) return DIGIT_SPOKEN[0]
  if (n < 0) return `minus ${integerToWords(-n)}`

  const ones = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ]
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ]

  function chunk0to999(num: number): string {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) {
      const t = Math.floor(num / 10)
      const o = num % 10
      return o ? `${tens[t]} ${ones[o]}` : tens[t]
    }
    const h = Math.floor(num / 100)
    const rest = num % 100
    const head = `${ones[h]} hundred`
    return rest ? `${head} ${chunk0to999(rest)}` : head
  }

  if (n < 1000) return chunk0to999(n)

  const parts: string[] = []
  let rest = n
  const scales = [
    { v: 1_000_000_000, w: 'billion' },
    { v: 1_000_000, w: 'million' },
    { v: 1_000, w: 'thousand' },
  ] as const
  for (const { v, w } of scales) {
    if (rest >= v) {
      const c = Math.floor(rest / v)
      rest %= v
      parts.push(`${chunk0to999(c)} ${w}`.trim())
    }
  }
  if (rest > 0) parts.push(chunk0to999(rest))
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
