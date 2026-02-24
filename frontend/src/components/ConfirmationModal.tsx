import React, { useState } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  if (!isOpen) return null

  const getModalStyles = () => {
    switch (type) {
      case 'danger':
        return {
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white',
          icon: '⚠️'
        }
      case 'warning':
        return {
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmText: 'text-white',
          icon: '⚠️'
        }
      default:
        return {
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white',
          icon: 'ℹ️'
        }
    }
  }

  const styles = getModalStyles()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onCancel} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 dark:bg-gray-800">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">{styles.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          
          <p className="text-gray-600 mb-6 dark:text-gray-300">
            {message}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md transition-colors ${styles.confirmBg} ${styles.confirmText}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface UseConfirmationModal {
  ConfirmationModal: React.FC
  showConfirmation: (props: Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>) => Promise<boolean>
}

export const useConfirmationModal = (): UseConfirmationModal => {
  const [modalProps, setModalProps] = useState<Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'> | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const showConfirmation = (props: Omit<ConfirmationModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>) => {
    return new Promise<boolean>((resolve) => {
      setModalProps(props)
      setResolvePromise(() => resolve)
    })
  }

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise(true)
    }
    setModalProps(null)
    setResolvePromise(null)
  }

  const handleCancel = () => {
    if (resolvePromise) {
      resolvePromise(false)
    }
    setModalProps(null)
    setResolvePromise(null)
  }

  const ModalComponent = () => (
    <ConfirmationModal
      isOpen={!!modalProps}
      title={modalProps?.title || ''}
      message={modalProps?.message || ''}
      confirmText={modalProps?.confirmText}
      cancelText={modalProps?.cancelText}
      type={modalProps?.type}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return {
    ConfirmationModal: ModalComponent,
    showConfirmation
  }
}
