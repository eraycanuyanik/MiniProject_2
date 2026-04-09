import { useCallback, useEffect, useRef, useState } from 'react'

import {
  normalizeToken,
  tokenToCommand,
  tokenToControl,
  tokenToDigit,
} from '../voice/vocabulary'

type WebSpeechRecognition = InstanceType<
  NonNullable<typeof window.webkitSpeechRecognition>
>

export type VoiceCommand =
  | { type: 'digit'; value: string }
  | { type: 'decimal' }
  | { type: 'op'; op: 'add' | 'subtract' | 'multiply' | 'divide' }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'backspace' }

/** Insert spaces where the engine glued words (e.g. "oneplus" → "one plus"). */
function expandGluedWords(text: string): string {
  let s = text.toLowerCase()
  s = s.replace(/[,;]/g, ' ')
  /* digit word directly followed by an operator word */
  s = s.replace(
    /(zero|one|two|three|four|five|six|seven|eight|nine|oh|won|wun|wan)(plus|minus|times|over|is)\b/gi,
    '$1 $2',
  )
  /* operator word directly followed by a digit word */
  s = s.replace(
    /\b(plus|minus|times|over)\s*(zero|one|two|three|four|five|six|seven|eight|nine|oh|won|wun|wan)\b/gi,
    '$1 $2',
  )
  /* "is" + result digit chain start */
  s = s.replace(
    /\b(is)\s*(zero|one|two|three|four|five|six|seven|eight|nine|oh|won|wun|wan)\b/gi,
    '$1 $2',
  )
  return s.replace(/\s+/g, ' ').trim()
}

function splitTranscript(text: string): string[] {
  const normalized = expandGluedWords(text)
  return normalized.split(/\s+/).filter(Boolean)
}

function parseTranscript(text: string): VoiceCommand[] {
  const raw = text.trim()
  if (!raw) return []

  const tokens = splitTranscript(raw).map(normalizeToken).filter(Boolean)
  const out: VoiceCommand[] = []

  for (const t of tokens) {
    const control = tokenToControl(t)
    if (control === 'clear') {
      out.push({ type: 'clear' })
      continue
    }
    if (control === 'backspace') {
      out.push({ type: 'backspace' })
      continue
    }

    const digit = tokenToDigit(t)
    if (digit !== null) {
      out.push({ type: 'digit', value: digit })
      continue
    }
    const cmd = tokenToCommand(t)
    if (cmd === 'decimal') {
      out.push({ type: 'decimal' })
      continue
    }
    if (cmd === 'equals') {
      out.push({ type: 'equals' })
      continue
    }
    if (
      cmd === 'add' ||
      cmd === 'subtract' ||
      cmd === 'multiply' ||
      cmd === 'divide'
    ) {
      out.push({ type: 'op', op: cmd })
    }
  }

  return out
}

export function useSpeechRecognition(
  onCommands: (commands: VoiceCommand[]) => void,
) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<WebSpeechRecognition | null>(null)
  const onCommandsRef = useRef(onCommands)
  onCommandsRef.current = onCommands

  useEffect(() => {
    const SR =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined
    setSupported(!!SR)
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    setError(null)
    stop()

    const rec = new SR()
    rec.continuous = true
    /* interim=true keeps results non-final until long pause — nothing was processed */
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      try {
        let chunk = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          chunk += event.results[i][0].transcript
        }
        const cmds = parseTranscript(chunk)
        if (cmds.length) onCommandsRef.current(cmds)
      } catch {
        /* ignore parse errors so recognition keeps running */
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone permission denied. Allow the mic and try again.')
        stop()
      } else if (e.error === 'no-speech') {
        /* ignore */
      } else if (e.error !== 'aborted') {
        setError(e.message || e.error)
      }
    }

    rec.onend = () => {
      if (recRef.current === rec) {
        try {
          rec.start()
        } catch {
          setListening(false)
        }
      }
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Could not start the microphone.')
    }
  }, [stop])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => () => stop(), [stop])

  return { supported, listening, error, start, stop, toggle }
}
