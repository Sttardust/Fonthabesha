import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { adminApi } from '@/lib/api/admin';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import Pagination from '@/components/shared/Pagination';
import type { LicenseAdmin } from '@/lib/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const licenseSchema = z.object({
  code:                  z.string().min(1).max(30),
  name:                  z.string().min(1).max(120),
  summaryEn:             z.string().min(1).max(500),
  summaryAm:             z.string().min(1).max(500),
  fullTextUrl:           z.string().url('Must be a valid URL'),
  allowsRedistribution:  z.boolean(),
  allowsCommercialUse:   z.boolean(),
  requiresAttribution:   z.boolean(),
  isActive:              z.boolean(),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

// ── Form modal ────────────────────────────────────────────────────────────────

function LicenseForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  title,
}: {
  initial?: LicenseAdmin;
  onSave: (data: LicenseFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
  title: string;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: initial
      ? {
          code:                 initial.code,
          name:                 initial.name,
          summaryEn:            initial.summaryEn,
          summaryAm:            initial.summaryAm,
          fullTextUrl:          initial.fullTextUrl,
          allowsRedistribution: initial.allowsRedistribution,
          allowsCommercialUse:  initial.allowsCommercialUse,
          requiresAttribution:  initial.requiresAttribution,
          isActive:             initial.isActive,
        }
      : {
          allowsRedistribution: true,
          allowsCommercialUse:  true,
          requiresAttribution:  false,
          isActive:             true,
        },
  });

  return (
    <div className="vocab-form-overlay">
      <div className="vocab-form-modal">
        <h2 className="vocab-form-modal__title">{title}</h2>
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="vocab-form-grid">
            <div className="form-field">
              <label className="form-label">{t('admin.licenses.code')}</label>
              <input className={`form-input${errors.code ? ' form-input--error' : ''}`} {...register('code')} />
              {errors.code && <p className="form-error">{errors.code.message}</p>}
            </div>
            <div className="form-field">
              <label className="form-label">{t('admin.licenses.name')}</label>
              <input className={`form-input${errors.name ? ' form-input--error' : ''}`} {...register('name')} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">{t('admin.licenses.summaryEn')}</label>
              <textarea rows={3} className={`form-textarea${errors.summaryEn ? ' form-input--error' : ''}`} {...register('summaryEn')} />
              {errors.summaryEn && <p className="form-error">{errors.summaryEn.message}</p>}
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">{t('admin.licenses.summaryAm')}</label>
              <textarea rows={3} className={`form-textarea${errors.summaryAm ? ' form-input--error' : ''}`} {...register('summaryAm')} />
              {errors.summaryAm && <p className="form-error">{errors.summaryAm.message}</p>}
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">{t('admin.licenses.fullTextUrl')}</label>
              <input type="url" className={`form-input${errors.fullTextUrl ? ' form-input--error' : ''}`} {...register('fullTextUrl')} />
              {errors.fullTextUrl && <p className="form-error">{errors.fullTextUrl.message}</p>}
            </div>
            <div className="form-field form-field--checkboxes">
              <label className="form-checkbox">
                <input type="checkbox" {...register('allowsRedistribution')} />
                {t('licenses.redistribute')}
              </label>
              <label className="form-checkbox">
                <input type="checkbox" {...register('allowsCommercialUse')} />
                {t('licenses.commercial')}
              </label>
              <label className="form-checkbox">
                <input type="checkbox" {...register('requiresAttribution')} />
                {t('licenses.attribution')}
              </label>
              <label className="form-checkbox">
                <input type="checkbox" {...register('isActive')} />
                {t('admin.licenses.active')}
              </label>
            </div>
          </div>

          <div className="vocab-form-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LicensesAdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LicenseAdmin | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-licenses', page],
    queryFn: () => adminApi.listLicenses(page),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });

  const createMutation = useMutation({
    mutationFn: (payload: LicenseFormData) => adminApi.createLicense(payload),
    onSuccess: () => { setCreatingNew(false); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LicenseFormData }) =>
      adminApi.updateLicense(id, payload),
    onSuccess: () => { setEditing(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteLicense(id),
    onSuccess: () => invalidate(),
  });

  const licenses = data?.items ?? [];

  return (
    <>
      <Helmet>
        <title>{t('admin.licenses.title')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container">
        <header className="page-header page-header--row">
          <div>
            <h1 className="page-title">{t('admin.licenses.title')}</h1>
            {data && (
              <p className="page-subtitle">
                {data.pagination.totalItems} {t(`admin.licenses.items`)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setCreatingNew(true); setEditing(null); }}
          >
            + {t('admin.licenses.new')}
          </button>
        </header>

        {isLoading && <LoadingSpinner label={t('common.loading')} />}
        {isError && <ErrorState message={t('common.error')} onRetry={() => refetch()} />}

        {!isLoading && !isError && (
          <div className="vocab-table-wrap">
            <table className="vocab-table">
              <thead>
                <tr>
                  <th>{t('admin.licenses.code')}</th>
                  <th>{t('admin.licenses.name')}</th>
                  <th>{t('licenses.redistribute')}</th>
                  <th>{t('licenses.commercial')}</th>
                  <th>{t('licenses.attribution')}</th>
                  <th>{t('admin.licenses.active')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {licenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="vocab-table__empty">
                      {t('admin.licenses.empty')}
                    </td>
                  </tr>
                )}
                {licenses.map((lic) => (
                  <tr key={lic.id} className="vocab-table__row">
                    <td className="vocab-table__cell">
                      <span className="badge">{lic.code}</span>
                    </td>
                    <td className="vocab-table__cell">{lic.name}</td>
                    <td className="vocab-table__cell vocab-table__cell--center">
                      {lic.allowsRedistribution ? '✓' : '✗'}
                    </td>
                    <td className="vocab-table__cell vocab-table__cell--center">
                      {lic.allowsCommercialUse ? '✓' : '✗'}
                    </td>
                    <td className="vocab-table__cell vocab-table__cell--center">
                      {lic.requiresAttribution ? '✓' : '✗'}
                    </td>
                    <td className="vocab-table__cell vocab-table__cell--center">
                      <span className={lic.isActive ? 'badge--status-approved badge' : 'badge'}>
                        {lic.isActive ? t('admin.licenses.activeYes') : t('admin.licenses.activeNo')}
                      </span>
                    </td>
                    <td className="vocab-table__cell vocab-table__cell--actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => { setEditing(lic); setCreatingNew(false); }}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-ghost btn--sm"
                        onClick={() => {
                          if (window.confirm(
                            t('admin.vocab.deleteConfirm', { name: lic.name })
                          )) {
                            deleteMutation.mutate(lic.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={data?.pagination.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {/* Create / edit form modal */}
      {(creatingNew || editing) && (
        <LicenseForm
          title={editing ? t('admin.licenses.edit') : t('admin.licenses.new')}
          initial={editing ?? undefined}
          onSave={(formData) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload: formData });
            } else {
              createMutation.mutate(formData);
            }
          }}
          onCancel={() => { setCreatingNew(false); setEditing(null); }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </>
  );
}
