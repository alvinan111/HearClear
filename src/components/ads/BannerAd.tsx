import React from 'react';
import { View, StyleSheet } from 'react-native';
import { shouldShowBannerAd, getBannerAdId } from '@services/ads';

/**
 * Banner 广告组件
 *
 * 使用说明：
 * 穿山甲 Banner 广告需要 Native View 渲染，
 * 通过 requireNativeComponent('PangleBannerAdView') 挂载。
 * 如果 SDK 未集成，此组件为空容器。
 */

let PangleBannerAdView: React.ComponentType<{ adId: string; style?: object }> | null = null;
try {
  const { requireNativeComponent } = require('react-native');
  PangleBannerAdView = requireNativeComponent('PangleBannerAdView');
} catch {
  // Pangle SDK 未安装，广告功能不可用
}

export default function BannerAd() {
  const show = shouldShowBannerAd();
  const adId = getBannerAdId();

  if (!show || !adId || !PangleBannerAdView) {
    return null;
  }

  return (
    <View style={styles.container}>
      <PangleBannerAdView adId={adId} style={styles.banner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: 60,
  },
});
