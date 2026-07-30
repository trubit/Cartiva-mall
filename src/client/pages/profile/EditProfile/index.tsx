import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiEdit3, FiSave } from 'react-icons/fi'
import { CgSpinner } from 'react-icons/cg'
import { useState } from 'react'
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '../../../../shared/validators/profile.validators.js'
import { useProfile, useUpdateProfile } from '../../../hooks/useProfile.js'
import AvatarUploader from '../../../components/profile/AvatarUploader/index.js'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ig', label: 'Igbo' },
]

export default function EditProfile() {
  const { data: user, isLoading } = useProfile()
  const mutation = useUpdateProfile()
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber ?? '',
          bio: user.bio ?? '',
          gender: user.gender,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
          language: user.language ?? 'en',
        }
      : {},
  })

  const onSubmit = async (data: UpdateProfileInput) => {
    setSuccess('')
    try {
      await mutation.mutateAsync(data)
      setSuccess('Profile updated successfully.')
    } catch {
      /* surface below */
    }
  }

  if (isLoading || !user)
    return <div className="profile-skeleton" style={{ height: 400, borderRadius: 12 }} />

  return (
    <>
      {/* Avatar */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-section-title">
            <FiEdit3 /> Profile Photo
          </h2>
        </div>
        <AvatarUploader user={user} />
      </div>

      {/* Edit form */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-section-title">
            <FiEdit3 /> Edit Information
          </h2>
        </div>

        {success && <p className="profile-alert profile-alert--success">{success}</p>}
        {mutation.error && (
          <p className="profile-alert profile-alert--error">
            {mutation.error instanceof Error ? mutation.error.message : 'Update failed'}
          </p>
        )}

        <form className="profile-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="profile-form-row">
            <div className="mb-3">
              <label className="form-label">First Name</label>
              <input className="form-control" placeholder="Alice" {...register('firstName')} />
              {errors.firstName && (
                <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                  {errors.firstName.message}
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Last Name</label>
              <input className="form-control" placeholder="Smith" {...register('lastName')} />
              {errors.lastName && (
                <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                  {errors.lastName.message}
                </div>
              )}
            </div>
          </div>

          <div className="profile-form-row">
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input className="form-control" placeholder="alicesmith" {...register('username')} />
              {errors.username && (
                <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                  {errors.username.message}
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <input
                className="form-control"
                placeholder="+234 800 000 0000"
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                  {errors.phoneNumber.message}
                </div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Bio</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Tell us a little about yourself…"
              {...register('bio')}
            />
            {errors.bio && (
              <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                {errors.bio.message}
              </div>
            )}
          </div>

          <div className="profile-form-row">
            <div className="mb-3">
              <label className="form-label">Gender</label>
              <select className="form-select" {...register('gender')}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" {...register('dateOfBirth')} />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Language</label>
            <select className="form-select" {...register('language')}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-form-actions">
            <button
              type="submit"
              className="btn-profile-primary"
              disabled={mutation.isPending || !isDirty}
            >
              {mutation.isPending ? (
                <>
                  <CgSpinner className="spin" /> Saving…
                </>
              ) : (
                <>
                  <FiSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
