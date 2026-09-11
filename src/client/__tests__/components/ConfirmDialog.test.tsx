import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import ConfirmDialog from '../../components/common/ConfirmDialog/index.js'

const theme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
})

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('ConfirmDialog Component', () => {
  it('renders title, description, and custom action buttons when open', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        title="Cancel Order?"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Cancel Order?')).toBeInTheDocument()
    expect(
      screen.getByText('Are you sure you want to cancel this order? This action cannot be undone.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep order/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
  })

  it('does not display content when open is false', () => {
    renderWithTheme(
      <ConfirmDialog
        open={false}
        title="Cancel Order?"
        message="Are you sure you want to cancel this order?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('Cancel Order?')).not.toBeInTheDocument()
  })

  it('calls onClose when cancel button is clicked', () => {
    const handleClose = vi.fn()
    const handleConfirm = vi.fn()

    renderWithTheme(
      <ConfirmDialog
        open={true}
        title="Cancel Order?"
        cancelText="Keep Order"
        confirmText="Cancel Order"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />,
    )

    const keepBtn = screen.getByRole('button', { name: /keep order/i })
    act(() => {
      fireEvent.click(keepBtn)
    })

    expect(handleClose).toHaveBeenCalledTimes(1)
    expect(handleConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const handleClose = vi.fn()
    const handleConfirm = vi.fn()

    renderWithTheme(
      <ConfirmDialog
        open={true}
        title="Cancel Order?"
        cancelText="Keep Order"
        confirmText="Cancel Order"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />,
    )

    const cancelBtn = screen.getByRole('button', { name: /cancel order/i })
    act(() => {
      fireEvent.click(cancelBtn)
    })

    expect(handleConfirm).toHaveBeenCalledTimes(1)
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('disables buttons and shows loading text during loading state', () => {
    const handleConfirm = vi.fn()
    const handleClose = vi.fn()

    renderWithTheme(
      <ConfirmDialog
        open={true}
        title="Cancel Order?"
        confirmText="Cancel Order"
        cancelText="Keep Order"
        isLoading={true}
        loadingText="Cancelling…"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: /cancelling/i })
    const keepBtn = screen.getByRole('button', { name: /keep order/i })

    expect(confirmBtn).toBeDisabled()
    expect(keepBtn).toBeDisabled()

    // Attempting click while loading must not trigger onConfirm
    act(() => {
      fireEvent.click(confirmBtn)
    })
    expect(handleConfirm).not.toHaveBeenCalled()
  })

  it('provides proper ARIA accessibility labels', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        title="Cancel Order?"
        message="Accessible description text"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-labelledby', 'cartiva-confirm-dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'cartiva-confirm-dialog-description')
  })
})
