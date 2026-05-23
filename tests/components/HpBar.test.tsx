import { render } from '@testing-library/react'
import HpBar from '../../src/components/HpBar'

describe('HpBar', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<HpBar current={100} max={100} />)
    expect(getByTestId('hp-bar-container')).toBeTruthy()
    expect(getByTestId('hp-bar-fill')).toBeTruthy()
  })

  it('shows 100% width when current equals max', () => {
    const { getByTestId } = render(<HpBar current={100} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.style.width).toBe('100%')
  })

  it('shows 50% width when current is half of max', () => {
    const { getByTestId } = render(<HpBar current={50} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.style.width).toBe('50%')
  })

  it('shows 0% width when current is 0', () => {
    const { getByTestId } = render(<HpBar current={0} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.style.width).toBe('0%')
  })

  it('applies green class when HP is above 50%', () => {
    const { getByTestId } = render(<HpBar current={75} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-green-500')
  })

  it('applies yellow class when HP is between 25% and 50%', () => {
    const { getByTestId } = render(<HpBar current={40} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-yellow-400')
  })

  it('applies red class when HP is below 25%', () => {
    const { getByTestId } = render(<HpBar current={20} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-red-500')
  })

  it('applies green at exactly 51%', () => {
    const { getByTestId } = render(<HpBar current={51} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-green-500')
  })

  it('applies yellow at exactly 50%', () => {
    const { getByTestId } = render(<HpBar current={50} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-yellow-400')
  })

  it('applies yellow at exactly 26%', () => {
    const { getByTestId } = render(<HpBar current={26} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-yellow-400')
  })

  it('applies red at exactly 25%', () => {
    const { getByTestId } = render(<HpBar current={25} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.className).toContain('bg-red-500')
  })

  it('clamps to 0% when current is negative', () => {
    const { getByTestId } = render(<HpBar current={-10} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.style.width).toBe('0%')
  })

  it('exposes data-pct attribute with rounded percentage', () => {
    const { getByTestId } = render(<HpBar current={50} max={100} />)
    const fill = getByTestId('hp-bar-fill')
    expect(fill.getAttribute('data-pct')).toBe('50')
  })
})
