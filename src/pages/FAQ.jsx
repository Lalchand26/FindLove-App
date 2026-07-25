import React from 'react';

export default function FAQ() {
  const faqs = [
    {
      q: "CityCrossed free hai kya?",
      a: "Haan! Profile banana, matching, aur unlimited chat bilkul free hai. Video Calling bhi free hai abhi."
    },
    {
      q: "Mera data safe hai?", 
      a: "100%. Tumhara data India mein store hota hai. Hum kabhi data bechte nahi. Chats end-to-end encrypted hain. Settings mein Delete Account se sab kuch permanent delete ho jata hai."
    },
    {
      q: "18+ se kam age wale use kar sakte?",
      a: "Nahi. CityCrossed sirf 18+ ke liye hai. Age verification required hai. Underage account turant ban ho jata hai."
    },
    {
      q: "Match nahi mil raha, kya karu?",
      a: "Profile complete karo: 3+ photos + bio likho. Daily active raho. Interests add karo." // 👈 String close kiya
    },
    {
      q: "Kisi ne harass kiya to?",
      a: "Profile pe 3 dot → Report pe click karo. admin action lete hain. Block karne se wo kabhi dobara nahi dikhega."
    },
    {
      q: "Premium lena zaroori hai?",
      a: "Nahi. Abhi bilkul free hai" 
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-black mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h1>
      {faqs.map((f, i) => (
        <div key={i} className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="font-bold text-gray-900 dark:text-white">{f.q}</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{f.a}</p>
        </div>
      ))}
    </div>
  );
}