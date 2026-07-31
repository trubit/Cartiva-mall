import mongoose, { type Document, type Types } from 'mongoose'

export interface IWarehouseDocument extends Document {
  name: string
  code: string
  address: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  managerId?: Types.ObjectId
  capacity: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const warehouseSchema = new mongoose.Schema<IWarehouseDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, unique: true, uppercase: true, maxlength: 20 },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

export const Warehouse = mongoose.model<IWarehouseDocument>('Warehouse', warehouseSchema)
