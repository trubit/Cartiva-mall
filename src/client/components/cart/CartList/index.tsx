import CartItem from '../CartItem/index.js'
import type { ICartDisplayItem } from '../../../../shared/types/cart.types.js'

interface CartListProps {
  items: ICartDisplayItem[]
  onRemove: (productId: string) => void
  onUpdateQty: (productId: string, qty: number) => void
  isMutating?: boolean
}

export default function CartList({ items, onRemove, onUpdateQty, isMutating }: CartListProps) {
  return (
    <div className="cart-list">
      <div className="cart-list__header">
        <span>Product</span>
        <span className="cart-list__header-price">Price</span>
        <span className="cart-list__header-qty">Quantity</span>
        <span className="cart-list__header-total">Total</span>
        <span />
      </div>

      <div className="cart-list__items">
        {items.map((item) => (
          <CartItem
            key={`${item.productId}-${item.selectedVariant ?? ''}-${item.selectedSize ?? ''}-${item.selectedColor ?? ''}`}
            item={item}
            onRemove={onRemove}
            onUpdateQty={onUpdateQty}
            isMutating={isMutating}
          />
        ))}
      </div>
    </div>
  )
}
