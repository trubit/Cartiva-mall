import { useEffect } from 'react'
import { FiCheckCircle, FiShield, FiTruck, FiMapPin } from 'react-icons/fi'
import ShippingCard from '../../../components/checkout/ShippingCard/index.js'
import { useSelectShipping } from '../../../hooks/useCheckout.js'
import { useCheckoutStore } from '../../../store/checkoutStore.js'
import type { IShippingOption } from '../../../../shared/types/checkout.types.js'

export default function ShippingSelection() {
  const mutation = useSelectShipping()
  const { shippingOptions, selectedMethod, setSelectedMethod, prevStep, shippingAddress } =
    useCheckoutStore()

  // Ensure standard method is selected by default
  useEffect(() => {
    if (selectedMethod !== 'standard') {
      setSelectedMethod('standard')
    }
  }, [selectedMethod, setSelectedMethod])

  const handleContinue = () => {
    mutation.mutate({ method: 'standard' })
  }

  // Authoritative active option
  const activeOption: IShippingOption = shippingOptions.find((o) => o.method === 'standard') || {
    method: 'standard',
    label: 'Verified Doorstep Delivery',
    description: 'Reliable doorstep delivery fulfilled by Cartiva Logistics with live tracking',
    cost: 0,
    estimatedDays: '3–5 business days',
  }

  return (
    <div className="checkout-step">
      <div className="checkout-step__header">
        <h2 className="checkout-step__title">Shipping Method</h2>
        <p className="checkout-step__subtitle">
          Authoritative delivery logistics fulfilled to your doorstep
        </p>
      </div>

      {shippingAddress && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '13px',
            color: 'var(--color-neutral-400, #9ca3af)',
          }}
        >
          <FiMapPin size={15} style={{ color: 'var(--color-primary, #FF9900)', flexShrink: 0 }} />
          <span>
            Delivering to:{' '}
            <strong style={{ color: 'var(--color-neutral-100, #f3f4f6)' }}>
              {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.state},{' '}
              {shippingAddress.country}
            </strong>
          </span>
        </div>
      )}

      <div className="shipping-options">
        <ShippingCard
          option={activeOption}
          selected={true}
          onSelect={() => setSelectedMethod('standard')}
          disabled={mutation.isPending}
        />
      </div>

      {/* Reassurance & Guarantee Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          padding: '14px',
          borderRadius: '12px',
          background: 'rgba(255, 153, 0, 0.04)',
          border: '1px solid rgba(255, 153, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <FiCheckCircle size={15} style={{ color: 'var(--color-primary, #FF9900)' }} />
          <span>Live GPS package tracking</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <FiShield size={15} style={{ color: 'var(--color-primary, #FF9900)' }} />
          <span>Transit loss protection included</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <FiTruck size={15} style={{ color: 'var(--color-primary, #FF9900)' }} />
          <span>Direct doorstep handover</span>
        </div>
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
