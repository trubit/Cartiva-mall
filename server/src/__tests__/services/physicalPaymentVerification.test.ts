import { describe, it, expect, beforeEach } from 'vitest'
import { User } from '../../modules/user/user.model.js'
import { Product } from '../../modules/product/product.model.js'
import { Order } from '../../modules/order/order.model.js'
import * as orderService from '../../modules/order/order.service.js'

beforeEach(async () => {
  await User.deleteMany({})
  await Product.deleteMany({})
  await Order.deleteMany({})
})

describe('Paystack-Only Policy & Physical Payment Deprecation Suite', () => {
  it('rejects attempt to create order with physical_bank_transfer', async () => {
    const user = await User.create({
      firstName: 'Buyer',
      lastName: 'User',
      username: 'buyer1',
      email: 'buyer1@example.com',
      role: 'user',
    })

    await expect(
      orderService.createOrder(user._id.toString(), {
        checkoutSessionId: 'mock_session_id',
        paymentMethodType: 'physical_bank_transfer' as any,
      }),
    ).rejects.toThrow('Cartiva Mall exclusively supports secure online payments via Paystack.')
  })

  it('rejects deprecated physical payment proof submission with 410 Gone error', async () => {
    await expect(
      orderService.submitPhysicalPaymentProof('mock_id', 'mock_user_id', {
        reference: 'REF-123',
        amount: 5000,
      }),
    ).rejects.toThrow('Direct physical bank transfer has been removed.')
  })

  it('rejects deprecated manual payment verification with 410 Gone error', async () => {
    await expect(
      orderService.verifyPhysicalPayment('mock_id', 'mock_admin_id', {
        decision: 'CONFIRM',
      }),
    ).rejects.toThrow('Manual physical payment verification has been removed.')
  })
})
