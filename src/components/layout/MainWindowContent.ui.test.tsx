import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { useUIStore } from '@/store/ui-store'
import { MainWindowContent } from './MainWindowContent'

describe('main window content', () => {
  beforeEach(() => useUIStore.setState({ lastQuickPaneEntry: null }))
  it('shows the empty state', () => {
    render(<MainWindowContent />)
    expect(
      screen.getByRole('heading', { name: 'Hello World' })
    ).toBeInTheDocument()
  })
  it('renders submitted content as text, not HTML', () => {
    useUIStore.setState({
      lastQuickPaneEntry: '<script>not executable</script>',
    })
    render(<MainWindowContent />)
    expect(screen.getByRole('heading')).toHaveTextContent(
      '<script>not executable</script>'
    )
    expect(document.querySelector('script')).toBeNull()
  })
  it('accepts feature content without rendering the placeholder', () => {
    render(
      <MainWindowContent>
        <button>Feature action</button>
      </MainWindowContent>
    )
    expect(
      screen.getByRole('button', { name: 'Feature action' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
