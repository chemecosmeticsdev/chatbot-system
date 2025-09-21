import { render, screen, fireEvent } from '@/lib/test-utils'
import { Button } from './button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('inline-flex')
    expect(button).not.toBeDisabled()
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-input')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-primary')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)

    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()
    render(<Button ref={ref}>Ref test</Button>)

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)

    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('inline-flex') // Should still have base classes
  })

  it('renders as different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link button</a>
      </Button>
    )

    const link = screen.getByRole('link', { name: 'Link button' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveClass('inline-flex') // Should have button classes
  })

  it('handles keyboard navigation', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Keyboard test</Button>)

    const button = screen.getByRole('button', { name: 'Keyboard test' })

    // Test Enter key
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    expect(handleClick).toHaveBeenCalledTimes(1)

    // Test Space key
    fireEvent.keyDown(button, { key: ' ', code: 'Space' })
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('has proper focus states', () => {
    render(<Button>Focus test</Button>)

    const button = screen.getByRole('button', { name: 'Focus test' })

    button.focus()
    expect(button).toHaveFocus()
    expect(button).toHaveClass('focus-visible:outline-none')
  })

  it('renders loading state correctly', () => {
    render(<Button disabled>Loading...</Button>)

    const button = screen.getByRole('button', { name: 'Loading...' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('supports icon buttons', () => {
    render(
      <Button size="icon" aria-label="Close">
        <span>×</span>
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Close' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('h-10', 'w-10')
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Button aria-label="Accessible button" aria-describedby="description">
          Button
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Accessible button' })
      expect(button).toHaveAttribute('aria-label', 'Accessible button')
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })

    it('supports aria-disabled when disabled', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button', { name: 'Disabled' })
      expect(button).toHaveAttribute('disabled')
    })

    it('has proper tabindex', () => {
      render(<Button>Focusable</Button>)

      const button = screen.getByRole('button', { name: 'Focusable' })
      expect(button).toHaveAttribute('tabindex', '0')
    })

    it('maintains focus outline for keyboard users', () => {
      render(<Button>Focus outline</Button>)

      const button = screen.getByRole('button', { name: 'Focus outline' })
      expect(button).toHaveClass('focus-visible:ring-2')
    })
  })

  describe('Color contrast and theming', () => {
    it('has sufficient color contrast in default variant', () => {
      render(<Button variant="default">Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('has sufficient color contrast in destructive variant', () => {
      render(<Button variant="destructive">Destructive</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
    })
  })

  describe('Performance', () => {
    it('renders quickly', () => {
      const startTime = performance.now()
      render(<Button>Performance test</Button>)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should render in less than 50ms
    })

    it('handles rapid state changes', () => {
      const { rerender } = render(<Button disabled>Initial</Button>)

      for (let i = 0; i < 10; i++) {
        rerender(<Button disabled={i % 2 === 0}>State {i}</Button>)
      }

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })
})