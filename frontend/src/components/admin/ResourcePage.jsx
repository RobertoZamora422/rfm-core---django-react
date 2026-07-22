import { useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingState } from '../ui/LoadingState'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { useResource } from '../../hooks/useResource'

export function ResourcePage({
  allowDelete = false,
  columns,
  createLabel,
  deleteLabel = 'Eliminar',
  description,
  emptyMessage,
  FormComponent,
  mobileTitle,
  service,
  title,
}) {
  const [editingItem, setEditingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const {
    error,
    fieldErrors,
    isDeleting,
    isLoading,
    isSaving,
    items,
    remove,
    save,
    setError,
    setFieldErrors,
  } = useResource(service)

  const openCreate = () => {
    setEditingItem(null)
    setFieldErrors({})
    setError('')
    setIsFormOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFieldErrors({})
    setError('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setEditingItem(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    const saved = await save({ id: editingItem?.id, payload })
    if (saved) closeForm()
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    const deleted = await remove(deletingItem.id)
    if (deleted) setDeletingItem(null)
  }

  const tableColumns = [
    ...columns,
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions">
          <Button icon={Edit3} onClick={() => openEdit(item)} variant="secondary">
            Editar
          </Button>
          {allowDelete ? (
            <Button icon={Trash2} onClick={() => setDeletingItem(item)} variant="ghost">
              {deleteLabel}
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button icon={Plus} onClick={openCreate}>
            {createLabel}
          </Button>
        }
        description={description}
        title={title}
      />

      <ErrorMessage>{error}</ErrorMessage>

      <Card>
        {isLoading ? (
          <LoadingState label="Cargando registros" />
        ) : (
          <DataTable
            columns={tableColumns}
            emptyMessage={emptyMessage}
            mobileTitle={mobileTitle}
            rows={items}
          />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? `Editar ${title.toLowerCase()}` : createLabel}
      >
        <FormComponent
          errors={fieldErrors}
          key={editingItem?.id ?? 'nuevo'}
          initialValues={editingItem}
          isSubmitting={isSaving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Confirmar eliminacion"
      >
        <div className="confirm-dialog">
          <p>Se eliminara el registro seleccionado. Esta accion no debe ejecutarse sobre datos en uso.</p>
          <div className="form-actions">
            <Button onClick={() => setDeletingItem(null)} variant="secondary">
              Cancelar
            </Button>
            <Button icon={Trash2} isLoading={isDeleting} onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
