import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutAddressSchema } from '../../../../shared/validators/checkout.validators.js'
import type { CheckoutAddressInput } from '../../../../shared/validators/checkout.validators.js'
import type { ICheckoutAddress } from '../../../../shared/types/checkout.types.js'

interface CheckoutFormProps {
  defaultValues?: Partial<ICheckoutAddress>
  onSubmit: (data: CheckoutAddressInput) => void
  isSubmitting?: boolean
  submitLabel?: string
}

const Field = ({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) => (
  <div className="checkout-form__field">
    <label className="checkout-form__label">{label}</label>
    {children}
    {error && <span className="checkout-form__error">{error}</span>}
  </div>
)

export default function CheckoutForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Continue',
}: CheckoutFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutAddressInput>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: defaultValues ?? {},
  })

  // Re-populate when defaultValues change (pre-fill from profile)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      reset(defaultValues)
    }
  }, [defaultValues, reset])

  return (
    <form className="checkout-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="checkout-form__grid">
        <Field label="Full Name" error={errors.fullName?.message}>
          <input
            className={`checkout-form__input ${errors.fullName ? 'checkout-form__input--error' : ''}`}
            placeholder="John Doe"
            {...register('fullName')}
          />
        </Field>

        <Field label="Phone Number" error={errors.phone?.message}>
          <input
            type="tel"
            className={`checkout-form__input ${errors.phone ? 'checkout-form__input--error' : ''}`}
            placeholder="+1 234 567 8900"
            {...register('phone')}
          />
        </Field>

        <Field label="Country" error={errors.country?.message}>
          <input
            className={`checkout-form__input ${errors.country ? 'checkout-form__input--error' : ''}`}
            placeholder="United States"
            {...register('country')}
          />
        </Field>

        <Field label="State / Province" error={errors.state?.message}>
          <input
            className={`checkout-form__input ${errors.state ? 'checkout-form__input--error' : ''}`}
            placeholder="California"
            {...register('state')}
          />
        </Field>

        <Field label="City" error={errors.city?.message}>
          <input
            className={`checkout-form__input ${errors.city ? 'checkout-form__input--error' : ''}`}
            placeholder="Los Angeles"
            {...register('city')}
          />
        </Field>

        <Field label="Postal Code" error={errors.postalCode?.message}>
          <input
            className={`checkout-form__input ${errors.postalCode ? 'checkout-form__input--error' : ''}`}
            placeholder="90001"
            {...register('postalCode')}
          />
        </Field>

        <div className="checkout-form__field checkout-form__field--full">
          <label className="checkout-form__label">Street Address</label>
          <input
            className={`checkout-form__input ${errors.street ? 'checkout-form__input--error' : ''}`}
            placeholder="123 Main St, Apt 4B"
            {...register('street')}
          />
          {errors.street && <span className="checkout-form__error">{errors.street.message}</span>}
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg checkout-form__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
