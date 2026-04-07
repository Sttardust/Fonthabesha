/**
 * CollectionEditModal — Radix Dialog for creating or editing an admin collection.
 * Handles both create (no initialData) and edit (with initialData) modes.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Local shape sufficient for the modal
interface AdminCollection {
  id?: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
}

const schema = z.object({
  title:       z.string().min(1, 'Title is required').max(80),
  description: z.string().max(300).optional(),
  isPublic:    z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData?: AdminCollection | null;
  onClose: () => void;
  onSaved: () => void;
}

const PREFIX = '/api/v1/admin/collections';

export default function CollectionEditModal({ initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:       initialData?.title       ?? '',
      description: initialData?.description ?? '',
      isPublic:    initialData?.isPublic    ?? true,
    },
  });

  // Re-populate form when switching between create / edit
  useEffect(() => {
    reset({
      title:       initialData?.title       ?? '',
      description: initialData?.description ?? '',
      isPublic:    initialData?.isPublic    ?? true,
    });
  }, [initialData, reset]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        title:       data.title,
        description: data.description || undefined,
        isPublic:    data.isPublic,
      };
      if (isEdit && initialData?.id) {
        return apiClient.patch(`${PREFIX}/${initialData.id}`, payload);
      }
      return apiClient.post(PREFIX, payload);
    },
    onSuccess: () => onSaved(),
  });

  const handleFormSubmit = (data: FormData) => {
    saveMut.mutate(data);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
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
              ? 'Update the collection title, description, or visibility.'
              : 'Create a curated collection of font families.'}
          </Dialog.Description>

          <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="col-title">
                Title <span aria-hidden="true">*</span>
              </label>
              <input
                id="col-title"
                className={`form-input${errors.title ? ' form-input--error' : ''}`}
                placeholder="e.g. Headline Favorites"
                {...register('title')}
              />
              {errors.title && <p className="form-error">{errors.title.message}</p>}
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
                <button type="button" className="btn btn--secondary" disabled={saveMut.isPending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn--primary" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create collection'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type="button"
              className="confirm-dialog__close"
              aria-label="Close"
              disabled={saveMut.isPending}
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
