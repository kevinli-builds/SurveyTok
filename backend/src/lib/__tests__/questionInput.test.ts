import { describe, it, expect } from 'vitest'
import { validateQuestionInput, validateAnswerValue, MAX_TEXT, MAX_OPTION } from '../questionInput'

describe('validateQuestionInput', () => {
  it('accepts a valid yes/no question and drops options', () => {
    const v = validateQuestionInput({ text: '  Coffee or tea? ', type: 'yesno', options: ['x'] })
    expect(v).toEqual({ ok: true, text: 'Coffee or tea?', type: 'yesno', options: null })
  })

  it('accepts a valid multiple-choice question (trimmed)', () => {
    const v = validateQuestionInput({ text: 'Pick one', type: 'multiplechoice', options: [' a ', 'b'] })
    expect(v).toEqual({ ok: true, text: 'Pick one', type: 'multiplechoice', options: ['a', 'b'] })
  })

  it('rejects an unknown type', () => {
    expect(validateQuestionInput({ text: 'hi', type: 'ranking' })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 'hi', type: undefined })).toMatchObject({ ok: false })
  })

  it('rejects empty / non-string text', () => {
    expect(validateQuestionInput({ text: '   ', type: 'yesno' })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 123, type: 'yesno' })).toMatchObject({ ok: false })
  })

  it('caps text length', () => {
    const long = 'x'.repeat(MAX_TEXT + 1)
    expect(validateQuestionInput({ text: long, type: 'yesno' })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 'x'.repeat(MAX_TEXT), type: 'yesno' })).toMatchObject({ ok: true })
  })

  it('requires 2–4 non-empty options for multiple choice', () => {
    expect(validateQuestionInput({ text: 'q', type: 'multiplechoice', options: ['only'] })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 'q', type: 'multiplechoice', options: ['a', 'b', 'c', 'd', 'e'] })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 'q', type: 'multiplechoice', options: ['a', '  '] })).toMatchObject({ ok: false })
    expect(validateQuestionInput({ text: 'q', type: 'multiplechoice', options: 'ab' })).toMatchObject({ ok: false })
  })

  it('caps each option length', () => {
    const opts = ['ok', 'y'.repeat(MAX_OPTION + 1)]
    expect(validateQuestionInput({ text: 'q', type: 'multiplechoice', options: opts })).toMatchObject({ ok: false })
  })
})

describe('validateAnswerValue', () => {
  it('accepts short trimmed values', () => {
    expect(validateAnswerValue(' yes ')).toEqual({ ok: true, value: 'yes' })
    expect(validateAnswerValue('3')).toEqual({ ok: true, value: '3' })
  })
  it('rejects empty, non-string, or oversized values', () => {
    expect(validateAnswerValue('')).toMatchObject({ ok: false })
    expect(validateAnswerValue(undefined)).toMatchObject({ ok: false })
    expect(validateAnswerValue(0)).toMatchObject({ ok: false })
    expect(validateAnswerValue('x'.repeat(17))).toMatchObject({ ok: false })
  })
})
