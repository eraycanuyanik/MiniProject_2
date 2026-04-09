import { useCallback, useState } from 'react'

import type { OperationId } from '../voice/vocabulary'

export type CalculatorSnapshot = {
  display: string
  previousValue: number | null
  operation: OperationId | null
  waitingForOperand: boolean
}

const initial: CalculatorSnapshot = {
  display: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: true,
}

function parseDisplay(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function applyOp(
  a: number,
  b: number,
  op: OperationId,
): { value: number; error?: string } {
  switch (op) {
    case 'add':
      return { value: a + b }
    case 'subtract':
      return { value: a - b }
    case 'multiply':
      return { value: a * b }
    case 'divide':
      if (b === 0) return { value: NaN, error: 'Cannot divide by zero' }
      return { value: a / b }
    default:
      return { value: b }
  }
}

export function useCalculator() {
  const [display, setDisplay] = useState(initial.display)
  const [previousValue, setPreviousValue] = useState<number | null>(
    initial.previousValue,
  )
  const [operation, setOperation] = useState<OperationId | null>(
    initial.operation,
  )
  const [waitingForOperand, setWaitingForOperand] = useState(
    initial.waitingForOperand,
  )

  const snapshot = useCallback(
    (): CalculatorSnapshot => ({
      display,
      previousValue,
      operation,
      waitingForOperand,
    }),
    [display, previousValue, operation, waitingForOperand],
  )

  const reset = useCallback(() => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(true)
  }, [])

  const inputDigit = useCallback(
    (digit: string) => {
      if (!/^\d$/.test(digit)) return
      if (waitingForOperand) {
        setDisplay(digit)
        setWaitingForOperand(false)
        return
      }
      setDisplay((d) => (d === '0' && !d.includes('.') ? digit : d + digit))
    },
    [waitingForOperand],
  )

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    setDisplay((d) => {
      if (d.includes('.')) return d
      return `${d}.`
    })
  }, [waitingForOperand])

  const inputOperation = useCallback(
    (next: OperationId) => {
      const current = parseDisplay(display)

      if (previousValue !== null && operation && !waitingForOperand) {
        const { value, error } = applyOp(previousValue, current, operation)
        if (error) {
          setDisplay('Error')
          setPreviousValue(null)
          setOperation(null)
          setWaitingForOperand(true)
          return
        }
        setPreviousValue(value)
        setDisplay(String(value))
        setOperation(next)
        setWaitingForOperand(true)
        return
      }

      setPreviousValue(current)
      setOperation(next)
      setWaitingForOperand(true)
    },
    [display, operation, previousValue, waitingForOperand],
  )

  const inputEquals = useCallback((): number | null => {
    if (previousValue === null || operation === null) {
      setWaitingForOperand(true)
      return null
    }
    const current = parseDisplay(display)
    const { value, error } = applyOp(previousValue, current, operation)
    if (error) {
      setDisplay('Error')
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
      return null
    }
    const formatted = formatResult(value)
    setDisplay(formatted)
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(true)
    return value
  }, [display, operation, previousValue])

  const backspace = useCallback(() => {
    if (waitingForOperand) return
    setDisplay((d) => {
      if (d.length <= 1) {
        setWaitingForOperand(true)
        return '0'
      }
      const next = d.slice(0, -1)
      if (next === '-' || next === '-0') return '0'
      return next
    })
  }, [waitingForOperand])

  const inputPercent = useCallback(() => {
    const n = parseDisplay(display)
    if (!Number.isFinite(n)) return
    const v = n / 100
    setDisplay(formatResult(v))
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(true)
  }, [display])

  return {
    display,
    previousValue,
    operation,
    waitingForOperand,
    snapshot,
    reset,
    inputDigit,
    inputDecimal,
    inputOperation,
    inputEquals,
    backspace,
    inputPercent,
  }
}

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return 'Error'
  const s = String(n)
  if (s.length > 12) return n.toPrecision(8)
  return s
}
