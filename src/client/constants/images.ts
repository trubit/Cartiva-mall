/**
 * Verified Real Human Photography Portfolio for Cartiva Mall
 *
 * All images are genuine optical photographs from professional photographers
 * licensed for commercial and editorial use under the Unsplash License.
 * NO AI-generated faces or synthetic personas are used.
 */

export interface HumanImageAsset {
  url: string
  alt: string
  photographer: string
  photographerUrl: string
  aspectRatio: string
  width: number
  height: number
  context: string
}

export const HUMAN_IMAGES = {
  // ── Public / Landing ──────────────────────────────────────────────────────────
  homeHeroShopper: {
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&q=80',
    alt: 'Real Cartiva customer with retail shopping bags enjoying an effortless marketplace experience',
    photographer: 'freestocks',
    photographerUrl: 'https://unsplash.com/@freestocks',
    aspectRatio: '16/9',
    width: 1920,
    height: 1080,
    context: 'Home Hero - Shop Smarter. Live Better.',
  },

  homeSellerMerchant: {
    url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80',
    alt: 'Independent store merchant smiling warmly behind her counter and merchandise',
    photographer: 'Blake Wisz',
    photographerUrl: 'https://unsplash.com/@blakewisz',
    aspectRatio: '4/3',
    width: 800,
    height: 600,
    context: 'Home Page - Start Selling on Cartiva CTA',
  },

  // ── Authentication ────────────────────────────────────────────────────────────
  authSignIn: {
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1920&q=80',
    alt: 'Confident professional customer smiling while using mobile commerce services',
    photographer: 'Christina @ wocintechchat.com',
    photographerUrl: 'https://unsplash.com/@wocintechchat',
    aspectRatio: '16/9',
    width: 1920,
    height: 1080,
    context: 'Sign In / Login Showcase',
  },

  authRegister: {
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1920&q=80',
    alt: 'Creative entrepreneur and business founder in a modern studio office',
    photographer: 'LinkedIn Sales Solutions',
    photographerUrl: 'https://unsplash.com/@linkedinsalesnavigator',
    aspectRatio: '16/9',
    width: 1920,
    height: 1080,
    context: 'Create Account / Register Showcase',
  },

  authRecovery: {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
    alt: 'Relaxed customer portrait projecting security and peace of mind',
    photographer: 'Joseph Gonzalez',
    photographerUrl: 'https://unsplash.com/@septcommercial',
    aspectRatio: '4/5',
    width: 700,
    height: 875,
    context: 'Password Reset & Verification Showcase',
  },

  // ── Information & Community ───────────────────────────────────────────────────
  aboutTeam: {
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    alt: 'Multidisciplinary founding team collaborating around a conference table',
    photographer: 'Annie Spratt',
    photographerUrl: 'https://unsplash.com/@anniespratt',
    aspectRatio: '16/9',
    width: 1000,
    height: 562,
    context: 'About Us Hero - Reimagining Commerce',
  },

  aboutArtisan: {
    url: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=800&q=80',
    alt: 'Craft maker packaging artisanal goods for global marketplace dispatch',
    photographer: 'Bench Accounting',
    photographerUrl: 'https://unsplash.com/@benchaccounting',
    aspectRatio: '4/3',
    width: 800,
    height: 600,
    context: 'About Us - Decentralized Merchant Empowerment',
  },

  careersCulture: {
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80',
    alt: 'Diverse software engineers and designers laughing and reviewing code together',
    photographer: 'Christina @ wocintechchat.com',
    photographerUrl: 'https://unsplash.com/@wocintechchat',
    aspectRatio: '16/9',
    width: 1000,
    height: 562,
    context: 'Careers - Work Culture & Community Contributor Program',
  },

  affiliateCreator: {
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    alt: 'Digital lifestyle creator working on a tablet in a creative studio',
    photographer: 'Averie Woodard',
    photographerUrl: 'https://unsplash.com/@averiewoodard',
    aspectRatio: '4/3',
    width: 800,
    height: 600,
    context: 'Affiliate & Creator Program Hero',
  },

  businessCardExecutive: {
    url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    alt: 'Finance executive and corporate purchasing manager reviewing accounts on a laptop',
    photographer: 'Amy Hirschi',
    photographerUrl: 'https://unsplash.com/@amyhirschi',
    aspectRatio: '4/3',
    width: 800,
    height: 600,
    context: 'Business Card Commercial Purchasing Hero',
  },

  vendorRegistrationMerchant: {
    url: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=600&q=80',
    alt: 'Store owner reviewing inventory and fulfilling online customer orders',
    photographer: 'Blake Wisz',
    photographerUrl: 'https://unsplash.com/@blakewisz',
    aspectRatio: '1/1',
    width: 600,
    height: 600,
    context: 'Vendor Registration - Launch Your Store',
  },
} as const
