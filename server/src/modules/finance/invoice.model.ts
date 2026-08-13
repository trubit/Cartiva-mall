import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { InvoiceStatus, InvoiceType } from '../../../../src/shared/types/finance.types.js'

export interface IInvoiceItemDocument {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  discount: number
  subtotal: number
  total: number
}

export interface IInvoiceDocument extends Document {
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  issuedTo?: string
  vendorId?: Types.ObjectId
  orderId?: Types.ObjectId
  items: IInvoiceItemDocument[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  currency: string
  notes?: string
  dueDate?: Date
  paidAt?: Date
  voidedAt?: Date
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const invoiceItemSchema = new Schema<IInvoiceItemDocument>(
  {
    description: { type: String, required: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['sale', 'vendor_settlement', 'commission', 'refund', 'credit_note', 'debit_note'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'void', 'refunded'],
      default: 'draft',
    },
    issuedTo: { type: String, maxlength: 200 },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN', maxlength: 3 },
    notes: { type: String, maxlength: 2000 },
    dueDate: { type: Date },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

invoiceSchema.index({ vendorId: 1 })
invoiceSchema.index({ orderId: 1 })
invoiceSchema.index({ status: 1 })
invoiceSchema.index({ type: 1 })
invoiceSchema.index({ createdAt: -1 })

export const Invoice = mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema)
