import { useContext } from 'react';
import { Platform, Alert } from 'react-native';
import PasscodeAuth from 'react-native-passcode-auth';
import RNSecureKeyStore from 'react-native-secure-key-store';
import { StackActions, CommonActions } from '@react-navigation/native';
import FingerprintScanner, { Biometrics as TBiometrics } from 'react-native-fingerprint-scanner';

import loc from '../loc';
import alert from '../components/Alert';
import * as NavigationService from '../NavigationService';
import { BlueStorageContext } from '../blue_modules/storage-context';

const STORAGEKEY = 'Biometrics';

interface IBiometric {
  (): void;
  FaceID: 'Face ID';
  TouchID: 'Touch ID';
  Biometrics: 'Biometrics';
  isBiometricUseCapableAndEnabled: () => Promise<boolean>;
  biometricType: () => Promise<TBiometrics | false>;
  unlockWithBiometrics: () => Promise<boolean>;
  showKeychainWipeAlert: () => void;
}

const Biometric = function () {
  const { getItem, setItem } = useContext(BlueStorageContext);
  Biometric.FaceID = 'Face ID';
  Biometric.TouchID = 'Touch ID';
  Biometric.Biometrics = 'Biometrics';

  const setBiometricUseEnabled = async (value: boolean) => {
    await setItem(STORAGEKEY, value === true ? '1' : '');
  };

  const isDeviceBiometricCapable = async () => {
    try {
      const capable = await FingerprintScanner.isSensorAvailable();
      if (capable) {
        return true;
      }
    } catch (e) {
      console.log('Biometrics isDeviceBiometricCapable failed');
      console.log(e);
      setBiometricUseEnabled(false);
    }
    return false;
  };

  const isBiometricUseEnabled = async () => {
    try {
      const enabledBiometrics = await getItem(STORAGEKEY);
      return !!enabledBiometrics;
    } catch (_) {}
    return false;
  };

  const clearKeychain = async () => {
    await RNSecureKeyStore.remove('data');
    await RNSecureKeyStore.remove('data_encrypted');
    await RNSecureKeyStore.remove(STORAGEKEY);
    NavigationService.dispatch(StackActions.replace('WalletsRoot'));
  };

  const requestDevicePasscode = async () => {
    let isDevicePasscodeSupported: boolean | undefined = false;
    try {
      isDevicePasscodeSupported = await PasscodeAuth.isSupported();
      if (isDevicePasscodeSupported) {
        const isAuthenticated = await PasscodeAuth.authenticate();
        if (isAuthenticated) {
          Alert.alert(
            loc.settings.encrypt_tstorage,
            loc.settings.biom_remove_decrypt,
            [
              { text: loc._.cancel, style: 'cancel' },
              {
                text: loc._.ok,
                onPress: () => clearKeychain(),
              },
            ],
            { cancelable: false },
          );
        }
      }
    } catch {
      isDevicePasscodeSupported = undefined;
    }

    if (isDevicePasscodeSupported === false) {
      alert(loc.settings.biom_no_passcode);
    }
  };

  Biometric.biometricType = async () => {
    try {
      const isSensorAvailable = await FingerprintScanner.isSensorAvailable();
      return isSensorAvailable;
    } catch (e) {
      console.log('Biometrics biometricType failed');
      console.log(e);
    }
    return false;
  };

  Biometric.isBiometricUseCapableAndEnabled = async () => {
    const enabled = await isBiometricUseEnabled();
    const capable = await isDeviceBiometricCapable();
    return enabled && capable;
  };

  Biometric.unlockWithBiometrics = async () => {
    const capable = await isDeviceBiometricCapable();
    if (!capable) {
      return false;
    }

    return new Promise(resolve => {
      FingerprintScanner.authenticate({ description: loc.settings.biom_conf_identity, fallbackEnabled: true })
        .then(() => resolve(true))
        .catch(error => {
          console.log('Biometrics authentication failed');
          console.log(error);
          resolve(false);
        })
        .finally(() => FingerprintScanner.release());
    });
  };

  Biometric.showKeychainWipeAlert = () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    Alert.alert(
      loc.settings.encrypt_tstorage,
      loc.settings.biom_10times,
      [
        {
          text: loc._.cancel,
          style: 'cancel',
          onPress: () => {
            NavigationService.dispatch(
              CommonActions.setParams({
                index: 0,
                routes: [{ name: 'UnlockWithScreenRoot' }, { params: { unlockOnComponentMount: false } }],
              }),
            );
          },
        },
        {
          text: loc._.ok,
          style: 'default',
          onPress: () => requestDevicePasscode(),
        },
      ],
      { cancelable: false },
    );
  };
} as IBiometric;

export default Biometric;
