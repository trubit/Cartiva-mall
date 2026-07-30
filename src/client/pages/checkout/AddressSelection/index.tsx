import { useState } from 'react'
import { FiPlusCircle } from 'react-icons/fi'
import CheckoutForm from '../../../components/checkout/CheckoutForm/index.js'
import AddressCard from '../../../components/checkout/AddressCard/index.js'
import { useUpdateCheckout } from '../../../hooks/useCheckout.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import { useAuthStore } from '../../../store/authStore.js'
import type { CheckoutAddressInput } from '../../../../shared/validators/checkout.validators.js'

export default function AddressSelection() {
  const mutation = useUpdateCheckout()
  const { session, shippingAddress, sameAsShipping, setSameAsShipping } = useCheckoutStore()
  const user = useAuthStore((s) => s.user)
  const [showNewForm, setShowNewForm] = useState(!shippingAddress)

  // Pre-fill from profile address if user has one
  const profilePrefill: Partial<CheckoutAddressInput> = {
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phoneNumber ?? '',
    country: user?.address?.country ?? '',
    state: user?.address?.state ?? '',
    city: user?.address?.city ?? '',
    street: user?.address?.street ?? '',
    postalCode: user?.address?.postalCode ?? '',
  }

  const hasProfileAddress = Boolean(
    user?.address?.street && user?.address?.city && user?.address?.country,
  )

  const handleSubmit = (data: CheckoutAddressInput) => {
    mutation.mutate({
      shippingAddress: data,
      sameAsShipping,
      billingAddress: sameAsShipping ? data : undefined,
    })
  }

  return (
    <div className="checkout-step">
      <h2 className="checkout-step__title">Shipping Address</h2>
      <p className="checkout-step__subtitle">Where should we deliver your order?</p>

      {/* Show saved address from session if exists */}
      {session?.shippingAddress && !showNewForm && (
        <div className="checkout-step__saved-addresses">
          <AddressCard
            address={session.shippingAddress}
            label="Saved"
            selected
            onEdit={() => setShowNewForm(true)}
          />
          <button className="checkout-step__new-addr-btn" onClick={() => setShowNewForm(true)}>
            <FiPlusCircle size={16} /> Use a different address
          </button>
        </div>
      )}

      {/* Show pre-filled profile address as a quick-select if no saved address yet */}
      {!session?.shippingAddress && hasProfileAddress && !showNewForm && (
        <div className="checkout-step__saved-addresses">
          <p className="checkout-step__hint">We found an address from your profile:</p>
          <AddressCard
            address={{ ...(profilePrefill as CheckoutAddressInput) }}
            label="Profile Address"
            onSelect={() =>
              mutation.mutate({
                shippingAddress: profilePrefill as CheckoutAddressInput,
                sameAsShipping,
              })
            }
          />
          <button className="checkout-step__new-addr-btn" onClick={() => setShowNewForm(true)}>
            <FiPlusCircle size={16} /> Enter a new address
          </button>
        </div>
      )}

      {/* Form */}
      {(showNewForm || (!session?.shippingAddress && !hasProfileAddress)) && (
        <CheckoutForm
          defaultValues={session?.shippingAddress ?? profilePrefill}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
          submitLabel="Continue to Shipping"
        />
      )}

      {/* Continue from saved address */}
      {session?.shippingAddress && !showNewForm && (
        <>
          {/* Billing toggle */}
          <div className="checkout-step__billing-toggle">
            <label className="checkout-step__toggle-label">
              <input
                type="checkbox"
                className="checkout-step__checkbox"
                checked={sameAsShipping}
                onChange={(e) => setSameAsShipping(e.target.checked)}
              />
              Billing address same as shipping
            </label>
          </div>

          <button
            className="btn btn-primary btn-lg checkout-step__continue-btn"
            onClick={() =>
              mutation.mutate({
                shippingAddress: session.shippingAddress!,
                sameAsShipping,
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Continue to Shipping'}
          </button>
        </>
      )}

      {mutation.isError && (
        <p className="checkout-step__error">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Failed to save address'}
        </p>
      )}
    </div>
  )
}
