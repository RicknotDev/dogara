import type { SettingsBridge } from '../shared/modules';

declare global {
  interface Window {
    dogara: SettingsBridge;
  }
}
