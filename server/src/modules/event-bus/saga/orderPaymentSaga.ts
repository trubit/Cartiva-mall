import { v4 as uuidv4 } from 'uuid'
import { SagaInstanceModel } from '../eventBus.model.js'
import { eventBus } from '../eventBus.service.js'
import { logger } from '../../../utils/logger.js'

export interface OrderPaymentSagaData {
  orderId: string
  userId: string
  amount: number
  currency: string
  items: Array<{ productId: string; quantity: number }>
  shippingAddress: Record<string, unknown>
}

/**
 * Saga Orchestrator for Order Payment Workflow
 * Steps:
 * 1. CREATE_ORDER
 * 2. AUTHORIZE_PAYMENT
 * 3. RESERVE_INVENTORY
 * 4. CREATE_SHIPMENT
 * 5. CONFIRM_ORDER
 *
 * Compensating actions on failure:
 * - If RESERVE_INVENTORY fails -> RELEASE_PAYMENT_AUTH, CANCEL_ORDER
 * - If CREATE_SHIPMENT fails -> RELEASE_INVENTORY, RELEASE_PAYMENT_AUTH, CANCEL_ORDER
 */
export class OrderPaymentSaga {
  public sagaId: string
  public correlationId: string

  constructor(sagaId?: string, correlationId?: string) {
    this.sagaId = sagaId || `saga_${uuidv4().replace(/-/g, '')}`
    this.correlationId = correlationId || uuidv4()
  }

  async start(data: OrderPaymentSagaData): Promise<void> {
    logger.info(`Starting OrderPaymentSaga [${this.sagaId}] for Order ${data.orderId}`)

    const sagaDoc = await SagaInstanceModel.create({
      sagaId: this.sagaId,
      sagaName: 'OrderPaymentSaga',
      correlationId: this.correlationId,
      currentStep: 'CREATE_ORDER',
      status: 'STARTED',
      completedSteps: [],
      context: data,
    })

    try {
      // Step 1: Create Order
      await this.executeStep(sagaDoc, 'CREATE_ORDER', async () => {
        await eventBus.publish({
          eventType: 'order.created',
          aggregateId: data.orderId,
          aggregateType: 'Order',
          correlationId: this.correlationId,
          payload: { orderId: data.orderId, userId: data.userId, amount: data.amount },
        })
      })

      // Step 2: Authorize Payment
      await this.executeStep(sagaDoc, 'AUTHORIZE_PAYMENT', async () => {
        await eventBus.publish({
          eventType: 'payment.authorized',
          aggregateId: data.orderId,
          aggregateType: 'Payment',
          correlationId: this.correlationId,
          payload: { orderId: data.orderId, amount: data.amount, currency: data.currency },
        })
      })

      // Step 3: Reserve Inventory
      await this.executeStep(sagaDoc, 'RESERVE_INVENTORY', async () => {
        // Simulate inventory check / reservation
        await eventBus.publish({
          eventType: 'inventory.reserved',
          aggregateId: data.orderId,
          aggregateType: 'Inventory',
          correlationId: this.correlationId,
          payload: { items: data.items },
        })
      })

      // Step 4: Create Shipment
      await this.executeStep(sagaDoc, 'CREATE_SHIPMENT', async () => {
        await eventBus.publish({
          eventType: 'shipment.created',
          aggregateId: data.orderId,
          aggregateType: 'Shipment',
          correlationId: this.correlationId,
          payload: { orderId: data.orderId, shippingAddress: data.shippingAddress },
        })
      })

      // Step 5: Confirm Order
      await this.executeStep(sagaDoc, 'CONFIRM_ORDER', async () => {
        sagaDoc.status = 'COMPLETED'
        sagaDoc.completedAt = new Date()
        await sagaDoc.save()
        await eventBus.publish({
          eventType: 'order.confirmed',
          aggregateId: data.orderId,
          aggregateType: 'Order',
          correlationId: this.correlationId,
          payload: { orderId: data.orderId },
        })
      })

      logger.info(`OrderPaymentSaga [${this.sagaId}] completed successfully!`)
    } catch (err: any) {
      logger.error(
        `OrderPaymentSaga [${this.sagaId}] failed at step [${sagaDoc.currentStep}]: ${err.message}`,
      )
      await this.compensate(sagaDoc, err.message)
    }
  }

  private async executeStep(sagaDoc: any, stepName: string, action: () => Promise<void>) {
    sagaDoc.currentStep = stepName
    sagaDoc.status = 'IN_PROGRESS'
    await sagaDoc.save()

    await action()

    sagaDoc.completedSteps.push(stepName)
    await sagaDoc.save()
  }

  private async compensate(sagaDoc: any, reason: string) {
    sagaDoc.status = 'FAILED'
    sagaDoc.failedStep = sagaDoc.currentStep
    sagaDoc.failureReason = reason
    await sagaDoc.save()

    const completed = [...sagaDoc.completedSteps].reverse()
    for (const step of completed) {
      logger.info(`Executing compensating action for step [${step}] in Saga [${this.sagaId}]`)
      if (step === 'RESERVE_INVENTORY') {
        await eventBus.publish({
          eventType: 'inventory.released',
          aggregateId: sagaDoc.context.orderId,
          aggregateType: 'Inventory',
          correlationId: this.correlationId,
          payload: { items: sagaDoc.context.items, reason: 'Saga compensation' },
        })
        sagaDoc.compensationsExecuted.push('RELEASE_INVENTORY')
      } else if (step === 'AUTHORIZE_PAYMENT') {
        await eventBus.publish({
          eventType: 'payment.refunded',
          aggregateId: sagaDoc.context.orderId,
          aggregateType: 'Payment',
          correlationId: this.correlationId,
          payload: { orderId: sagaDoc.context.orderId, reason: 'Saga compensation' },
        })
        sagaDoc.compensationsExecuted.push('RELEASE_PAYMENT_AUTH')
      } else if (step === 'CREATE_ORDER') {
        await eventBus.publish({
          eventType: 'order.cancelled',
          aggregateId: sagaDoc.context.orderId,
          aggregateType: 'Order',
          correlationId: this.correlationId,
          payload: { orderId: sagaDoc.context.orderId, reason: 'Saga compensation' },
        })
        sagaDoc.compensationsExecuted.push('CANCEL_ORDER')
      }
    }

    sagaDoc.status = 'COMPENSATED'
    sagaDoc.completedAt = new Date()
    await sagaDoc.save()
    logger.info(`Saga [${this.sagaId}] compensation completed. State set to COMPENSATED.`)
  }
}
