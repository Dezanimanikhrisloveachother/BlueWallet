declare module 'react-native-passcode-auth' {
  function isSupported(): Promise<boolean>;
  function authenticate(): Promise<boolean>;
}
