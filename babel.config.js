module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@services': './src/services',
            '@stores': './src/stores',
            '@hooks': './src/hooks',
            '@config': './src/config',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@i18n': './src/i18n',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
