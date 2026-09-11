export interface ICurrencyMetadata {
  code: string
  name: string
  symbol: string
  decimalDigits: number
  symbolPosition: 'before' | 'after'
  spaceBetween: boolean
  locale: string
  flag: string
  isActive: boolean
}

export const SUPPORTED_CURRENCIES: Record<string, ICurrencyMetadata> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-US',
    flag: '🇺🇸',
    isActive: true,
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-NG',
    flag: '🇳🇬',
    isActive: true,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'de-DE',
    flag: '🇪🇺',
    isActive: true,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-GB',
    flag: '🇬🇧',
    isActive: true,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-CA',
    flag: '🇨🇦',
    isActive: true,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'AU$',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-AU',
    flag: '🇦🇺',
    isActive: true,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalDigits: 0,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'ja-JP',
    flag: '🇯🇵',
    isActive: true,
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'zh-CN',
    flag: '🇨🇳',
    isActive: true,
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: false,
    locale: 'en-GH',
    flag: '🇬🇭',
    isActive: true,
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: true,
    locale: 'en-ZA',
    flag: '🇿🇦',
    isActive: true,
  },
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceBetween: true,
    locale: 'en-KE',
    flag: '🇰🇪',
    isActive: true,
  },
}

export type SupportedCurrencyCode = keyof typeof SUPPORTED_CURRENCIES

export const DEFAULT_BASE_CURRENCY = 'USD'
export const FALLBACK_CURRENCIES = ['USD', 'NGN', 'EUR', 'GBP'] as const
