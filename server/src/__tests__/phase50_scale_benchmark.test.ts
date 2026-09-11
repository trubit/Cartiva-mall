import { describe, it, expect } from 'vitest'
import mongoose, { type Types } from 'mongoose'
import { Product, type IProductDocument } from '../modules/product/product.model.js'

describe('Phase 50: Parts 22–27 Performance, Concurrency & Load Benchmark Suite', () => {
  it('executes high-throughput read/write benchmark with p50, p95, p99 latency measurement', async () => {
    const sellerId = new mongoose.Types.ObjectId()

    // Seed 10 products
    const products: IProductDocument[] = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        Product.create({
          title: `Benchmark Product ${i + 1}`,
          description: `High performance test item ${i + 1}`,
          price: 19.99 + i,
          stockQuantity: 500,
          sku: `BENCH-SKU-${i + 1}`,
          sellerId,
          category: 'Electronics',
          images: [`https://example.com/item-${i + 1}.jpg`],
        }),
      ),
    )

    const totalRequests = 100
    const concurrency = 10
    const latencies: number[] = []
    let errorCount = 0

    const executeBatch = async (batch: number[]) => {
      await Promise.all(
        batch.map(async (reqIndex) => {
          const start = performance.now()
          try {
            const product = products[reqIndex % products.length]
            const productId = product._id as Types.ObjectId
            // Alternate between read and atomic stock decrement
            if (reqIndex % 2 === 0) {
              await Product.findById(productId).lean()
            } else {
              await Product.findOneAndUpdate(
                { _id: productId, stockQuantity: { $gte: 1 } },
                { $inc: { stockQuantity: -1 } },
                { returnDocument: 'after' },
              )
            }
            const duration = performance.now() - start
            latencies.push(duration)
          } catch {
            errorCount++
          }
        }),
      )
    }

    const indices = Array.from({ length: totalRequests }, (_, i) => i)
    for (let i = 0; i < indices.length; i += concurrency) {
      const chunk = indices.slice(i, i + concurrency)
      await executeBatch(chunk)
    }

    latencies.sort((a, b) => a - b)
    const p50 = latencies[Math.floor(latencies.length * 0.5)]
    const p95 = latencies[Math.floor(latencies.length * 0.95)]
    const p99 = latencies[Math.floor(latencies.length * 0.99)]

    expect(errorCount).toBe(0)
    expect(latencies.length).toBe(totalRequests)
    expect(p50).toBeDefined()
    expect(p95).toBeDefined()
    expect(p99).toBeDefined()
    expect(p50).toBeLessThan(100) // Sub-100ms in-memory latency target
  })
})
