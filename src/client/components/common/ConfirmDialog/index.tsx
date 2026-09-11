import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { FiAlertTriangle, FiInfo, FiX, FiHelpCircle } from 'react-icons/fi'
import './ConfirmDialog.css'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'primary' | 'info'

export interface ConfirmDialogProps {
  open: boolean
  title?: React.ReactNode
  message?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  onConfirm: () => void | Promise<void>
  onClose: () => void
  maxWidth?: 'xs' | 'sm' | 'md'
  hideCancelButton?: boolean
  disableBackdropClick?: boolean
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    icon: React.ReactNode
    iconColor: string
    iconBg: string
    confirmButtonColor: 'error' | 'warning' | 'primary' | 'info'
    confirmButtonClass: string
  }
> = {
  danger: {
    icon: <FiAlertTriangle size={24} />,
    iconColor: '#cc0c39',
    iconBg: 'rgba(204, 12, 57, 0.12)',
    confirmButtonColor: 'error',
    confirmButtonClass: 'cv-confirm-btn--danger',
  },
  warning: {
    icon: <FiAlertTriangle size={24} />,
    iconColor: '#e47911',
    iconBg: 'rgba(228, 121, 17, 0.12)',
    confirmButtonColor: 'warning',
    confirmButtonClass: 'cv-confirm-btn--warning',
  },
  primary: {
    icon: <FiHelpCircle size={24} />,
    iconColor: '#ff9900',
    iconBg: 'rgba(255, 153, 0, 0.12)',
    confirmButtonColor: 'primary',
    confirmButtonClass: 'cv-confirm-btn--primary',
  },
  info: {
    icon: <FiInfo size={24} />,
    iconColor: '#007185',
    iconBg: 'rgba(0, 113, 133, 0.12)',
    confirmButtonColor: 'info',
    confirmButtonClass: 'cv-confirm-btn--info',
  },
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  loadingText,
  icon,
  onConfirm,
  onClose,
  maxWidth = 'xs',
  hideCancelButton = false,
  disableBackdropClick = false,
}) => {
  const currentVariant = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.danger
  const activeIcon = icon ?? currentVariant.icon

  const handleBackdropClose = (_event: object, reason: string) => {
    if (isLoading) return
    if (disableBackdropClick && reason === 'backdropClick') return
    onClose()
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoading) return
    onConfirm()
  }

  return (
    <Dialog
      open={open}
      onClose={handleBackdropClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="cartiva-confirm-dialog-title"
      aria-describedby="cartiva-confirm-dialog-description"
      slotProps={{
        paper: {
          className: 'cv-confirm-dialog__paper',
          elevation: 8,
          sx: {
            borderRadius: '16px',
            overflow: 'hidden',
            p: { xs: 2.5, sm: 3 },
            position: 'relative',
          },
        },
        backdrop: {
          className: 'cv-confirm-dialog__backdrop',
          sx: {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(15, 17, 17, 0.65)',
          },
        },
      }}
    >
      {/* Top close button */}
      {!isLoading && (
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          size="small"
          className="cv-confirm-dialog__close"
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            color: 'text.secondary',
            transition: 'all 0.15s ease',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: 'action.hover',
            },
          }}
        >
          <FiX size={18} />
        </IconButton>
      )}

      {/* Header with icon badge & title */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
        <Box
          className="cv-confirm-dialog__icon-badge"
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: currentVariant.iconColor,
            backgroundColor: currentVariant.iconBg,
          }}
        >
          {activeIcon}
        </Box>

        <Box sx={{ flex: 1, pr: 3 }}>
          <DialogTitle
            id="cartiva-confirm-dialog-title"
            sx={{
              p: 0,
              fontSize: { xs: '1.15rem', sm: '1.25rem' },
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.3,
            }}
          >
            {title}
          </DialogTitle>
        </Box>
      </Box>

      {/* Description Content */}
      <DialogContent sx={{ p: 0, mt: 0.5, mb: 3 }}>
        <DialogContentText
          id="cartiva-confirm-dialog-description"
          sx={{
            fontSize: '0.925rem',
            color: 'text.secondary',
            lineHeight: 1.55,
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>

      {/* Action Buttons */}
      <DialogActions
        sx={{
          p: 0,
          gap: 1.5,
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'flex-end',
          '& > :not(:first-of-type)': {
            marginLeft: { sm: 1.5, xs: 0 },
          },
        }}
      >
        {!hideCancelButton && (
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={isLoading}
            autoFocus
            className="cv-confirm-btn cv-confirm-btn--cancel"
            sx={{
              borderRadius: '8px',
              py: 1,
              px: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {cancelText}
          </Button>
        )}

        <Button
          variant="contained"
          color={currentVariant.confirmButtonColor}
          onClick={handleConfirm}
          disabled={isLoading}
          className={`cv-confirm-btn ${currentVariant.confirmButtonClass}`}
          sx={{
            borderRadius: '8px',
            py: 1,
            px: 2.8,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          {isLoading && <CircularProgress size={16} color="inherit" sx={{ mr: 0.5 }} />}
          {isLoading ? (loadingText ?? 'Processing…') : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
