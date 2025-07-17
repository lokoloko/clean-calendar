import React from 'react'
import { render, screen } from '@testing-library/react'
import PageHeader from '@/components/page-header'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <PageHeader title="Test Title">
        <button>Test Button</button>
      </PageHeader>
    )
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  it('does not render children section when no children provided', () => {
    const { container } = render(<PageHeader title="Test Title" />)
    const childrenDiv = container.querySelector('div:last-child')
    expect(childrenDiv?.children.length).toBe(1) // Only the title div
  })
})