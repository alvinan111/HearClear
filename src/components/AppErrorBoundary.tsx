import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '@constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 捕获子组件抛出的错误，显示友好提示，避免红屏。
 * 用于根布局包裹，进入首页后若某处抛错会显示「加载失败，请重新打开」。
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[AppErrorBoundary]', error?.message, errorInfo?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    const DevSettings = require('react-native').NativeModules?.DevSettings;
    if (DevSettings?.reload) DevSettings.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>加载失败</Text>
        <Text style={styles.message}>请重新打开应用或稍后重试</Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={styles.btnText}>重试</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={this.handleReload} activeOpacity={0.8}>
            <Text style={styles.btnText}>重新加载 (开发)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
  },
  btnText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
});
