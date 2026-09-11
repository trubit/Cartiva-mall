import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { User } from '../../modules/user/user.model.js'
import { SellerProfile } from '../../modules/seller/seller.model.js'
import { Product } from '../../modules/product/product.model.js'
import { sellerKycService } from '../../modules/seller/sellerKyc.service.js'
import * as productService from '../../modules/product/product.service.js'
import * as paystackService from '../../modules/payment/paystack.service.js'
import * as cloudinaryConfig from '../../config/cloudinary.js'

describe('Seller KYC & Store Onboarding Flow', () => {
  let sellerUser: any
  let adminUser: any

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), SellerProfile.deleteMany({}), Product.deleteMany({})])

    sellerUser = await User.create({
      firstName: 'Tunde',
      lastName: 'Adekunle',
      username: 'tunde_seller',
      email: 'tunde.seller@cartiva.com',
      password: 'Password123!',
      role: 'seller',
      accountStatus: 'ACTIVE',
    })

    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Super',
      username: 'superadmin',
      email: 'admin@cartiva.com',
      password: 'Password123!',
      role: 'admin',
      accountStatus: 'ACTIVE',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Blocks product creation if seller KYC is NOT_STARTED', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Electronics',
      accountStatus: 'ACTIVE',
      kycStatus: 'NOT_STARTED',
      storeCreated: false,
    })

    await expect(
      productService.createProduct(sellerUser._id.toString(), {
        title: 'Wireless Headset',
        description: 'Noise cancelling headset with long battery life',
        price: 45000,
        currency: 'NGN',
        stockQuantity: 10,
        sku: 'TECH-WHD-001',
        category: 'Electronics',
        images: ['https://cartiva.com/img1.jpg'],
      } as any),
    ).rejects.toThrow(/Seller KYC Required/)
  })

  it('2. Blocks product creation if KYC is UNDER_REVIEW', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Electronics',
      accountStatus: 'ACTIVE',
      kycStatus: 'UNDER_REVIEW',
      storeCreated: false,
    })

    await expect(
      productService.createProduct(sellerUser._id.toString(), {
        title: 'Wireless Headset',
        description: 'Noise cancelling headset with long battery life',
        price: 45000,
        currency: 'NGN',
        stockQuantity: 10,
        sku: 'TECH-WHD-002',
        category: 'Electronics',
        images: ['https://cartiva.com/img1.jpg'],
      } as any),
    ).rejects.toThrow(/Seller KYC Required/)
  })

  it('3. Submitting KYC validates with Paystack and moves to UNDER_REVIEW', async () => {
    vi.spyOn(paystackService, 'resolveAccount').mockResolvedValue({
      accountNumber: '0123456789',
      accountName: 'TUNDE ADEKUNLE',
      bankId: 1,
    })

    const submitted = await sellerKycService.submitKyc(sellerUser._id.toString(), {
      businessType: 'individual',
      legalName: 'Tunde Adekunle',
      idType: 'nin',
      idNumber: '12345678901',
      bankDetails: {
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
        accountName: 'Tunde Adekunle',
      },
    })

    expect(submitted.kycStatus).toBe('UNDER_REVIEW')
    expect(submitted.kycData?.legalName).toBe('Tunde Adekunle')
    expect(submitted.kycData?.bankDetails?.isResolved).toBe(true)
  })

  it('4. Admin review APPROVE marks seller as VERIFIED and isVerified = true', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Store',
      kycStatus: 'UNDER_REVIEW',
      accountStatus: 'ACTIVE',
      storeCreated: false,
    })

    const reviewed = await sellerKycService.reviewKyc(
      adminUser._id.toString(),
      sellerUser._id.toString(),
      { action: 'APPROVE' },
    )

    expect(reviewed.kycStatus).toBe('VERIFIED')
    expect(reviewed.isVerified).toBe(true)
  })

  it('5. Blocks product creation if KYC is VERIFIED but store is not yet created', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Store',
      kycStatus: 'VERIFIED',
      isVerified: true,
      accountStatus: 'ACTIVE',
      storeCreated: false,
      storeSlug: undefined,
    })

    await expect(
      productService.createProduct(sellerUser._id.toString(), {
        title: 'Wireless Headset',
        description: 'Noise cancelling headset with long battery life',
        price: 45000,
        currency: 'NGN',
        stockQuantity: 10,
        sku: 'TECH-WHD-003',
        category: 'Electronics',
        images: ['https://cartiva.com/img1.jpg'],
      } as any),
    ).rejects.toThrow(/Store Required/)
  })

  it('6. Verified seller creates store and can successfully list products', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Initial Name',
      kycStatus: 'VERIFIED',
      isVerified: true,
      accountStatus: 'ACTIVE',
      storeCreated: false,
    })

    // Create store
    const store = await sellerKycService.createStore(sellerUser._id.toString(), {
      storeName: 'Tunde Prime Electronics',
      storeCategory: 'Electronics & Gadgets',
      storeDescription: 'Premier authorized distributor of electronics in Nigeria',
    })

    expect(store.storeCreated).toBe(true)
    expect(store.storeSlug).toBe('tunde-prime-electronics')
    expect(store.storeName).toBe('Tunde Prime Electronics')

    // Create product
    const product = await productService.createProduct(sellerUser._id.toString(), {
      title: 'Wireless Headset Pro',
      description: 'Noise cancelling headset with 40hr battery',
      price: 65000,
      currency: 'NGN',
      stockQuantity: 25,
      sku: 'TECH-WHD-PRO',
      category: 'Electronics',
      images: ['https://cartiva.com/headset.jpg'],
    } as any)

    expect(product).toBeDefined()
    expect(product.status).toBe('PUBLISHED')
    expect(product.sku).toBe('TECH-WHD-PRO')
  })

  it('7. Admin REJECT blocks seller and records rejection reason', async () => {
    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Store',
      kycStatus: 'UNDER_REVIEW',
      accountStatus: 'ACTIVE',
    })

    const reviewed = await sellerKycService.reviewKyc(
      adminUser._id.toString(),
      sellerUser._id.toString(),
      { action: 'REJECT', rejectionReason: 'ID document photo is blurry and illegible' },
    )

    expect(reviewed.kycStatus).toBe('REJECTED')
    expect(reviewed.isVerified).toBe(false)
    expect(reviewed.kycData?.rejectionReason).toBe('ID document photo is blurry and illegible')
  })

  it('8. Uploading store logo persists URL and public ID on seller profile', async () => {
    vi.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(true)
    vi.spyOn(cloudinaryConfig, 'uploadImagePath').mockResolvedValue({
      url: 'https://res.cloudinary.com/cartiva/image/upload/v12345/store-logo.png',
      publicId: 'cartiva/stores/logo12345',
    })

    await SellerProfile.create({
      userId: sellerUser._id,
      storeName: 'Tunde Store',
      kycStatus: 'VERIFIED',
      isVerified: true,
      storeCreated: true,
    })

    const mockFile = {
      path: '/tmp/test-store-logo.png',
      originalname: 'store-logo.png',
      size: 10240,
      mimetype: 'image/png',
    } as Express.Multer.File

    const uploadRes = await sellerKycService.uploadStoreLogo(sellerUser._id.toString(), mockFile)
    expect(uploadRes.url).toBe(
      'https://res.cloudinary.com/cartiva/image/upload/v12345/store-logo.png',
    )
    expect(uploadRes.storeLogo).toBe(uploadRes.url)

    const updatedProfile = await SellerProfile.findOne({ userId: sellerUser._id })
    expect(updatedProfile?.storeLogo).toBe(uploadRes.url)
  })

  it('9. Uploading KYC document produces persistent secure URL and metadata', async () => {
    vi.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(true)
    vi.spyOn(cloudinaryConfig, 'uploadDocumentPath').mockResolvedValue({
      url: 'https://res.cloudinary.com/cartiva/raw/upload/v12345/national_id_card.pdf',
      publicId: 'cartiva/kyc/doc12345',
    })

    const mockFile = {
      path: '/tmp/test-kyc-doc.pdf',
      originalname: 'national_id_card.pdf',
      size: 20480,
      mimetype: 'application/pdf',
    } as Express.Multer.File

    const uploadRes = await sellerKycService.uploadKycDocument(sellerUser._id.toString(), mockFile)
    expect(uploadRes.url).toBe(
      'https://res.cloudinary.com/cartiva/raw/upload/v12345/national_id_card.pdf',
    )
    expect(uploadRes.fileName).toBe('national_id_card.pdf')
    expect(uploadRes.fileSize).toBe(20480)
    expect(uploadRes.mimeType).toBe('application/pdf')
  })
})
