# HearClear 测试报告

**生成时间**：基于当前代码库全量测试结果  
**测试框架**：Jest  
**命令**：`npm test -- --coverage`

---

## 一、概要

| 项目 | 结果 |
|------|------|
| 测试套件 | 20 个 |
| 测试用例 | 215 个 |
| 通过 | 215 通过，0 失败 |
| 耗时 | 约 60 s |
| 语句覆盖率 | 54.13% |
| 分支覆盖率 | 39.77% |
| 函数覆盖率 | 55.66% |
| 行覆盖率 | 54.87% |

---

## 二、按模块的测试用例清单

### 2.1 配置 (config)

**`src/__tests__/config/audio.test.ts`**

- **AUDIO_CONFIG 基础值**
  - DEFAULT_GAIN 在合理范围（0-38 dB）
  - MAX_GAIN_NORMAL > MAX_GAIN_BONE_CONDUCTION > MAX_GAIN_SPEAKER（防止外放啸叫）
  - DEFAULT_VOICE_ENHANCE 在 [0, 1] 范围
  - DEFAULT_NOISE_GATE 在 [0, 1] 范围
  - SAMPLE_RATE 为标准值 44100
- **AUDIO_CONFIG.EQ_BANDS**
  - 包含至少 4 个滤波器
  - 每个滤波器都有 type/frequency/gain/q
  - 滤波器频率按升序排列（低频到高频）
- **AUDIO_CONFIG.FEEDBACK_SUPPRESSOR**
  - THRESHOLD_DB 大于 0（防止误触发）
  - 检测窗口大于 0
  - NOTCH_Q 大于 0
  - NOTCH_COUNT 至少 1
  - LIMITER_GAIN_REDUCTION 在 (0,1]
- **AUDIO_CONFIG.GATE**
  - UPDATE_MS 在 10–100ms（门控周期，影响延迟）
  - ATTACK_MS 与 RELEASE_MS 为正数
  - SOFT_ENABLED 为布尔
- **AUDIO_CONFIG.SCENE_PRESETS**
  - default 与 tv 预设都存在
  - 各预设含 gateUpdateMs / gateAttackMs / gateReleaseMs / thresholdBase / thresholdScale
- **AUDIO_PRESETS**
  - 三种模式的预设都存在
  - NORMAL 模式 useSpeaker=false
  - SPEAKER 模式 useSpeaker=true
  - BONE_CONDUCTION 有额外 EQ 补偿（骨传导低频不足）
  - SPEAKER 有 extraEQ（外放削减低频防回声）
  - 各模式 maxGain 不超过 AUDIO_CONFIG 上限
  - SPEAKER 模式 AEC 强度最高（外放回声最严重）
  - OUTPUT_DEVICE_OPTIONS 中的模式均为 useSpeaker false（防止误开外放）
- **HeadphoneMode 枚举**：包含三个合法值
- **AUDIO_CONFIG 默认参数**
  - DEFAULT_NOISE_GATE 在 [0,1] 且偏大（环境音压得低）
  - DEFAULT_VOICE_ENHANCE 在 [0,1]
- **OUTPUT_DEVICE_OPTIONS**：仅包含 NORMAL 与 BONE_CONDUCTION，不含 SPEAKER（UI 无外放选项）

**`src/__tests__/config/app.test.ts`**

- **APP_CONFIG**：NAME_ZH / NAME_EN 非空；VERSION 为 x.y.z 格式；PLATFORMS 含 APP_STORE_URL、PLAY_STORE_URL；COMPANY 含 EMAIL、PRIVACY_URL、TERMS_URL
- **SUPABASE_CONFIG**：存在 URL 与 ANON_KEY 键；URL 为空或 https

---

### 2.2 常量 (constants)

**`src/__tests__/constants/trial.test.ts`**

- **TRIAL_DEFAULTS**：TRIAL_DAYS 为正整数；PAYWALL_ENABLED 为布尔；CACHE_VALID_DAYS 为正整数
- **STORAGE_KEYS**：所有键均为非空字符串且含 hearclear 前缀；包含 FIRST_USE_AT、ONBOARDING_DONE、PRIVACY_AGREED、LAST_AUDIO_PARAMS、AUDIOGRAM、PRESCRIPTION、FEEDBACK_CORRECTION

---

### 2.3 数据库 (db)

**`src/__tests__/db/schema.test.ts`**

- **数据库 Schema 验证**
  - （无 SUPABASE_ACCESS_TOKEN 时）跳过所有 DB 测试的占位用例
  - **表是否全部存在**：各预期表存在
  - **profiles 表字段**：profiles / subscriptions / payments 必填字段
  - **RLS 已启用**：所有表启用 Row Level Security
  - **索引存在**：idx_subscriptions_user_status、idx_payments_*、idx_user_sessions_user_id、idx_admin_logs_admin_id、idx_ad_impressions_user_id
  - **app_config 默认数据**：默认配置项、default_trial_days 值为 3
  - **函数和触发器**：is_admin、update_updated_at、profiles 的 updated_at 触发器
  - **CHECK 约束**：subscriptions.type、payments.channel 合法值

---

### 2.4 国际化 (i18n)

**`src/__tests__/i18n/auth-and-settings-keys.test.ts`**

- **i18n auth keys**：中/英文 auth.loginWithPhone、loginWithEmail、loginWithGoogle；auth.emailPlaceholder、errors.invalidEmail、errors.googleFailed
- **i18n settings.audio keys**：中/英文 settings.audio.latencyTest；settings.audio.neuralDenoiser / neuralDenoiserHint

**`src/__tests__/i18n/latency-test-keys.test.ts`**

- 中文/英文存在 settings.audio.latencyTest

---

### 2.5 Hooks

**`src/__tests__/hooks/useAudioAnalyser.test.tsx`**

- **useAudioAnalyser**
  - 返回 voiceBars 与 envBars，长度等于 numBars
  - 未运行时初始为全 0
  - 不同 numBars 初始渲染返回对应长度
  - 返回值为 number 数组（双频谱条可渲染）

---

### 2.6 服务 (services)

**`src/__tests__/services/api.test.ts`**

- **fetchAppConfig**：成功解析配置项；数据库报错时返回 null
- **fetchAppVersion**：成功返回版本信息；无版本记录时返回 null
- **fetchActiveSubscription**：成功返回有效订阅；无订阅时返回 null；lifetime 订阅 expiresAt 为 null
- **submitFeedback**：提交成功返回 error=null；数据库报错时返回错误信息；带联系方式提交
- **trackAdEvent**：成功记录广告展示；匿名用户 userId=null 不报错

**`src/__tests__/services/auth.test.ts`**

- **sendOtp**：发送成功返回 error=null；发送失败返回错误信息；手机号自动加 +86 前缀；已带 +86 的号码不重复添加前缀
- **verifyOtp**：验证成功返回 user；验证码错误返回 error；首次登录自动创建 profile
- **getCurrentUser**：有 session 时返回 profile；无 session 时返回 null
- **signOut**：调用 supabase.auth.signOut

**`src/__tests__/services/audio-engine.test.ts`**

- **AudioEngine - Expo Go / Mock 模式**
  - isAvailable 为 false（无 native 模块）
  - start() 在 mock 模式下返回 { error: null }
  - start() 后 isRunning 可通过 getSpectrumData 感知（返回 null）
  - stop() 不抛异常（幂等）；连续 stop() 两次不崩溃
  - 未启动时 getSpectrumData() 返回 null
  - start() → stop() 序列不报错
  - getSpectrumData(numBars) 未运行或 Mock 下返回 null
  - stop() 后清除啸叫频率（setFeedbackFrequency(null)）
  - 门控分析使用 512 点 FFT（低延迟）
  - start() 传入 neuralDenoiser: true 在 mock 下不报错
- **AudioEngine - 语音增强（setSpeechEnhancementEnabled 抛错不导致崩溃）**
  - NativeModules.AudioAPIModule.setSpeechEnhancementEnabled 抛错时 start(neuralDenoiser: true) 仍正常返回
  - NativeModules.AudioAPIModule.setSpeechEnhancementEnabled 抛错时 stop() 不抛异常

**`src/__tests__/services/audioUtils.test.ts`**

- **clampGainForPreset**：gain 超过 maxGain 时返回 maxGain；gain 在 [0, maxGain] 内时原样返回；gain 小于 0 时返回 0；与各 preset.maxGain 组合时不会超出预设
- **dbToLinear**：0 dB 为 1；6 dB 约为 2；负 dB 小于 1

---

### 2.7 状态管理 (stores)

**`src/__tests__/stores/audio-store.test.ts`**

- **初始状态**：params 使用默认值；初始 status 为 idle；初始 configLocked 为 false
- **setStatus**：更新 status
- **setHeadphoneConnected**：连接耳机；断开耳机
- **setFeedbackFrequency**：设置啸叫频率；清除啸叫频率
- **setError**：设置错误信息；清除错误
- **updateParams**：正常更新 gain；partial 更新不影响其他字段；切换耳机模式；configLocked 时禁止修改参数；configLocked 时禁止修改 neuralDenoiser；可单独更新 noiseGate、voiceEnhance、neuralDenoiser；updateParams 多次合并保留最后一次
- **resetParams**：恢复到默认参数；resetParams 将 neuralDenoiser 恢复为默认 true；configLocked 时禁止重置
- **setConfigLocked**：锁定配置；解锁配置后可以修改参数

**`src/__tests__/stores/auth-store.test.ts`**

- **初始状态**：user 为 null；isAuthenticated 为 false
- **loadCurrentUser**：成功加载已登录用户；用户未登录时 user 为 null；服务异常时不崩溃，清空 user
- **login**：登录成功；验证码错误时返回 error；登录过程中 isLoading 正确切换
- **logout**：退出后清空用户状态
- **updateProfile**：更新 nickname；user 为 null 时不崩溃；partial 更新不影响其他字段

**`src/__tests__/stores/config-store.test.ts`**

- **初始状态**：config 为 null；isOfflineMode 为 false；isLoading 为 false
- **setOfflineMode**：切换到离线模式；切换回在线模式
- **getEffectiveConfig**：无配置时返回默认值；有配置时返回实际配置；默认配置的 defaultTrialDays 合理（>= 1）
- **syncConfig - 成功路径**：成功同步后 isOfflineMode=false, config 更新；同步成功后调用 setItem 缓存配置；isLoading 在完成后恢复 false
- **syncConfig - 失败路径**：API 报错时返回 false 且 isOfflineMode=true；API 返回 null 时也降级到离线；失败后 isLoading 恢复 false；有缓存时失败路径读取缓存
- **loadFromCache**：有缓存时加载配置；无缓存时 config 保持 null

**`src/__tests__/stores/settings-store.test.ts`**

- **初始状态**：language 为 zh；privacyAgreed 为 false；onboardingDone 为 false
- **setLanguage**：更新 language 并调用 i18n.changeLanguage；切回 zh
- **setPrivacyAgreed**：设为 true/false
- **setOnboardingDone**：设为 true/false

**`src/__tests__/stores/subscription-store.test.ts`**

- **syncSubscription - 有效订阅**：有效 monthly 订阅；unlimited 订阅；lifetime 订阅（expiresAt=null）；已过期订阅
- **syncSubscription - 试用期逻辑**：注册 1 天试用 3 天 → 在试用期；注册 5 天试用 3 天 → 不在试用期；管理员覆盖试用天数；paywallEnabled=false 时即使过期也不显示付费墙
- **syncSubscription - 错误处理**：API 报错时不崩溃，isLoading 恢复 false
- **loadFromCache**：有缓存 profile 且在试用期；profile 为 null 时从 storage 读取；无 profile 无缓存不崩溃

---

### 2.8 类型 (types)

**`src/__tests__/types/audio.test.ts`**

- **AudioParams**：必填字段 gain、voiceEnhance、noiseGate、headphoneMode；可选 neuralDenoiser 为 boolean，默认语义为 true；可选 scene 为 default | tv
- **AudioScene**：合法值为 default 与 tv
- **AudioError**：code 为已知错误码之一
- **AudioEngineStatus**：合法状态为 idle、starting、running、stopping、error

**`src/__tests__/types/auth.test.ts`**

- **LoginMethod**：合法值为 phone 与 email；类型可赋值给 string
- **LoginCredentials 形状**：method 为 phone 时可有 phone；为 email 时可有 email
- **UserProfile 必需字段**：包含 id、phone、email、paywallEnabled、isBanned、createdAt

---

### 2.9 工具 (utils)

**`src/__tests__/utils/date.test.ts`**

- **daysBetween**：同一天返回 0；1 天前到现在返回 1；3 天差值；支持字符串格式；反向差值返回负数
- **isSubscriptionExpired**：null 表示永不过期；未来时间返回 false；过去时间返回 true
- **formatRemainingDays**：null → 永久有效（中/英文）；已过期中/英文；剩余 1 天中/英文；剩余多天中/英文
- **formatDate**：中文/英文格式化；支持 Date 对象输入

**`src/__tests__/utils/storage.test.ts`**

- **getItem**：返回解析后的 JSON 对象；key 不存在时返回 null；JSON 解析失败时返回 null；AsyncStorage 报错时返回 null；可以正确读取数组、布尔值
- **setItem**：正确序列化对象并写入；写入失败时不抛异常；可以写入 null、数组
- **removeItem**：正常删除；删除失败时不抛异常
- **multiRemove**：批量删除多个 key；空数组不报错；批量删除失败时不抛异常

---

## 三、覆盖率摘要

| 文件/目录 | 语句 | 分支 | 函数 | 行 | 未覆盖行（部分） |
|-----------|------|------|------|-----|------------------|
| **All files** | 54.13% | 39.77% | 55.66% | 54.87% | - |
| services/api.ts | 100% | 73.17% | 100% | 100% | - |
| services/audio/AudioEngine.ts | 65.35% | 30.76% | 56.25% | 68.06% | 原生路径、门控循环等 |
| services/audio/audioUtils.ts | 100% | 100% | 100% | 100% | - |
| stores/audio-store.ts | 100% | 100% | 100% | 100% | - |
| stores/config-store.ts | 100% | 100% | 100% | 100% | - |
| stores/settings-store.ts | 100% | 100% | 100% | 100% | - |
| stores/subscription-store.ts | 100% | 100% | 100% | 100% | - |
| utils/date.ts | 100% | 90.9% | 100% | 100% | - |
| utils/storage.ts | 100% | 100% | 100% | 100% | - |
| services/auth.ts | 54.16% | 42.66% | 66.66% | 51.51% | 部分分支 |
| stores/auth-store.ts | 75.86% | 42.85% | 83.33% | 75% | 44-51 |
| services/ads.ts | 0% | 0% | 0% | 0% | 未测 |
| services/background-audio.ts | 0% | 0% | 0% | 0% | 未测 |
| services/payment.ts | 0% | 0% | 0% | 0% | 未测 |
| services/remote-config.ts | 0% | 0% | 0% | 0% | 未测 |
| services/supabase.ts | 0% | 0% | 100% | 0% | 未测 |

---

## 四、说明

- 数据库相关测试（`schema.test.ts`）在未设置 `SUPABASE_ACCESS_TOKEN` 时会跳过实际 DB 校验，仅保留占位用例通过；需完整 DB 测试时可执行 `npm run test:db`（若已配置）。
- 音频引擎测试在 Jest 环境下为 Mock 模式（无 react-native-audio-api），主要验证 start/stop 行为、参数传递与异常不导致崩溃。
- **听力测试与处方**：`src/__tests__/types/audiogram.test.ts` 覆盖听力图/处方类型与校验函数；`src/__tests__/services/prescription.test.ts` 覆盖 `audiogramToPrescription` 半增益与插值。`src/__tests__/stores/audio-store.test.ts` 覆盖 setAudiogramAndPrescription、updateFeedbackCorrection、hydrateFromStorage。
- 覆盖率未包含 app 层 UI 组件与原生模块实现，仅针对 `src/` 下被引用的逻辑。
