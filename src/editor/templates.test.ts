import { describe, expect, it } from 'vitest'
import { applyTemplate, insideMath, MATH_BLOCK, TEMPLATES, type Template } from './templates'

const named = (title: string): Template => TEMPLATES.find(template => template.title === title)!

// the document after inserting, with [ ] around what ends up selected
function result(doc: string, from: number, to: number, template: Template): string {
  const { insert, selectFrom, selectTo } = applyTemplate(doc, from, to, template)
  const next = doc.slice(0, from) + insert + doc.slice(to)
  return next.slice(0, selectFrom) + '[' + next.slice(selectFrom, selectTo) + ']' + next.slice(selectTo)
}

describe('insideMath', () => {
  it('knows whether a position is in a block', () => {
    const doc = 'text ${ a + b } more'
    expect(insideMath(doc, 2)).toBe(false)
    expect(insideMath(doc, 9)).toBe(true)
    expect(insideMath(doc, 17)).toBe(false)
  })

  it('counts a block that is still being typed', () => {
    expect(insideMath('so ${ sin(', 10)).toBe(true)
  })

  it('is not fooled by braces inside the block', () => {
    const doc = '${ {a: 1}.a + 2 }'
    expect(insideMath(doc, 14)).toBe(true)
  })
})

describe('applyTemplate', () => {
  it('wraps math in a block when inserted into prose', () => {
    expect(result('The root is ', 12, 12, named('Square root'))).toBe('The root is ${ sqrt([x]) }')
  })

  it('does not wrap again inside a block', () => {
    expect(result('${ 1 +  }', 7, 7, named('Square root'))).toBe('${ 1 + sqrt([x]) }')
  })

  it('puts selected text where the placeholder would be', () => {
    expect(result('${ a + 1 }', 3, 8, named('Square root'))).toBe('${ sqrt([a + 1]) }')
    expect(result('make this loud', 10, 14, named('Bold'))).toBe('make this **[loud]**')
  })

  it('inserts an empty block with the cursor inside', () => {
    expect(result('', 0, 0, MATH_BLOCK)).toBe('${ [] }')
  })

  it('turns selected prose into a block', () => {
    expect(result('so x^2 + 1 here', 3, 10, MATH_BLOCK)).toBe('so ${ [x^2 + 1] } here')
  })

  it('starts a heading or list item on its own line', () => {
    expect(result('some text', 9, 9, named('Heading'))).toBe('some text\n## [Heading]')
    expect(result('some text\n', 10, 10, named('List item'))).toBe('some text\n- [item]')
    expect(result('', 0, 0, named('Heading'))).toBe('## [Heading]')
  })

  it('leaves every math template evaluable as inserted', async () => {
    const { evaluateBlock } = await import('@/evaluator/evaluate')
    const { parseStatements } = await import('@/parser/dslParser')

    for (const template of TEMPLATES.filter(t => t.math && t !== MATH_BLOCK)) {
      const source = template.text.replace(/[«»]/g, '')
      const results = evaluateBlock(parseStatements(`a = 1, b = 2, x = 3, ${source}`))
      expect(results.at(-1), template.title).not.toMatchObject({ type: 'error' })
    }
  })
})
