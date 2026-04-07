/**
 * ProfilePage — /contributor/profile
 *
 * Lets contributors view and update their profile details.
 * Fetches current data from GET /auth/me and persists changes
 * via PATCH /auth/me/profile.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import type { UpdateProfileRequest } from '@/lib/types';

// ── Validation schema ──────────────────────────────────────────────────────────
// All fields are plain strings in the form. Empty string means "clear this field".
// We coerce empty strings → null when building the API payload in onSubmit.

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(120, 'Display name must be 120 characters or fewer'),
  legalFullName: z
    .string()
    .max(160, 'Legal full name must be 160 characters or fewer'),
  countryCode: z
    .string()
    .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), {
      message: 'Country code must be two uppercase letters (e.g. ET)',
    }),
  organizationName: z
    .string()
    .max(160, 'Organization name must be 160 characters or fewer'),
  phoneNumber: z
    .string()
    .refine((v) => v === '' || (v.length >= 7 && v.length <= 40), {
      message: 'Phone number must be between 7 and 40 characters',
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ── Change-password schema ────────────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Must be at least 8 characters').max(200),
  confirmNewPassword: z.string(),
});
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

// ── ChangePasswordSection ─────────────────────────────────────────────────────

function ChangePasswordSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      // Server revokes all refresh sessions — clear local session and redirect to login
      useAuthStore.getState().clearSession();
      navigate('/login', { replace: true });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError('root', { message: msg });
    },
  });

  const onSubmit = (values: ChangePasswordValues) => {
    if (values.newPassword !== values.confirmNewPassword) {
      setError('confirmNewPassword', { message: t('auth.passwordsDoNotMatch') });
      return;
    }
    mutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  };

  return (
    <section className="profile-section" aria-labelledby="chpw-heading">
      <h2 id="chpw-heading" className="profile-section__title">{t('auth.changePassword')}</h2>

      <form
        className="profile-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label={t('auth.changePassword')}
      >
        <div className="form-field">
          <label htmlFor="chpw-current" className="form-label">
            {t('auth.currentPassword')}
            <span className="form-label__required" aria-hidden="true"> *</span>
          </label>
          <input
            id="chpw-current"
            type="password"
            autoComplete="current-password"
            className={`form-input${errors.currentPassword ? ' form-input--error' : ''}`}
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="form-error" role="alert">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="chpw-new" className="form-label">
            {t('auth.newPassword')}
            <span className="form-label__required" aria-hidden="true"> *</span>
          </label>
          <input
            id="chpw-new"
            type="password"
            autoComplete="new-password"
            className={`form-input${errors.newPassword ? ' form-input--error' : ''}`}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="form-error" role="alert">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="chpw-confirm" className="form-label">
            {t('auth.confirmPassword')}
            <span className="form-label__required" aria-hidden="true"> *</span>
          </label>
          <input
            id="chpw-confirm"
            type="password"
            autoComplete="new-password"
            className={`form-input${errors.confirmNewPassword ? ' form-input--error' : ''}`}
            {...register('confirmNewPassword')}
          />
          {errors.confirmNewPassword && (
            <p className="form-error" role="alert">{errors.confirmNewPassword.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="form-error" role="alert">{errors.root.message}</p>
        )}

        <p className="form-hint">{t('auth.passwordChanged')}</p>

        <div className="profile-form__actions">
          <button
            type="submit"
            className="btn btn--warning"
            disabled={mutation.isPending || !isDirty}
          >
            {mutation.isPending ? t('auth.changingPassword') : t('auth.changePassword')}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Payload helper ────────────────────────────────────────────────────────────

/** Coerce empty strings → null for optional fields before sending to API */
function toApiPayload(values: ProfileFormValues): UpdateProfileRequest {
  return {
    displayName: values.displayName,
    legalFullName: values.legalFullName?.trim() || null,
    countryCode: values.countryCode?.trim() || null,
    organizationName: values.organizationName?.trim() || null,
    phoneNumber: values.phoneNumber?.trim() || null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  // ── Fetch current profile ────────────────────────────────────────────────────
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
  });

  // ── Form ─────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      legalFullName: '',
      countryCode: '',
      organizationName: '',
      phoneNumber: '',
    },
  });

  // Populate form once data arrives
  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? '',
        legalFullName: profile.legalFullName ?? '',
        countryCode: profile.countryCode ?? '',
        organizationName: profile.organizationName ?? '',
        phoneNumber: profile.phoneNumber ?? '',
      });
    }
  }, [profile, reset]);

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (updated) => {
      // Refresh the cached profile
      queryClient.setQueryData(['auth', 'me'], updated);
      // Keep authStore displayName in sync so the nav reflects the change
      if (accessToken) {
        setSession(accessToken, {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
        });
      }
      // Reset dirty state without refetch
      reset({
        displayName: updated.displayName ?? '',
        legalFullName: updated.legalFullName ?? '',
        countryCode: updated.countryCode ?? '',
        organizationName: updated.organizationName ?? '',
        phoneNumber: updated.phoneNumber ?? '',
      });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    mutation.mutate(toApiPayload(values));
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="catalog-status">
        <span className="catalog-spinner" aria-label={t('common.loading')} />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="catalog-status catalog-status--error">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('profile.title')} — Fonthabesha</title>
      </Helmet>

      <div className="profile-page">
        <h1 className="portal-page-title">{t('profile.title')}</h1>

        {/* Read-only email */}
        <div className="profile-field profile-field--readonly">
          <label className="form-label">Email</label>
          <p className="profile-field__value">{profile.email}</p>
          <p className="profile-field__hint">{t('profile.emailNote')}</p>
        </div>

        <form
          className="profile-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label={t('profile.title')}
        >
          {/* Display name */}
          <div className="form-field">
            <label htmlFor="pf-displayName" className="form-label">
              {t('profile.displayName')}
              <span className="form-label__required" aria-hidden="true"> *</span>
            </label>
            <input
              id="pf-displayName"
              type="text"
              className={`form-input${errors.displayName ? ' form-input--error' : ''}`}
              autoComplete="name"
              maxLength={120}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="form-error" role="alert">{errors.displayName.message}</p>
            )}
          </div>

          {/* Legal full name */}
          <div className="form-field">
            <label htmlFor="pf-legalFullName" className="form-label">
              {t('profile.legalFullName')}
            </label>
            <input
              id="pf-legalFullName"
              type="text"
              className={`form-input${errors.legalFullName ? ' form-input--error' : ''}`}
              autoComplete="name"
              maxLength={160}
              {...register('legalFullName')}
            />
            {errors.legalFullName && (
              <p className="form-error" role="alert">{errors.legalFullName.message}</p>
            )}
          </div>

          {/* Organization */}
          <div className="form-field">
            <label htmlFor="pf-organizationName" className="form-label">
              {t('profile.organizationName')}
            </label>
            <input
              id="pf-organizationName"
              type="text"
              className={`form-input${errors.organizationName ? ' form-input--error' : ''}`}
              autoComplete="organization"
              maxLength={160}
              {...register('organizationName')}
            />
            {errors.organizationName && (
              <p className="form-error" role="alert">{errors.organizationName.message}</p>
            )}
          </div>

          {/* Country code */}
          <div className="form-field">
            <label htmlFor="pf-countryCode" className="form-label">
              {t('profile.countryCode')}
            </label>
            <input
              id="pf-countryCode"
              type="text"
              className={`form-input form-input--short${errors.countryCode ? ' form-input--error' : ''}`}
              autoComplete="country"
              maxLength={2}
              placeholder="ET"
              {...register('countryCode')}
            />
            <p className="form-hint">{t('profile.countryCodeHint')}</p>
            {errors.countryCode && (
              <p className="form-error" role="alert">{errors.countryCode.message}</p>
            )}
          </div>

          {/* Phone number */}
          <div className="form-field">
            <label htmlFor="pf-phoneNumber" className="form-label">
              {t('profile.phoneNumber')}
            </label>
            <input
              id="pf-phoneNumber"
              type="tel"
              className={`form-input${errors.phoneNumber ? ' form-input--error' : ''}`}
              autoComplete="tel"
              maxLength={40}
              {...register('phoneNumber')}
            />
            {errors.phoneNumber && (
              <p className="form-error" role="alert">{errors.phoneNumber.message}</p>
            )}
          </div>

          {/* Success banner */}
          {mutation.isSuccess && (
            <p className="profile-saved-banner" role="status">
              {t('profile.saved')}
            </p>
          )}

          {/* Server error */}
          {mutation.isError && (
            <p className="form-error" role="alert">{t('common.error')}</p>
          )}

          <div className="profile-form__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={mutation.isPending || !isDirty}
            >
              {mutation.isPending ? t('profile.saving') : t('profile.saveProfile')}
            </button>
          </div>
        </form>

        {/* ── Change password ── */}
        <div className="profile-divider" role="separator" aria-hidden="true" />
        <ChangePasswordSection />
      </div>
    </>
  );
}
