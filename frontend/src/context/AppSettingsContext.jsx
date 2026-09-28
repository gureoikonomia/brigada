import { useCallback, useEffect, useState } from 'react';
import { AppSettingsContext } from './appSettingsStore';
import { getAppSettings, updateVotingSetting } from '../services/app-settings.service';

export function AppSettingsProvider({ children }) {
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setVotingEnabled(settings.votingEnabled === true);
    } catch {
      // Keep voting disabled when settings cannot be loaded.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refreshSettings);

    const handleFocus = () => refreshSettings();
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshSettings();
    };
    const intervalId = window.setInterval(refreshSettings, 30000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSettings]);

  const saveVotingSetting = useCallback(async (enabled) => {
    const settings = await updateVotingSetting(enabled);
    setVotingEnabled(settings.votingEnabled === true);
    return settings;
  }, []);

  return (
    <AppSettingsContext.Provider value={{ votingEnabled, loading, saveVotingSetting }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
