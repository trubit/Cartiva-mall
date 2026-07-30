import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiMapPin, FiSave } from 'react-icons/fi'
import { CgSpinner } from 'react-icons/cg'
import { useState } from 'react'
import {
  updateAddressSchema,
  type UpdateAddressInput,
} from '../../../../shared/validators/profile.validators.js'
import { useUpdateAddress } from '../../../hooks/useProfile.js'
import type { IUser } from '../../../../shared/types/user.types.js'

interface Props {
  user: IUser
}

export default function AddressForm({ user }: Props) {
  const [success, setSuccess] = useState('')
  const mutation = useUpdateAddress()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateAddressInput>({
    resolver: zodResolver(updateAddressSchema),
    defaultValues: {
      country: user.address?.country ?? '',
      state: user.address?.state ?? '',
      city: user.address?.city ?? '',
      street: user.address?.street ?? '',
      postalCode: user.address?.postalCode ?? '',
    },
  })

  const onSubmit = async (data: UpdateAddressInput) => {
    setSuccess('')
    try {
      await mutation.mutateAsync(data)
      setSuccess('Address saved successfully.')
    } catch {
      /* error surface below */
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-section-title">
          <FiMapPin /> Address Book
        </h2>
      </div>

      {success && <p className="profile-alert profile-alert--success">{success}</p>}
      {mutation.error && (
        <p className="profile-alert profile-alert--error">
          {mutation.error instanceof Error ? mutation.error.message : 'Update failed'}
        </p>
      )}

      <form className="profile-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3">
          <label className="form-label">Street Address</label>
          <input className="form-control" placeholder="123 Main St" {...register('street')} />
          {errors.street && (
            <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
              {errors.street.message}
            </div>
          )}
        </div>

        <div className="profile-form-row">
          <div className="mb-3">
            <label className="form-label">City</label>
            <input className="form-control" placeholder="Lagos" {...register('city')} />
            {errors.city && (
              <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                {errors.city.message}
              </div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">State / Province</label>
            <input className="form-control" placeholder="Lagos State" {...register('state')} />
            {errors.state && (
              <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                {errors.state.message}
              </div>
            )}
          </div>
        </div>

        <div className="profile-form-row">
          <div className="mb-3">
            <label className="form-label">Country</label>
            <input className="form-control" placeholder="Nigeria" {...register('country')} />
            {errors.country && (
              <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                {errors.country.message}
              </div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Postal Code</label>
            <input className="form-control" placeholder="100001" {...register('postalCode')} />
            {errors.postalCode && (
              <div className="text-danger mt-1" style={{ fontSize: '.8rem' }}>
                {errors.postalCode.message}
              </div>
            )}
          </div>
        </div>

        <div className="profile-form-actions">
          <button type="submit" className="btn-profile-primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <CgSpinner className="spin" /> Saving…
              </>
            ) : (
              <>
                <FiSave /> Save Address
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
