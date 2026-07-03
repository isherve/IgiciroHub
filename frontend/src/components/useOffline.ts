import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** Returns true when the device appears to have no internet connectivity. */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!online);
    });
    return () => unsub();
  }, []);
  return offline;
}
