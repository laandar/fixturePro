import { ReactNode } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'

type DeleteConfirmationModalProps = {
  show: boolean
  onHide: () => void
  onConfirm: () => void
  selectedCount: number
  itemName?: string
  confirmButtonVariant?: string
  cancelButtonVariant?: string
  modalTitle?: string
  confirmButtonText?: string
  cancelButtonText?: string
  children?: ReactNode
  isLoading?: boolean
}

const DeleteConfirmationModal = ({
  show,
  onHide,
  onConfirm,
  selectedCount,
  itemName = 'row',
  confirmButtonVariant = 'danger',
  cancelButtonVariant = 'light',
  modalTitle = 'Confirm Deletion',
  confirmButtonText = 'Delete',
  cancelButtonText = 'Cancel',
  children,
  isLoading = false,
}: DeleteConfirmationModalProps) => {
  const getConfirmationMessage = () => {
    if (children) return children

    if (selectedCount > 1) {
      return `¿Estás seguro de que quieres eliminar estos ${selectedCount} ${itemName}?`
    }
    return `¿Estás seguro de que quieres eliminar este ${itemName}?`
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton>
        <ModalTitle>{modalTitle}</ModalTitle>
      </ModalHeader>
      <ModalBody>{getConfirmationMessage()}</ModalBody>
      <ModalFooter>
        <Button variant={cancelButtonVariant} onClick={onHide} disabled={isLoading}>
          {cancelButtonText}
        </Button>
        <Button variant={confirmButtonVariant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {confirmButtonText}
            </>
          ) : (
            confirmButtonText
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default DeleteConfirmationModal
