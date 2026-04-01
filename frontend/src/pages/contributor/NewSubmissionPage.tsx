/**
 * NewSubmissionPage — create a new draft submission.
 *
 * The backend CreateSubmissionDto requires:
 *   - familyNameEn (required)
 *   - declaredLicenseId (UUID from GET /api/v1/licenses)
 *   - ownershipEvidenceType + ownershipEvidenceValue
 *   - contributorStatementText
 *   - termsAcceptanceName
 *
 * We fetch available licenses from the API to populate the license dropdown.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';

// ── License fetch ─────────────────────────────────────────────────────────────

interface LicenseOption { id: string; code: string; name: string; }

const schema = z.object({
  familyNameEn: z.string().min(2, 'Required — at least 2 characters').max(120),
  familyNameAm: z.string().max(120).optional(),
  descriptionEn: z.string().max(2000).optional(),
  descriptionAm: z.string().max(2000).optional(),
  declaredLicenseId: z.string().uuid('Select a license'),
  ownershipEvidenceType: z.enum([
    'source_url',
    'repository_url',
    'license_file',
    'ownership_statement',
    'other_document',
  ]),
  ownershipEvidenceValue: z
    .string()
    .min(5, 'Required')
    .max(1000),
  contributorStatementText: z
    .string()
    .min(20, 'Statement must be at least 20 characters')
    .max(2000),
  termsAcceptanceName: z
    .string()
    .min(2, 'Required — enter your legal name')
    .max(160),
});

type FormData = z.infer<typeof schema>;

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  source_url: 'Source URL (e.g. GitHub)',
  repository_url: 'Repository URL',
  license_file: 'License file',
  ownership_statement: 'Ownership statement',
  other_document: 'Other document',
};

export default function NewSubmissionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: licenses } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => apiClient.get<LicenseOption[]>('/api/v1/licenses'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownershipEvidenceType: 'source_url',
      contributorStatementText:
        'I am the original author of this font and hold all necessary rights to distribute it under the selected license.',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const submission = await contributorApi.create({
        familyNameEn: data.familyNameEn,
        familyNameAm: data.familyNameAm || undefined,
        descriptionEn: data.descriptionEn || undefined,
        descriptionAm: data.descriptionAm || undefined,
        declaredLicenseId: data.declaredLicenseId,
        ownershipEvidenceType: data.ownershipEvidenceType,
        ownershipEvidenceValue: data.ownershipEvidenceValue,
        contributorStatementText: data.contributorStatementText,
        termsAcceptanceName: data.termsAcceptanceName,
      });
      navigate(`/contributor/submissions/${submission.id}`);
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : t('common.error'),
      });
    }
  };

  return (
    <>
      <Helmet><title>{t('contributor.newSubmission')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('contributor.newSubmission')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="submission-form" noValidate>
        {/* Family names */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="familyNameEn">
              Family Name (English) <span aria-hidden="true">*</span>
            </label>
            <input
              id="familyNameEn"
              className={`form-input${errors.familyNameEn ? ' form-input--error' : ''}`}
              {...register('familyNameEn')}
              placeholder="e.g. Abyssinica SIL"
            />
            {errors.familyNameEn && <p className="form-error">{errors.familyNameEn.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="familyNameAm">
              Family Name (አማርኛ) <span className="form-label__optional">optional</span>
            </label>
            <input
              id="familyNameAm"
              className="form-input"
              {...register('familyNameAm')}
              lang="am"
            />
          </div>
        </div>

        {/* License */}
        <div className="form-group">
          <label className="form-label" htmlFor="declaredLicenseId">
            License <span aria-hidden="true">*</span>
          </label>
          <select
            id="declaredLicenseId"
            className={`form-input${errors.declaredLicenseId ? ' form-input--error' : ''}`}
            {...register('declaredLicenseId')}
          >
            <option value="">Select a license…</option>
            {licenses?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.name}
              </option>
            ))}
          </select>
          {errors.declaredLicenseId && (
            <p className="form-error">{errors.declaredLicenseId.message}</p>
          )}
        </div>

        {/* Ownership evidence */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="ownershipEvidenceType">
              Ownership Evidence Type <span aria-hidden="true">*</span>
            </label>
            <select
              id="ownershipEvidenceType"
              className="form-input"
              {...register('ownershipEvidenceType')}
            >
              {Object.entries(EVIDENCE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ownershipEvidenceValue">
              Evidence Value <span aria-hidden="true">*</span>
            </label>
            <input
              id="ownershipEvidenceValue"
              className={`form-input${errors.ownershipEvidenceValue ? ' form-input--error' : ''}`}
              {...register('ownershipEvidenceValue')}
              placeholder="URL, file reference, or statement…"
            />
            {errors.ownershipEvidenceValue && (
              <p className="form-error">{errors.ownershipEvidenceValue.message}</p>
            )}
          </div>
        </div>

        {/* Descriptions */}
        <div className="form-group">
          <label className="form-label" htmlFor="descriptionEn">Description (English)</label>
          <textarea
            id="descriptionEn"
            className="form-input form-textarea"
            rows={3}
            {...register('descriptionEn')}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="descriptionAm">Description (አማርኛ)</label>
          <textarea
            id="descriptionAm"
            className="form-input form-textarea"
            rows={3}
            lang="am"
            {...register('descriptionAm')}
          />
        </div>

        {/* Contributor statement */}
        <div className="form-group">
          <label className="form-label" htmlFor="contributorStatementText">
            Contributor Statement <span aria-hidden="true">*</span>
          </label>
          <p className="form-hint">
            Confirm that you are the author and have rights to distribute this font.
          </p>
          <textarea
            id="contributorStatementText"
            className={`form-input form-textarea${errors.contributorStatementText ? ' form-input--error' : ''}`}
            rows={3}
            {...register('contributorStatementText')}
          />
          {errors.contributorStatementText && (
            <p className="form-error">{errors.contributorStatementText.message}</p>
          )}
        </div>

        {/* Terms acceptance name */}
        <div className="form-group">
          <label className="form-label" htmlFor="termsAcceptanceName">
            Your Legal Name (for terms acceptance) <span aria-hidden="true">*</span>
          </label>
          <input
            id="termsAcceptanceName"
            className={`form-input${errors.termsAcceptanceName ? ' form-input--error' : ''}`}
            {...register('termsAcceptanceName')}
            placeholder="Full legal name"
          />
          {errors.termsAcceptanceName && (
            <p className="form-error">{errors.termsAcceptanceName.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="form-error form-error--global">{errors.root.message}</p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : 'Create Draft'}
          </button>
        </div>
      </form>
    </>
  );
}
