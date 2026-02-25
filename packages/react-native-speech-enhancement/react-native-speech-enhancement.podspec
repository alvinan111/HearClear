require 'json'
pkg = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'react-native-speech-enhancement'
  s.version          = pkg['version']
  s.summary          = pkg['description']
  s.homepage         = ''
  s.license          = pkg['license']
  s.author           = pkg['author']
  s.source           = { :git => '' }
  s.platforms        = { :ios => '14.0' }
  s.source_files     = 'ios/**/*.{h,m,mm}'
  s.pod_target_xcconfig = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17' }
  s.dependency 'React-Core'
end
