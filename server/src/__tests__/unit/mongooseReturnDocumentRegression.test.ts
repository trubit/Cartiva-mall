import { describe, it, expect, vi } from 'vitest'
import mongoose, { Schema } from 'mongoose'
import fs from 'fs'
import path from 'path'
import { seedDefaultMarketRules } from '../../modules/godmode/godmode.service.js'
import { MarketRuleModel } from '../../modules/godmode/godmode.model.js'

// Simple test schema for update and replace behavior verification
interface ITestDoc {
  key: string
  value: number
  description?: string
}

const TestDocSchema = new Schema<ITestDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: true },
)

const TestDocModel =
  mongoose.models.TestReturnDoc || mongoose.model<ITestDoc>('TestReturnDoc', TestDocSchema)

describe('Mongoose returnDocument & Deprecation Regression Suite', () => {
  it('seedDefaultMarketRules runs cleanly without Mongoose deprecation warnings', async () => {
    const warnings: string[] = []

    const originalEmitWarning = process.emitWarning
    const emitWarningSpy = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation((warning, ...args) => {
        const msg = typeof warning === 'string' ? warning : warning?.message || ''
        warnings.push(msg)
        return originalEmitWarning.call(process, warning, ...(args as [any, any, any]))
      })

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args.map(String).join(' '))
    })

    try {
      // Execute the seeding function that previously triggered 4 deprecation warnings
      await seedDefaultMarketRules()

      // Confirm rules were seeded in the database
      const count = await MarketRuleModel.countDocuments()
      expect(count).toBeGreaterThan(0)

      // Verify that Mongoose never warned about the deprecated 'new' or 'returnOriginal' options
      const mongooseDeprecationWarnings = warnings.filter(
        (w) =>
          w.includes('the `new` option') ||
          w.includes("the 'new' option") ||
          w.includes('returnDocument') ||
          w.includes('returnOriginal'),
      )

      expect(mongooseDeprecationWarnings).toHaveLength(0)
    } finally {
      emitWarningSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    }
  })

  it('findOneAndUpdate correctly returns document BEFORE update when returnDocument is "before"', async () => {
    const key = `test_before_${Date.now()}`
    await TestDocModel.create({ key, value: 10, description: 'initial' })

    const result = await TestDocModel.findOneAndUpdate(
      { key },
      { $set: { value: 20, description: 'updated' } },
      { returnDocument: 'before' },
    )

    // With returnDocument: 'before', returned document should have original value (10)
    expect(result).not.toBeNull()
    expect(result?.value).toBe(10)
    expect(result?.description).toBe('initial')

    // Database itself should have the new value (20)
    const inDb = await TestDocModel.findOne({ key })
    expect(inDb?.value).toBe(20)
    expect(inDb?.description).toBe('updated')
  })

  it('findOneAndUpdate correctly returns document AFTER update when returnDocument is "after"', async () => {
    const key = `test_after_${Date.now()}`
    await TestDocModel.create({ key, value: 100, description: 'initial' })

    const result = await TestDocModel.findOneAndUpdate(
      { key },
      { $set: { value: 200, description: 'updated' } },
      { returnDocument: 'after' },
    )

    // With returnDocument: 'after', returned document should have the updated value (200)
    expect(result).not.toBeNull()
    expect(result?.value).toBe(200)
    expect(result?.description).toBe('updated')

    const inDb = await TestDocModel.findOne({ key })
    expect(inDb?.value).toBe(200)
  })

  it('findOneAndReplace correctly honors returnDocument "before" and "after"', async () => {
    const key = `test_replace_${Date.now()}`
    await TestDocModel.create({ key, value: 50, description: 'v1' })

    // Replace with returnDocument: 'before'
    const beforeResult = await TestDocModel.findOneAndReplace(
      { key },
      { key, value: 60, description: 'v2' },
      { returnDocument: 'before' },
    )

    expect(beforeResult).not.toBeNull()
    expect(beforeResult?.value).toBe(50)
    expect(beforeResult?.description).toBe('v1')

    // Replace with returnDocument: 'after'
    const afterResult = await TestDocModel.findOneAndReplace(
      { key },
      { key, value: 70, description: 'v3' },
      { returnDocument: 'after' },
    )

    expect(afterResult).not.toBeNull()
    expect(afterResult?.value).toBe(70)
    expect(afterResult?.description).toBe('v3')
  })

  it('static audit: zero deprecated options exist in production source code or scripts', () => {
    const targets = [
      path.resolve(process.cwd(), 'server/src'),
      path.resolve(process.cwd(), 'scripts'),
    ]

    const deprecatedOccurrences: { file: string; line: number; snippet: string }[] = []
    const METHODS = [
      'findOneAndUpdate',
      'findOneAndReplace',
      'findByIdAndUpdate',
      'findByIdAndReplace',
    ]

    function scanDir(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          // Scan production code and scripts; exclude tests, build output, and node_modules
          if (!['node_modules', 'dist', '.git', '__tests__'].includes(entry.name)) {
            scanDir(fullPath)
          }
        } else if (/\.(ts|js|mjs)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          for (const method of METHODS) {
            if (content.includes(method)) {
              let idx = 0
              while ((idx = content.indexOf(method, idx)) !== -1) {
                const snippet = content.slice(idx, idx + 300)
                if (
                  /(['"]?new['"]?\s*:\s*(true|false)|['"]?returnOriginal['"]?\s*:)/.test(snippet)
                ) {
                  const line = content.slice(0, idx).split('\n').length
                  deprecatedOccurrences.push({
                    file: fullPath,
                    line,
                    snippet: snippet.slice(0, 150),
                  })
                }
                idx += method.length
              }
            }
          }
        }
      }
    }

    for (const target of targets) {
      if (fs.existsSync(target)) {
        scanDir(target)
      }
    }

    expect(deprecatedOccurrences).toEqual([])
  })
})
