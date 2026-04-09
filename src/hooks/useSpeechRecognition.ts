import { useCallback, useEffect, useRef, useState } from 'react'

import {
  normalizeToken,
  tokenToCommand,
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

function parseTranscript(text: string): VoiceCommand[] {
  const raw = text.trim()
  if (!raw) return []

  const tokens = raw.split(/\s+/).map(normalizeToken).filter(Boolean)
  const out: VoiceCommand[] = []

  for (const t of tokens) {
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
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let combined = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        combined += event.results[i][0].transcript
      }
      const cmds = parseTranscript(combined)
      if (cmds.length) onCommands(cmds)
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
  }, [onCommands, stop])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => () => stop(), [stop])

  return { supported, listening, error, start, stop, toggle }
}
