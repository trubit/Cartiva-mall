import mongoose, { type Document, type Types } from 'mongoose'
import { ORDER_STATUS, PAYMENT_STATUS } from '../../../../src/shared/constants/index.js'

// ─── Sub-document interfaces ──────────────────────────────────────────────────
export interface IOrderAddressDoc {
  fullName: string
  phone: string
  country: string
  state: string
  city: string
  street: string
  postalCode: string
  addressLine2?: string
  deliveryInstructions?: string
}

export interface IOrderItemDoc {
  productId: Types.ObjectId
  variantId?: Types.ObjectId
  sellerId?: Types.ObjectId
  title: string
  image?: string
  sku: string
  quantity: number
  itemPrice: number
  lineTotal: number
  selectedSize?: string
  selectedColor?: string
  selectedAttributes?: Record<string, string>
  fulfillmentStatus?: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
}

export interface ITrackingEventDoc {
  status: string
  location?: string
  description: string
  timestamp: Date
}

export interface IOrderTrackingDoc {
  trackingNumber?: string
  carrier?: string
  trackingUrl?: string
  estimatedDeliveryDate?: Date
  events: ITrackingEventDoc[]
}

export interface IReturnRequestDoc {
  reason: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestedAt: Date
  resolvedAt?: Date
  refundAmount?: number
}

export interface IOrderHistoryEntry {
  status: string
  actor: string
  timestamp: Date
  reason?: string
  correlationId?: string
  metadata?: Record<string, unknown>
}

export interface IPhysicalPaymentProofDoc {
  reference: string
  amount: number
  bankName?: string
  senderName?: string
  proofUrl?: string
  submittedAt: Date
  notes?: string
}

export interface IShippingCalculationAuditDoc {
  originAddress?: string
  originCoordinates?: { latitude: number; longitude: number }
  destinationAddress?: string
  destinationCoordinates?: { latitude: number; longitude: number }
  distanceKm: number
  shippingRate: number
  shippingAmount: number
  currency: string
  routeSource: string
  calculatedAt: Date
}

export interface ISellerBankDetailsDoc {
  bankName: string
  accountName: string
  accountNumber: string
  bankCode?: string
}

// ─── Main document interface ──────────────────────────────────────────────────
export interface IOrderDocument extends Document {
  orderNumber: string
  userId: Types.ObjectId
  checkoutSessionId?: Types.ObjectId
  idempotencyKey?: string
  items: IOrderItemDoc[]
  shippingAddress: IOrderAddressDoc
  billingAddress?: IOrderAddressDoc
  sameAsShipping: boolean
  shippingMethod: 'standard' | 'express' | 'sameDay'
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  grandTotal: number
  couponCode?: string
  currency: string
  exchangeRateUsed?: number
  exchangeRateSource?: string
  exchangeRateTimestamp?: Date
  originalCurrency?: string
  originalAmount?: number
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
  orderStatus:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'outForDelivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'refunded'
  fulfillmentStatus: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
  paymentIntentId?: string
  paystackReference?: string
  paymentProvider?: 'paystack' | 'stripe'
  paymentMethodType?: 'paystack' | 'physical_bank_transfer'
  paymentProof?: IPhysicalPaymentProofDoc
  paymentReviewStatus?: 'unsubmitted' | 'under_review' | 'verified' | 'rejected'
  paymentVerifiedAt?: Date
  paymentVerifiedBy?: Types.ObjectId
  sellerBankDetails?: ISellerBankDetailsDoc
  shippingDetails?: IShippingCalculationAuditDoc[]
  notes?: string
  tracking?: IOrderTrackingDoc
  returnRequest?: IReturnRequestDoc
  history: IOrderHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema<IOrderAddressDoc>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    deliveryInstructions: { type: String, trim: true },
  },
  { _id: false },
)

const orderItemSchema = new mongoose.Schema<IOrderItemDoc>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true },
    image: { type: String },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    itemPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    selectedSize: { type: String, trim: true },
    selectedColor: { type: String, trim: true },
    selectedAttributes: { type: Map, of: String },
    fulfillmentStatus: {
      type: String,
      enum: ['unfulfilled', 'partially_fulfilled', 'fulfilled', 'cancelled'],
      default: 'unfulfilled',
    },
  },
  { _id: false },
)

const trackingEventSchema = new mongoose.Schema<ITrackingEventDoc>(
  {
    status: { type: String, required: true },
    location: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
)

const trackingSchema = new mongoose.Schema<IOrderTrackingDoc>(
  {
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    estimatedDeliveryDate: { type: Date },
    events: { type: [trackingEventSchema], default: [] },
  },
  { _id: false },
)

const returnRequestSchema = new mongoose.Schema<IReturnRequestDoc>(
  {
    reason: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 1000, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    refundAmount: { type: Number, min: 0 },
  },
  { _id: false },
)

const historyEntrySchema = new mongoose.Schema<IOrderHistoryEntry>(
  {
    status: { type: String, required: true },
    actor: { type: String, required: true, default: 'system' },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String },
    correlationId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
)

const physicalPaymentProofSchema = new mongoose.Schema<IPhysicalPaymentProofDoc>(
  {
    reference: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    bankName: { type: String, trim: true },
    senderName: { type: String, trim: true },
    proofUrl: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 1000, trim: true },
  },
  { _id: false },
)

const shippingCalculationAuditSchema = new mongoose.Schema<IShippingCalculationAuditDoc>(
  {
    originAddress: { type: String, trim: true },
    originCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    destinationAddress: { type: String, trim: true },
    destinationCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    distanceKm: { type: Number, required: true, min: 0 },
    shippingRate: { type: Number, required: true, min: 0 },
    shippingAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    routeSource: { type: String, default: 'Google Maps Routes API' },
    calculatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkoutSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkout' },
    idempotencyKey: { type: String, sparse: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema },
    sameAsShipping: { type: Boolean, default: true },
    shippingMethod: { type: String, enum: ['standard', 'express', 'sameDay'], default: 'standard' },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    currency: { type: String, required: true, default: 'USD', uppercase: true },
    exchangeRateUsed: { type: Number, min: 0 },
    exchangeRateSource: { type: String, trim: true },
    exchangeRateTimestamp: { type: Date },
    originalCurrency: { type: String, trim: true, uppercase: true },
    originalAmount: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['unfulfilled', 'partially_fulfilled', 'fulfilled', 'cancelled'],
      default: 'unfulfilled',
      index: true,
    },
    paymentIntentId: { type: String },
    paystackReference: { type: String },
    paymentProvider: { type: String, enum: ['paystack', 'stripe'] },
    paymentMethodType: {
      type: String,
      enum: ['paystack', 'physical_bank_transfer'],
      default: 'paystack',
    },
    paymentProof: { type: physicalPaymentProofSchema },
    paymentReviewStatus: {
      type: String,
      enum: ['unsubmitted', 'under_review', 'verified', 'rejected'],
      default: 'unsubmitted',
      index: true,
    },
    paymentVerifiedAt: { type: Date },
    paymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sellerBankDetails: { type: Object, default: null },
    shippingDetails: { type: [shippingCalculationAuditSchema], default: [] },
    notes: { type: String, maxlength: 500 },
    tracking: { type: trackingSchema },
    returnRequest: { type: returnRequestSchema },
    history: { type: [historyEntrySchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  },
)

orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })
orderSchema.index({ orderStatus: 1, createdAt: -1 })
orderSchema.index({ paymentStatus: 1, createdAt: -1 })
orderSchema.index({ fulfillmentStatus: 1, createdAt: -1 })
orderSchema.index({ 'items.productId': 1, orderStatus: 1, createdAt: -1 })
orderSchema.index({ 'items.sellerId': 1, createdAt: -1 })
orderSchema.index({ paymentIntentId: 1 }, { sparse: true, unique: true })
orderSchema.index({ paystackReference: 1 }, { sparse: true, unique: true })

export const Order = mongoose.model<IOrderDocument>('Order', orderSchema)
