import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-sm text-gray-700 dark:text-gray-300 min-h-screen">
      <h1 className="text-2xl font-black mb-6 text-gray-900 dark:text-white">Privacy Policy</h1>
      <p>Last updated: 29 June 2026</p>

      <h2 className="font-bold mt-6 mb-2 text-gray-900 dark:text-white">1. Data We Collect</h2>
      <p>Name, age, gender, photos, bio, location, messages, device info. Optional: Aadhaar for verification.</p>

      <h2 className="font-bold mt-6 mb-2 text-gray-900 dark:text-white">2. How We Use Data</h2>
      <p>To show your profile, suggest matches, keep app safe, prevent fraud. We NEVER sell your data to advertisers.</p>

      <h2 className="font-bold mt-6 mb-2 text-gray-900 dark:text-white">3. Data Storage</h2>
      <p>Your data is stored on secure servers in India. Chats are encrypted.</p>

      <h2 className="font-bold mt-6 mb-2 text-gray-900 dark:text-white">4. Your Rights</h2>
      <p>You can: View, edit, download, or delete your data anytime from Profile. Email support@findlove.app for help.</p>

      <h2 className="font-bold mt-6 mb-2 text-gray-900 dark:text-white">5. Children</h2>
      <p>FindLove is 18+ only. We delete underage accounts immediately.</p>

      <p className="mt-8">Grievance Officer: support@findlove.app</p>
    </div>
  );
}