import { useContext } from 'react';
import { AppSettingsContext } from '../context/appSettingsStore';

export default function useAppSettings() {
  const settings = useContext(AppSettingsContext);
  if (!settings) throw new Error('useAppSettings debe usarse dentro de <AppSettingsProvider>');
  return settings;
}