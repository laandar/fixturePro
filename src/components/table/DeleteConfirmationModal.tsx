import { ReactNode } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import { ExclamationTriangle, CheckCircle, InfoCircle, ExclamationCircle } from 'react-bootstrap-icons'

type ConfirmationModalProps = {
  show: boolean
  onHide: () => void
  onConfirm: () => void
  selectedCount?: number
  itemName?: string
  confirmButtonVariant?: string
  cancelButtonVariant?: string
  modalTitle?: string
  confirmButtonText?: string
  cancelButtonText?: string
  children?: ReactNode
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'info' | 'success'
  message?: string
  itemToDelete?: string // Nombre del elemento específico a eliminar
  showBadgeDesign?: boolean // Para activar el diseño con badges
}

const ConfirmationModal = ({
  show,
  onHide,
  onConfirm,
  selectedCount,
  itemName = 'row',
  confirmButtonVariant,
  cancelButtonVariant = 'secondary',
  modalTitle,
  confirmButtonText,
  cancelButtonText = 'Cancelar',
  children,
  isLoading = false,
  variant = 'warning',
  message,
  itemToDelete,
  showBadgeDesign = false,
}: ConfirmationModalProps) => {
  
  const getIcon = () => {
    const iconSize = 24
    
    switch (variant) {
      case 'danger':
        return <ExclamationCircle className="text-danger" size={iconSize} />
      case 'warning':
        return <ExclamationTriangle className="text-warning" size={iconSize} />
      case 'info':
        return <InfoCircle className="text-info" size={iconSize} />
      case 'success':
        return <CheckCircle className="text-success" size={iconSize} />
      default:
        return <ExclamationTriangle className="text-warning" size={iconSize} />
    }
  }

  const getConfirmButtonVariant = () => {
    if (confirmButtonVariant) return confirmButtonVariant
    
    switch (variant) {
      case 'danger':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      case 'success':
        return 'success'
      default:
        return 'warning'
    }
  }

  const getDefaultTitle = () => {
    if (modalTitle) return modalTitle
    
    switch (variant) {
      case 'danger':
        return 'Confirmar Eliminación'
      case 'warning':
        return 'Confirmar Acción'
      case 'info':
        return 'Información'
      case 'success':
        return 'Confirmar'
      default:
        return 'Confirmar Acción'
    }
  }

  const getDefaultConfirmText = () => {
    if (confirmButtonText) return confirmButtonText
    
    switch (variant) {
      case 'danger':
        return 'Eliminar'
      case 'warning':
        return 'Confirmar'
      case 'info':
        return 'Aceptar'
      case 'success':
        return 'Confirmar'
      default:
        return 'Confirmar'
    }
  }

  const getBadgeColorClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-danger-subtle text-danger-emphasis'
      case 'warning':
        return 'bg-warning-subtle text-warning-emphasis'
      case 'info':
        return 'bg-info-subtle text-info-emphasis'
      case 'success':
        return 'bg-success-subtle text-success-emphasis'
      default:
        return 'bg-secondary-subtle text-secondary-emphasis'
    }
  }

  const getBadgeDesign = () => {
    if (!showBadgeDesign || !itemToDelete) return null

    const badgeClass = getBadgeColorClass()
    const labelColor = variant === 'danger' ? 'text-danger' : 
                      variant === 'warning' ? 'text-warning' : 
                      variant === 'info' ? 'text-info' : 'text-success'

    return (
      <div className="text-center">
        <p>¿Estás seguro de que quieres eliminar este {itemName}?</p>
        <div className="mb-3">
          <h6 className={`${labelColor} mb-2`}>{itemName} a eliminar:</h6>
          <span className={`badge ${badgeClass} fs-6 px-3 py-2`}>
            {itemToDelete}
          </span>
        </div>
        <p className="text-muted small">
          Esta acción no se puede deshacer.
        </p>
      </div>
    )
  }

  const getConfirmationMessage = () => {
    if (children) return children
    if (showBadgeDesign && itemToDelete) return getBadgeDesign()
    if (message) return message

    if (selectedCount && selectedCount > 1) {
      return `¿Estás seguro de que quieres eliminar estos ${selectedCount} ${itemName}?`
    }
    return `¿Estás seguro de que quieres eliminar este ${itemName}?`
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <ModalHeader closeButton>
        <ModalTitle className="d-flex align-items-center gap-2">
          {getIcon()}
          {getDefaultTitle()}
        </ModalTitle>
      </ModalHeader>
      
      <ModalBody>
        <div className="d-flex align-items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>
          <div className="flex-grow-1">
            <div className="mb-0 text-muted">
              {getConfirmationMessage()}
            </div>
          </div>
        </div>
      </ModalBody>
      
      <ModalFooter>
        <Button variant={cancelButtonVariant} onClick={onHide} disabled={isLoading}>
          {cancelButtonText}
        </Button>
        <Button variant={getConfirmButtonVariant()} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Procesando...
            </>
          ) : (
            getDefaultConfirmText()
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default ConfirmationModal

// Mantener compatibilidad con el nombre anterior
export { ConfirmationModal as DeleteConfirmationModal }
