import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer | null = null

export async function setup(): Promise<void> {
  if (process.env['MONGODB_URI']?.includes('trusonshopp')) {
    delete process.env['MONGODB_URI']
  }
  if (process.env['MONGODB_URI']) return

  try {
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: 'testdb' },
    })
    process.env['MONGODB_URI'] = mongoServer.getUri()
  } catch (err) {
    console.warn('MongoMemoryServer start failed, falling back to local mongodb uri:', err)
    process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/truson_test'
  }
}

export async function teardown(): Promise<void> {
  if (mongoServer) {
    await mongoServer.stop()
  }
}
