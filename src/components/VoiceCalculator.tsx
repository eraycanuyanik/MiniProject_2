import { useCallback, useRef } from 'react'

import { useCalculator } from '../hooks/useCalculator'
import {
  useSpeechRecognition,
  type VoiceCommand,
} from '../hooks/useSpeechRecognition'
import { speak, speakSequence } from '../voice/speak'
import {
  DIGIT_SPOKEN,
  resultToSpoken,
  type OperationId,
} from '../voice/vocabulary'

import './VoiceCalculator.css'

type KeyKind =
  | 'digit'
  | 'decimal'
  | 'op'
  | 'equals'
  | 'clear'
  | 'back'
  | 'percent'

type CalcKey = {
  id: string
  kind: KeyKind
  label: string
  span?: number
  op?: OperationId
  digit?: string
  speak: string
  /** Sağdaki işlem sütunu: fotoğrafta daha açık gri */
  opCol?: boolean
}

const KEYS: CalcKey[] = [
  { id: '7', kind: 'digit', label: '7', digit: '7', speak: DIGIT_SPOKEN[7] },
  { id: '8', kind: 'digit', label: '8', digit: '8', speak: DIGIT_SPOKEN[8] },
  { id: '9', kind: 'digit', label: '9', digit: '9', speak: DIGIT_SPOKEN[9] },
  {
    id: 'div',
    kind: 'op',
    label: '÷',
    op: 'divide',
    speak: 'over',
    opCol: true,
  },
  { id: '4', kind: 'digit', label: '4', digit: '4', speak: DIGIT_SPOKEN[4] },
  { id: '5', kind: 'digit', label: '5', digit: '5', speak: DIGIT_SPOKEN[5] },
  { id: '6', kind: 'digit', label: '6', digit: '6', speak: DIGIT_SPOKEN[6] },
  {
    id: 'mul',
    kind: 'op',
    label: '×',
    op: 'multiply',
    speak: 'times',
    opCol: true,
  },
  { id: '1', kind: 'digit', label: '1', digit: '1', speak: DIGIT_SPOKEN[1] },
  { id: '2', kind: 'digit', label: '2', digit: '2', speak: DIGIT_SPOKEN[2] },
  { id: '3', kind: 'digit', label: '3', digit: '3', speak: DIGIT_SPOKEN[3] },
  {
    id: 'sub',
    kind: 'op',
    label: '−',
    op: 'subtract',
    speak: 'minus',
    opCol: true,
  },
  {
    id: '0',
    kind: 'digit',
    label: '0',
    digit: '0',
    speak: DIGIT_SPOKEN[0],
  },
  { id: 'dot', kind: 'decimal', label: '.', speak: 'point' },
  {
    id: 'eq',
    kind: 'equals',
    label: '=',
    speak: 'is',
  },
  {
    id: 'add',
    kind: 'op',
    label: '+',
    op: 'add',
    speak: 'plus',
    opCol: true,
  },
]

function MicIcon() {
  return (
    <svg
      className="calc-mock__mic-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 19v2M9 22h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function VoiceCalculator() {
  const calc = useCalculator()

  const handlersRef = useRef({
    inputDigit: calc.inputDigit,
    inputDecimal: calc.inputDecimal,
    inputOperation: calc.inputOperation,
    inputEquals: calc.inputEquals,
    reset: calc.reset,
    backspace: calc.backspace,
    inputPercent: calc.inputPercent,
  })
  handlersRef.current = {
    inputDigit: calc.inputDigit,
    inputDecimal: calc.inputDecimal,
    inputOperation: calc.inputOperation,
    inputEquals: calc.inputEquals,
    reset: calc.reset,
    backspace: calc.backspace,
    inputPercent: calc.inputPercent,
  }

  const applyVoiceCommands = useCallback((commands: VoiceCommand[]) => {
    const h = handlersRef.current
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'digit':
          h.inputDigit(cmd.value)
          break
        case 'decimal':
          h.inputDecimal()
          break
        case 'op':
          h.inputOperation(cmd.op)
          break
        case 'equals':
          h.inputEquals()
          break
        case 'clear':
          h.reset()
          break
        case 'backspace':
          h.backspace()
          break
        default:
          break
      }
    }
  }, [])

  const { supported, listening, error, toggle } =
    useSpeechRecognition(applyVoiceCommands)

  const runKey = useCallback((key: CalcKey) => {
    const h = handlersRef.current

    switch (key.kind) {
      case 'digit':
        if (key.digit) {
          speak(key.speak)
          h.inputDigit(key.digit)
        }
        break
      case 'decimal':
        speak(key.speak)
        h.inputDecimal()
        break
      case 'op':
        if (key.op) {
          speak(key.speak)
          h.inputOperation(key.op)
        }
        break
      case 'equals': {
        const value = h.inputEquals()
        if (value !== null && Number.isFinite(value)) {
          speakSequence(['is', resultToSpoken(value)])
        } else {
          speak('is')
        }
        break
      }
      case 'clear':
        speak(key.speak)
        h.reset()
        break
      case 'back':
        speak(key.speak)
        h.backspace()
        break
      case 'percent':
        speak(key.speak)
        h.inputPercent()
        break
      default:
        break
    }
  }, [])

  return (
    <div className="calc-mock">
      <div
        className="calc-mock__shell"
        role="application"
        aria-label="Sesli hesap makinesi"
      >
        {/* Üst: sol boşluk + ekran (sadece 4 tuş sütunu genişliğinde) */}
        <div className="calc-mock__display-row">
          <div className="calc-mock__gutter" aria-hidden />
          <output
            className="calc-mock__display"
            htmlFor="calc-keys"
            aria-live="polite"
          >
            {calc.display}
          </output>
        </div>

        {/* Alt: 5×4 ızgara — (1,1) ve (1,4) boş, mic (1,2)-(1,3) ortada iki satır */}
        <div className="calc-mock__pad">
          <div className="calc-mock__pad-empty calc-mock__pad-empty--tl" />
          <button
            type="button"
            className={`calc-mock__mic ${listening ? 'calc-mock__mic--on' : ''}`}
            onClick={toggle}
            disabled={!supported}
            aria-pressed={listening}
            title={
              supported
                ? listening
                  ? 'Dinlemeyi durdur'
                  : 'Ses girişi'
                : 'Tarayıcıda ses tanıma yok'
            }
          >
            <MicIcon />
          </button>
          <div className="calc-mock__pad-empty calc-mock__pad-empty--bl" />

          <div className="calc-mock__keys" id="calc-keys">
            {KEYS.map((key) => (
              <button
                key={key.id}
                type="button"
                className={[
                  'calc-mock__key',
                  `calc-mock__key--${key.kind}`,
                  key.opCol ? 'calc-mock__key--opcol' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => runKey(key)}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>

        {!supported && (
          <p className="calc-mock__warn">
            Ses için Chrome veya Edge; mikrofon izni gerekir.
          </p>
        )}
        {error && <p className="calc-mock__error">{error}</p>}
      </div>

      <p className="calc-mock__hint">
        İngilizce: “five”, “plus”, “is”. <strong>clear</strong> /{' '}
        <strong>delete</strong>.
      </p>
    </div>
  )
}
