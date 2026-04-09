/// <reference types="vite/client" />

type SpeechRecognitionCtor = new () => SpeechRecognitionPolyfill

interface SpeechRecognitionPolyfill extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor
    webkitSpeechRecognition: SpeechRecognitionCtor
  }
}

export {}
