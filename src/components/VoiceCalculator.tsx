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
}

const KEYS: CalcKey[] = [
  { id: 'ac', kind: 'clear', label: 'AC', speak: 'clear' },
  { id: 'del', kind: 'back', label: '⌫', speak: 'delete' },
  { id: 'pct', kind: 'percent', label: '%', speak: 'percent' },
  {
    id: 'div',
    kind: 'op',
    label: '÷',
    op: 'divide',
    speak: 'over',
  },
  { id: '7', kind: 'digit', label: '7', digit: '7', speak: DIGIT_SPOKEN[7] },
  { id: '8', kind: 'digit', label: '8', digit: '8', speak: DIGIT_SPOKEN[8] },
  { id: '9', kind: 'digit', label: '9', digit: '9', speak: DIGIT_SPOKEN[9] },
  {
    id: 'mul',
    kind: 'op',
    label: '×',
    op: 'multiply',
    speak: 'times',
  },
  { id: '4', kind: 'digit', label: '4', digit: '4', speak: DIGIT_SPOKEN[4] },
  { id: '5', kind: 'digit', label: '5', digit: '5', speak: DIGIT_SPOKEN[5] },
  { id: '6', kind: 'digit', label: '6', digit: '6', speak: DIGIT_SPOKEN[6] },
  {
    id: 'sub',
    kind: 'op',
    label: '−',
    op: 'subtract',
    speak: 'minus',
  },
  { id: '1', kind: 'digit', label: '1', digit: '1', speak: DIGIT_SPOKEN[1] },
  { id: '2', kind: 'digit', label: '2', digit: '2', speak: DIGIT_SPOKEN[2] },
  { id: '3', kind: 'digit', label: '3', digit: '3', speak: DIGIT_SPOKEN[3] },
  {
    id: 'add',
    kind: 'op',
    label: '+',
    op: 'add',
    speak: 'plus',
  },
  {
    id: '0',
    kind: 'digit',
    label: '0',
    digit: '0',
    speak: DIGIT_SPOKEN[0],
    span: 2,
  },
  { id: 'dot', kind: 'decimal', label: '.', speak: 'point' },
  {
    id: 'eq',
    kind: 'equals',
    label: '=',
    speak: 'is',
  },
]

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
    <div className="voice-calculator">
      <header className="voice-calculator__header">
        <h1>Voice calculator</h1>
        <p className="voice-calculator__hint">
          Use the mic for spoken commands (e.g. “five”, “plus”, “two”, “is”) or
          tap keys for spoken feedback.
        </p>
      </header>

      <div className="voice-calculator__shell">
        <button
          type="button"
          className={`voice-calculator__mic ${listening ? 'voice-calculator__mic--on' : ''}`}
          onClick={toggle}
          disabled={!supported}
          aria-pressed={listening}
          title={
            supported
              ? listening
                ? 'Stop voice input'
                : 'Start voice input'
              : 'Speech recognition not available'
          }
        >
          <span className="voice-calculator__mic-icon" aria-hidden>
            {listening ? '●' : '🎤'}
          </span>
          <span className="voice-calculator__mic-label">
            {listening ? 'Listening' : 'Mic'}
          </span>
        </button>

        <div className="voice-calculator__panel">
          <output
            className="voice-calculator__display"
            htmlFor="calc-keys"
            aria-live="polite"
          >
            {calc.display}
          </output>

          {!supported && (
            <p className="voice-calculator__warn">
              Voice input needs a Chromium-based browser (Chrome, Edge) with
              microphone access.
            </p>
          )}
          {error && <p className="voice-calculator__error">{error}</p>}

          <div className="voice-calculator__keys" id="calc-keys">
            {KEYS.map((key) => (
              <button
                key={key.id}
                type="button"
                className={`voice-calculator__key voice-calculator__key--${key.kind}`}
                style={key.span ? { gridColumn: `span ${key.span}` } : undefined}
                onClick={() => runKey(key)}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
