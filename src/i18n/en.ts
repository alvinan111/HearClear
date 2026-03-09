import type { TranslationKeys } from './zh';

const en: TranslationKeys = {
  app: {
    name: 'HearClear',
  },

  onboarding: {
    skip: 'Skip',
    next: 'Next',
    getStarted: 'Get Started',
    slides: {
      hearing: {
        title: 'Real-Time Hearing',
        description: 'Turn your phone into a smart hearing aid\nHear more clearly, anytime anywhere',
      },
      voice: {
        title: 'Voice Enhancement',
        description: 'Intelligently enhance voices\nReduce background noise for clearer conversations',
      },
      boneConducting: {
        title: 'Bone Conduction Mode',
        description: 'Optimized for bone conduction headphones\nEcho cancellation, eliminate feedback whistling',
      },
    },
  },

  home: {
    start: 'Start Hearing',
    stop: 'Stop Hearing',
    starting: 'Starting...',
    volume: 'Volume',
    voiceEnhance: 'Voice Enhance',
    noiseReduce: 'Noise Reduce',
    headphoneConnected: 'Headphones Connected',
    headphoneDisconnected: 'Please Connect Headphones',
    mode: {
      normal: 'Normal',
      boneConducting: 'Bone Conduction',
      switchTo: 'Switch to',
    },
    announcement: 'Notice',
    offlineMode: 'Offline mode — some features are limited',
    configLocked: 'Connect to internet to adjust settings',
    noHeadphoneWarning: 'Please connect wired headphones before starting to prevent feedback',
    errors: {
      permissionDenied: 'Microphone access required. Please enable in Settings.',
      noHeadphone: 'Please connect headphones first',
      engineError: 'Audio engine failed to start. Please try again.',
    },
  },

  settings: {
    title: 'Settings',
    audio: {
      title: 'Audio Settings',
      resetDefaults: 'Reset to Defaults',
      paramsHint: 'Volume, voice enhance, and noise reduction can be adjusted on the home screen.',
      scene: 'Scene',
      sceneDefault: 'Default',
      sceneTv: 'TV Pickup',
      sceneHint: 'TV Pickup: phone near TV, longer release and lower threshold. Restart hearing after switching.',
      neuralDenoiser: 'Neural denoiser',
      neuralDenoiserHint: 'RNNoise/GTCRN real-time denoising (experimental); requires native support.',
      latencyTest: 'Latency test',
    },
    membership: {
      title: 'Membership',
      status: {
        active: 'Active',
        expired: 'Expired',
        unlimited: 'Unlimited Member',
        trial: 'Trial',
        free: 'Free User',
      },
      expiresAt: 'Expires',
      renewOrUpgrade: 'Renew / Upgrade',
    },
    language: {
      title: 'Language',
      zh: '中文',
      en: 'English',
    },
    feedback: {
      title: 'Feedback',
      submit: 'Submit',
      placeholder: 'Please describe your issue or suggestion...',
      types: {
        bug: 'Report a Bug',
        feature: 'Feature Request',
        complaint: 'Complaint',
        other: 'Other',
      },
      success: 'Thank you for your feedback!',
    },
    about: {
      title: 'About',
      version: 'Version',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      subscription: 'Subscription Terms',
    },
  },

  auth: {
    title: 'Sign In',
    subtitle: 'Sign in to unlock all features',
    loginWithPhone: 'Phone',
    loginWithEmail: 'Email',
    loginWithGoogle: 'Sign in with Google',
    orDivider: 'or',
    phonePlaceholder: 'Enter your phone number',
    emailPlaceholder: 'Enter your email',
    codePlaceholder: 'Enter verification code',
    sendCode: 'Send Code',
    resendCode: 'Resend',
    resendIn: 'Resend in {{seconds}}s',
    login: 'Sign In',
    agreePrefix: 'By signing in, you agree to our',
    terms: 'Terms of Use',
    and: 'and',
    privacy: 'Privacy Policy',
    errors: {
      invalidPhone: 'Please enter a valid phone number',
      invalidEmail: 'Please enter a valid email',
      invalidCode: 'Please enter the 6-digit code',
      sendFailed: 'Failed to send code. Please try again.',
      loginFailed: 'Login failed. Please check your code.',
      googleFailed: 'Google sign-in failed. Please try again.',
    },
  },

  paywall: {
    title: 'Unlock Full Features',
    subtitle: 'Subscribe to use without limits',
    freeFeatures: 'Free Features',
    paidFeatures: 'Member Features',
    features: {
      basic: 'Basic amplification',
      voiceEnhance: 'AI voice enhancement',
      noiseCancellation: 'Environmental noise reduction',
      boneConducting: 'Bone conduction optimization',
      noAds: 'Ad-free experience',
      offlineFull: 'Full offline access',
    },
    plans: {
      daily: {
        label: 'Daily',
        description: 'Try for one day',
      },
      monthly: {
        label: 'Monthly',
        description: 'Billed monthly',
      },
      yearly: {
        label: 'Yearly',
        description: 'Billed annually, best value',
      },
      lifetime: {
        label: 'Lifetime',
        description: 'One-time purchase, forever',
      },
    },
    recommended: 'Recommended',
    payWith: 'Pay with',
    wechat: 'WeChat Pay',
    alipay: 'Alipay',
    subscribe: 'Subscribe Now',
    restore: 'Restore Purchase',
    terms: 'Subscription Terms',
    trialEnded: 'Your trial has ended',
    trialDaysLeft: '{{days}} trial days left',
  },

  update: {
    forceTitle: 'Update Required',
    forceMessage: 'This version is no longer supported. Please update to continue.',
    forceButton: 'Update Now',
    suggestTitle: 'New Version Available',
    suggestMessage: 'A new version is available. Update for the best experience.',
    updateButton: 'Update Now',
    laterButton: 'Later',
  },

  privacy: {
    dialogTitle: 'Privacy Agreement',
    dialogMessage: 'Before using HearClear, please read and agree to our Privacy Policy and Terms of Use. We are committed to protecting your personal information.',
    agree: 'Agree & Continue',
    disagree: 'Disagree',
    viewPrivacy: 'Privacy Policy',
    viewTerms: 'Terms of Use',
  },

  hearingTest: {
    title: 'Hearing Test',
    disclaimer: 'This test is for reference only, not a clinical diagnosis. Consult a professional for hearing concerns.',
    headphoneNotice: 'Please wear headphones and test in a quiet environment.',
    startTest: 'Start Test',
    skip: 'Skip',
    frequency: '{{freq}} Hz',
    heard: 'Heard',
    notHeard: 'Not heard',
    playing: 'Playing...',
    replay: 'Replay',
    nextFrequency: 'Next frequency',
    finish: 'Finish',
    resultPreview: 'Results will be used for personalized amplification. You can retest in Settings anytime.',
    notAvailable: 'Hearing test not available in this environment (requires native audio).',
  },

  feedbackCorrection: {
    title: 'Volume feedback',
    tooLoud: 'Too loud',
    tooQuiet: 'Too quiet',
    justRight: 'Just right',
    advanced: 'Advanced',
    low: 'Low',
    mid: 'Mid',
    high: 'High',
  },

  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    ok: 'OK',
    close: 'Close',
    back: 'Back',
    retry: 'Retry',
    loading: 'Loading...',
    networkError: 'Network connection failed',
    unknownError: 'Unknown error. Please try again.',
    low: 'Low',
    high: 'High',
    off: 'Off',
    on: 'On',
  },
};

export default en;
