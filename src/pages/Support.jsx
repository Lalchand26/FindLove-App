import React from 'react';

export default function Support() {
  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-black mb-6 text-gray-900 dark:text-white">Help & Support</h1>
      
      <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl mb-6 border border-pink-200 dark:border-pink-800">
        <p className="font-bold text-pink-700 dark:text-pink-400">Need urgent help?</p>
        <p className="text-sm mt-1 text-pink-600 dark:text-pink-300">Report abuse: Profile pe ⋮ → Report</p>
      </div>

      <h2 className="font-bold text-lg mt-8 mb-3 text-gray-900 dark:text-white">Contact Us</h2>
      <p className="text-gray-600 dark:text-gray-300">Email: lalchandpahan88@gmail.com</p>
     
      <h2 className="font-bold text-lg mt-8 mb-3 text-gray-900 dark:text-white">Common Issues</h2>
      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <li>• <b>Can't login:</b> Reset password ya lalchandpahan88@gmail.com pe mail karo</li>
        <li>• <b>Photos not uploading:</b> 5MB se kam JPG/PNG use karo</li>
        <li>• <b>No matches:</b> Profile 100% complete karo + daily login karo</li>
        <li>• <b>Delete account:</b> Profile → Settings → Delete Account</li>
      </ul>
    </div>
  );
}