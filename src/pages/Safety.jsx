import React from 'react';

export default function Safety() {
  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-black mb-6 text-gray-900 dark:text-white">Safety Tips</h1>
      
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6 border border-red-200 dark:border-red-800">
        <p className="font-bold text-red-700 dark:text-red-400">Stay Safe Online & Offline</p>
      </div>

      <h2 className="font-bold text-lg mt-6 mb-3 text-gray-900 dark:text-white">Before Meeting</h2>
      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <li>• Video call karo milne se pehle</li>
        <li>• Social media cross-check karo</li>
        <li>• Friend ko bata ke jao location + time</li>
        <li>• Bank/OTP/UPI details kabhi share mat karo</li>
      </ul>

      <h2 className="font-bold text-lg mt-8 mb-3 text-gray-900 dark:text-white">First Date</h2>
      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <li>• Hamesha public place pe milo - cafe, mall</li>
        <li>• Apni conveyance se jao, uski car mein mat baitho</li>
        <li>• Drink apne saamne bante dekho</li>
        <li>• Uncomfortable lage to turant nikal jao</li>
      </ul>

      <h2 className="font-bold text-lg mt-8 mb-3 text-gray-900 dark:text-white">Report & Block</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Suspicious lage to Profile pe ⋮ → Report dabao. 48hr mein action. Block karne se wo kabhi nahi dikhega.
      </p>
    </div>
  );
}