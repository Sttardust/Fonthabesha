/**
 * CollectionEditModal — Radix Dialog for creating or editing an admin collection.
 * Handles both create (no initialData) and edit (with initialData) modes.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Local shape sufficient for the modal (AdminCollection type removed from shared types)
interface AdminCollection {
  name: string;
  description?: string;
  isPublic: boolean;
}

const schema = z.object({
  name:        z.string().min(1, 'Name is required').max(80),
  description: z.string().max(300).optional(),
  isPublic:    z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AdminCollection | null;
  isPending: boolean;
  onSubmit: (data: { name: string; description?: string; isPublic: boolean }) => void;
}

export default function CollectionEditModal({
  open,
  onOpenChange,
  initialData,
  isPending,
  onSubmit,
}: Props) {
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        initialData?.name        ?? '',
      description: initialData?.description ?? '',
      isPublic:    initialData?.isPublic    ?? true,
    },
  });

  // Re-populate form when switching between create / edit
  useEffect(() => {
    reset({
      name:        initialData?.name        ?? '',
      description: initialData?.description ?? '',
      isPublic:    initialData?.isPublic    ?? true,
    });
  }, [initialData, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      name:        data.name,
      description: data.description || undefined,
      isPublic:    data.isPublic,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm-overlay" />
        <Dialog.Content
          className="confirm-dialog collection-modal"
          aria-describedby="col-modal-desc"
        >
          <Dialog.Title className="confirm-dialog__title">
            {isEdit ? 'Edit Collection' : 'New Collection'}
          </Dialog.Title>
          <Dialog.Description id="col-modal-desc" className="confirm-dialog__desc">
            {isEdit
              ? 'Update the collection name, description, or visibility.'
              : 'Create a curated collection of font families.'}
          </Dialog.Description>

          <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="col-name">
                Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="col-name"
                className={`form-input${errors.name ? ' form-input--error' : ''}`}
                placeholder="e.g. Headline Favorites"
                {...register('name')}
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="col-desc">
                Description <span className="form-label__optional">(optional)</span>
              </label>
              <textarea
                id="col-desc"
                className="form-input form-textarea"
                rows={3}
                placeholder="A short description of this collection…"
                {...register('description')}
              />
              {errors.description && (
                <p className="form-error">{errors.description.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="toggle-label" htmlFor="col-public">
                <input
                  id="col-public"
                  type="checkbox"
                  className="toggle-input"
                  {...register('isPublic')}
                />
                <span className="toggle-track" aria-hidden="true" />
                Publicly visible
              </label>
              <p className="form-hint" style={{ marginTop: '4px' }}>
                Public collections appear on the Collections page for all visitors.
              </p>
            </div>

            <div className="confirm-dialog__actions">
              <Dialog.Close asChild>
                <button type="button" className="btn btn--secondary" disabled={isPending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn--primary" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create collection'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type="button"
              className="confirm-dialog__close"
              aria-label="Close"
              disabled={isPending}
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
