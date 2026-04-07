import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// ── Validation schema ──────────────────────────────────────────────────────────

const profileSchema = z.object({
  displayName:      z.string().min(2, 'Display name must be at least 2 characters').max(80),
  legalFullName:    z.string().max(120).optional().or(z.literal('')),
  organizationName: z.string().max(120).optional().or(z.literal('')),
  countryCode:      z.string().length(2, 'Must be a 2-letter country code').toUpperCase()
                              .optional().or(z.literal('')),
  phoneNumber:      z.string().max(30).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Populate form once user data arrives
  useEffect(() => {
    if (user) {
      reset({
        displayName:      (user as any).displayName ?? '',
        legalFullName:    (user as any).legalFullName ?? '',
        organizationName: (user as any).organizationName ?? '',
        countryCode:      (user as any).countryCode ?? '',
        phoneNumber:      (user as any).phoneNumber ?? '',
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      authApi.updateProfile({
        displayName:      data.displayName,
        legalFullName:    data.legalFullName || undefined,
        organizationName: data.organizationName || undefined,
        countryCode:      data.countryCode || undefined,
        phoneNumber:      data.phoneNumber || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      // Keep the auth store display name in sync
      if (accessToken) {
        setSession(accessToken, updated as any);
      }
    },
  });

  const onSubmit = (data: ProfileFormData) => mutation.mutate(data);

  if (isLoading) return <LoadingSpinner fullPage label={t('common.loading')} />;

  return (
    <>
      <Helmet>
        <title>{t('profile.title')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container page-container--narrow">
        <header className="page-header">
          <h1 className="page-title">{t('profile.title')}</h1>
          <p className="page-subtitle">{t('profile.subtitle')}</p>
        </header>

        <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Display name */}
          <div className="form-field">
            <label className="form-label" htmlFor="displayName">
              {t('profile.displayName')} <span aria-hidden="true">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              className={`form-input${errors.displayName ? ' form-input--error' : ''}`}
              autoComplete="name"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="form-error">{errors.displayName.message}</p>
            )}
          </div>

          {/* Legal full name */}
          <div className="form-field">
            <label className="form-label" htmlFor="legalFullName">
              {t('profile.legalFullName')}
            </label>
            <input
              id="legalFullName"
              type="text"
              className="form-input"
              autoComplete="name"
              {...register('legalFullName')}
            />
            <p className="form-hint">{t('profile.legalFullNameHint')}</p>
          </div>

          {/* Organization */}
          <div className="form-field">
            <label className="form-label" htmlFor="organizationName">
              {t('profile.organization')}
            </label>
            <input
              id="organizationName"
              type="text"
              className="form-input"
              autoComplete="organization"
              {...register('organizationName')}
            />
          </div>

          {/* Country */}
          <div className="form-field">
            <label className="form-label" htmlFor="countryCode">
              {t('profile.countryCode')}
            </label>
            <input
              id="countryCode"
              type="text"
              maxLength={2}
              placeholder="ET"
              className={`form-input form-input--short${errors.countryCode ? ' form-input--error' : ''}`}
              autoComplete="country"
              {...register('countryCode')}
            />
            {errors.countryCode && (
              <p className="form-error">{errors.countryCode.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="form-field">
            <label className="form-label" htmlFor="phoneNumber">
              {t('profile.phone')}
            </label>
            <input
              id="phoneNumber"
              type="tel"
              className="form-input"
              autoComplete="tel"
              {...register('phoneNumber')}
            />
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!isDirty || mutation.isPending}
            >
              {mutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>

          {mutation.isSuccess && (
            <p className="form-success">{t('profile.saved')}</p>
          )}
          {mutation.isError && (
            <p className="form-error">{t('common.error')}</p>
          )}
        </form>
      </div>
    </>
  );
}
