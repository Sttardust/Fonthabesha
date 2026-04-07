import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { contributorApi } from '@/lib/api/contributor';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  familyNameAm: z.string().min(1, 'Required'),
  familyNameEn: z.string().min(1, 'Required'),
  category: z.enum(['serif', 'sans_serif', 'display', 'handwriting', 'monospace', 'decorative']),
  scriptSupport: z.enum(['ethiopic', 'latin', 'both']),
  license: z.string().min(1, 'Required'),
  licenseUrl: z.string().url().optional().or(z.literal('')),
  descriptionAm: z.string().optional(),
  descriptionEn: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewSubmissionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'serif', scriptSupport: 'ethiopic', license: 'OFL-1.1' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const submission = await contributorApi.create({
        familyName: { am: data.familyNameAm, en: data.familyNameEn },
        category: data.category,
        scriptSupport: data.scriptSupport,
        license: data.license,
        licenseUrl: data.licenseUrl || undefined,
        description:
          data.descriptionAm || data.descriptionEn
            ? { am: data.descriptionAm ?? null, en: data.descriptionEn ?? null }
            : undefined,
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
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="familyNameAm">Family Name (አማርኛ)</label>
            <input id="familyNameAm" className={`form-input${errors.familyNameAm ? ' form-input--error' : ''}`} {...register('familyNameAm')} />
            {errors.familyNameAm && <p className="form-error">{errors.familyNameAm.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="familyNameEn">Family Name (English)</label>
            <input id="familyNameEn" className={`form-input${errors.familyNameEn ? ' form-input--error' : ''}`} {...register('familyNameEn')} />
            {errors.familyNameEn && <p className="form-error">{errors.familyNameEn.message}</p>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <select id="category" className="form-input" {...register('category')}>
              <option value="serif">Serif</option>
              <option value="sans_serif">Sans-Serif</option>
              <option value="display">Display</option>
              <option value="handwriting">Handwriting</option>
              <option value="monospace">Monospace</option>
              <option value="decorative">Decorative</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="scriptSupport">Script Support</label>
            <select id="scriptSupport" className="form-input" {...register('scriptSupport')}>
              <option value="ethiopic">Ethiopic Only</option>
              <option value="latin">Latin Only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="license">License</label>
            <input id="license" className={`form-input${errors.license ? ' form-input--error' : ''}`} {...register('license')} placeholder="e.g. OFL-1.1" />
            {errors.license && <p className="form-error">{errors.license.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="licenseUrl">License URL (optional)</label>
            <input id="licenseUrl" type="url" className="form-input" {...register('licenseUrl')} placeholder="https://…" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="descriptionAm">Description (አማርኛ)</label>
          <textarea id="descriptionAm" className="form-input form-textarea" rows={3} {...register('descriptionAm')} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="descriptionEn">Description (English)</label>
          <textarea id="descriptionEn" className="form-input form-textarea" rows={3} {...register('descriptionEn')} />
        </div>

        {errors.root && <p className="form-error form-error--global">{errors.root.message}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : 'Create Draft'}
          </button>
        </div>
      </form>
    </>
  );
}
