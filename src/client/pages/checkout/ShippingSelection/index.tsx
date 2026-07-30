import ShippingCard from '../../../components/checkout/ShippingCard/index.js'
import { useSelectShipping } from '../../../hooks/useCheckout.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import type { ShippingMethod } from '../../../../shared/types/checkout.types.js'

export default function ShippingSelection() {
  const mutation = useSelectShipping()
  const { shippingOptions, selectedMethod, setSelectedMethod, prevStep } = useCheckoutStore()

  const handleContinue = () => {
    mutation.mutate({ method: selectedMethod })
  }

  return (
    <div className="checkout-step">
      <h2 className="checkout-step__title">Shipping Method</h2>
      <p className="checkout-step__subtitle">Choose how fast you want your order delivered.</p>

      <div className="shipping-options">
        {shippingOptions.map((option) => (
          <ShippingCard
            key={option.method}
            option={option}
            selected={selectedMethod === option.method}
            onSelect={() => setSelectedMethod(option.method as ShippingMethod)}
            disabled={mutation.isPending}
          />
        ))}
      </div>

      {mutation.isError && (
        <p className="checkout-step__error">Failed to set shipping method. Please try again.</p>
      )}

      <div className="checkout-step__nav">
        <button className="btn btn-outline" onClick={prevStep} disabled={mutation.isPending}>
          ← Back
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleContinue}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : 'Continue to Review'}
        </button>
      </div>
    </div>
  )
}
