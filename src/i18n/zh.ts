const zh = {
  // App
  app: {
    name: 'AI助听器',
  },

  // 引导页
  onboarding: {
    skip: '跳过',
    next: '下一步',
    getStarted: '开始使用',
    slides: {
      hearing: {
        title: '实时助听',
        description: '将手机变成你的智能助听器\n随时随地，听得更清楚',
      },
      voice: {
        title: '人声增强',
        description: '智能增强人声\n压低环境噪音，对话更清晰',
      },
      boneConducting: {
        title: '骨传导优化',
        description: '专为骨传导耳机优化\n回声消除，彻底告别啸叫',
      },
    },
  },

  // 主页
  home: {
    start: '开始助听',
    stop: '停止助听',
    starting: '启动中...',
    volume: '音量',
    voiceEnhance: '人声增强',
    noiseReduce: '环境降噪',
    headphoneConnected: '耳机已连接',
    headphoneDisconnected: '请先连接耳机',
    mode: {
      normal: '普通耳机',
      boneConducting: '骨传导',
      switchTo: '切换至',
    },
    announcement: '公告',
    offlineMode: '当前为离线模式，部分功能受限',
    configLocked: '联网后可调整配置',
    noHeadphoneWarning: '未检测到耳机，已切换为外放模式。连接耳机后可获得更好体验。',
    errors: {
      permissionDenied: '需要麦克风权限，请在设置中开启',
      noHeadphone: '请先连接耳机',
      engineError: '音频引擎启动失败，请重试',
    },
  },

  // 设置页
  settings: {
    title: '设置',
    audio: {
      title: '音频参数',
      resetDefaults: '恢复默认',
      paramsHint: '音量、人声增强、环境降噪均可在主页实时调节。',
    },
    membership: {
      title: '我的会员',
      status: {
        active: '已订阅',
        expired: '已过期',
        unlimited: '无限制会员',
        trial: '试用中',
        free: '免费用户',
      },
      expiresAt: '到期时间',
      renewOrUpgrade: '续费 / 升级',
    },
    language: {
      title: '语言',
      zh: '中文',
      en: 'English',
    },
    feedback: {
      title: '意见反馈',
      submit: '提交反馈',
      placeholder: '请描述您遇到的问题或建议...',
      types: {
        bug: '遇到问题',
        feature: '功能建议',
        complaint: '投诉',
        other: '其他',
      },
      success: '感谢您的反馈！',
    },
    about: {
      title: '关于',
      version: '版本',
      privacy: '隐私政策',
      terms: '用户协议',
      subscription: '订阅条款',
    },
  },

  // 登录页
  auth: {
    title: '登录',
    subtitle: '登录后享受完整功能',
    phonePlaceholder: '请输入手机号',
    codePlaceholder: '请输入验证码',
    sendCode: '发送验证码',
    resendCode: '重新发送',
    resendIn: '{{seconds}} 秒后重发',
    login: '登录',
    agreePrefix: '登录即表示同意',
    terms: '《用户协议》',
    and: '和',
    privacy: '《隐私政策》',
    errors: {
      invalidPhone: '请输入正确的手机号',
      invalidCode: '请输入6位验证码',
      sendFailed: '验证码发送失败，请重试',
      loginFailed: '登录失败，请检查验证码',
    },
  },

  // 付费墙
  paywall: {
    title: '解锁全部功能',
    subtitle: '开通会员，无限使用',
    freeFeatures: '免费功能',
    paidFeatures: '会员功能',
    features: {
      basic: '基础放大功能',
      voiceEnhance: '人声智能增强',
      noiseCancellation: '环境噪音抑制',
      boneConducting: '骨传导专属优化',
      noAds: '去除全部广告',
      offlineFull: '断网时完整使用',
    },
    plans: {
      daily: {
        label: '日卡',
        description: '体验一天',
      },
      monthly: {
        label: '月付',
        description: '每月自动续费',
      },
      yearly: {
        label: '年付',
        description: '每年自动续费，更划算',
      },
      lifetime: {
        label: '终身',
        description: '一次付费，永久使用',
      },
    },
    recommended: '推荐',
    payWith: '支付方式',
    wechat: '微信支付',
    alipay: '支付宝',
    subscribe: '立即订阅',
    restore: '恢复购买',
    terms: '订阅条款',
    trialEnded: '试用期已结束',
    trialDaysLeft: '试用剩余 {{days}} 天',
  },

  // 版本更新
  update: {
    forceTitle: '需要更新',
    forceMessage: '当前版本过旧，请更新到最新版本以继续使用',
    forceButton: '立即更新',
    suggestTitle: '发现新版本',
    suggestMessage: '新版本已发布，建议更新以获得最佳体验',
    updateButton: '立即更新',
    laterButton: '稍后再说',
  },

  // 隐私协议弹窗（首次启动）
  privacy: {
    dialogTitle: '隐私协议',
    dialogMessage: '在使用 AI助听器 之前，请阅读并同意我们的《隐私政策》和《用户协议》。我们承诺保护您的个人信息安全。',
    agree: '同意并继续',
    disagree: '不同意',
    viewPrivacy: '查看隐私政策',
    viewTerms: '查看用户协议',
  },

  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    ok: '好的',
    close: '关闭',
    back: '返回',
    retry: '重试',
    loading: '加载中...',
    networkError: '网络连接失败',
    unknownError: '未知错误，请重试',
    low: '低',
    high: '高',
    off: '关',
    on: '开',
  },
};

export default zh;
export type TranslationKeys = typeof zh;
