import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LangCode = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'ar' | 'zh' | 'hi' | 'ja' | 'ru'

export interface Language {
  code: LangCode
  name: string
  nativeName: string
  flag: string
  rtl?: boolean
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
]

interface LanguageState {
  currentLang: LangCode
  setLanguage: (code: LangCode) => void
  getLang: () => Language
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLang: 'en',
      setLanguage: (code) => {
        set({ currentLang: code })
        const lang = LANGUAGES.find((l) => l.code === code)
        document.documentElement.lang = code
        document.documentElement.dir = lang?.rtl ? 'rtl' : 'ltr'
      },
      getLang: () => LANGUAGES.find((l) => l.code === get().currentLang) ?? LANGUAGES[0],
    }),
    { name: 'cartiva-lang' },
  ),
)
