import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Browser ke default auto-popup ko rokne ke liye
      e.preventDefault();
      // Prompt ko save kar lete hain taaki baad mein button click par trigger kar sakein
      setDeferredPrompt(e);
      // Apna custom banner show kar dein
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Agar app already installed hai toh event trigger nahi hoga
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log('CityCrossed was successfully installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Browser ka native install prompt dikhayein
    deferredPrompt.prompt();

    // User ka choice check karein (install kiya ya cancel kiya)
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Prompt dubara use nahi ho sakta, isliye reset kar dein
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-900 border border-pink-200 shadow-2xl rounded-2xl p-4 z-50 flex items-center justify-between gap-4 animate-bounce-short">
      <div className="flex items-center gap-3">
        <div className="bg-pink-100 p-3 rounded-xl text-pink-600 font-bold text-lg">
          📱
        </div>
        <div>
          <h4 className="font-bold text-gray-800 dark:text-white text-sm">Install CityCrossed</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add to home screen for fast & easy access!</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowBanner(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          Later
        </button>
        <button
          onClick={handleInstallClick}
          className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition"
        >
          Install
        </button>
      </div>
    </div>
  );
}