import { useState, useEffect } from 'react';
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NetworkStatus() {
  const [online, setOnline]       = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 3500);
      }
      setWasOffline(false);
    };
    const handleOffline = () => {
      setOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold transition-all pointer-events-none ${
      online ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {online
        ? <><WifiIcon className="w-4 h-4" /> Connection restored</>
        : <><ExclamationTriangleIcon className="w-4 h-4" /> No internet connection: changes may not save</>
      }
    </div>
  );
}
