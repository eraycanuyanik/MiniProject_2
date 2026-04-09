let queue: Promise<void> = Promise.resolve()

export function speak(text: string, rate = 1): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  queue = queue.then(
    () =>
      new Promise<void>((resolve) => {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.rate = rate
        u.lang = 'en-US'
        u.onend = () => resolve()
        u.onerror = () => resolve()
        window.speechSynthesis.speak(u)
      }),
  )
}

export function speakSequence(parts: string[], gapMs = 80): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  queue = queue.then(async () => {
    for (let i = 0; i < parts.length; i++) {
      await new Promise<void>((resolve) => {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(parts[i])
        u.lang = 'en-US'
        u.rate = 1
        u.onend = () => resolve()
        u.onerror = () => resolve()
        window.speechSynthesis.speak(u)
      })
      if (i < parts.length - 1) {
        await new Promise((r) => setTimeout(r, gapMs))
      }
    }
  })
}
