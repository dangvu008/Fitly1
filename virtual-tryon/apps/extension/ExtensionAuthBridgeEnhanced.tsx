/**
 * File: ExtensionAuthBridge.tsx - Enhanced to avoid 401 on first load
 * Purpose: Only fetch settings when user is authenticated
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from './AuthProvider';

export function ExtensionAuthBridge() {
  const { isAuthenticated } = useAuthContext();
  const [settingsFetched, setSettingsFetched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || settingsFetched) return;

    // Only fetch settings when user is logged in
    fetch('/api/extension/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Settings fetch failed');
        return res.json();
      })
      .then((data) => {
        // Handle settings data
        console.log('Extension settings loaded:', data);
        setSettingsFetched(true);
      })
      .catch((err) => {
        console.warn('Failed to load extension settings:', err);
        // Don't show error to user, just log it
      });
  }, [isAuthenticated, settingsFetched]);

  return null; // This component doesn't render anything
}