import { describe, expect, it } from 'vitest'

import { navigationItems } from '@/constants/navigation'

const unique = (values: readonly string[]) => new Set(values).size === values.length

describe('navigationItems', () => {
  it('keeps unique labels and paths', () => {
    const labels = navigationItems.map((item) => item.label)
    const paths = navigationItems.map((item) => item.to)

    expect(unique(labels)).toBe(true)
    expect(unique(paths)).toBe(true)
  })

  it('includes the expected primary routes', () => {
    const paths = navigationItems.map((item) => item.to)

    expect(paths).toEqual(['/', '/request', '/my', '/approvals', '/admin'])
  })
})
