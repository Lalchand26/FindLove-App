import React from "react";

export default function PrivacyPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        
        <p>
          Welcome to <span className="font-semibold">citycrossed</span>. This Privacy Policy describes how we collect, use, share, protect, and process your personal data and information when you use our website, mobile application, and location-based social communication platform at <span className="font-semibold">https://citycrossed.com</span>.
        </p>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Introduction & Acceptance</h2>
          <p>
            <span className="font-semibold">citycrossed</span> is a social communication platform designed to connect people through location-based video calls, live streaming, and interactive digital features. By accessing or using our Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy and our Terms of Use, governed by the laws of India. If you do not agree with these terms, please do not use our Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold">Account & Profile Data:</span> Information you provide when creating an account, such as your name, date of birth, email address, mobile number, profile photos, and bio.
            </li>
            <li>
              <span className="font-semibold">Location Data:</span> Precise or approximate location information collected to power our core location-based connection features, allowing you to discover and connect with users nearby and participate in regional live streams or video calls.
            </li>
            <li>
              <span className="font-semibold">Communication & Media Data:</span> Content generated during your use of the Platform, including video feeds, audio streams during live broadcasts, text chats, and media shared during video connections.
            </li>
            <li>
              <span className="font-semibold">Financial & Transaction Data:</span> Payment instrument details, billing information, and transaction history collected securely via our authorized payment partners (such as PhonePe) when you purchase digital credits, virtual gifts, or subscriptions. We do not store sensitive payment card details directly.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. How We Use Your Information</h2>
          <p className="mb-2">We use the collected data for various purposes to deliver and enhance our services, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Operating and optimizing our location-based video calling and live streaming features.</li>
            <li>Processing transactions, managing subscriptions, and handling in-app purchases.</li>
            <li>Verifying user identity, preventing fraudulent activities, and ensuring community safety.</li>
            <li>Providing customer support and resolving technical issues or billing disputes.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Data Sharing & Disclosure</h2>
          <p>
            We do not sell your personal data. We may share your information within our corporate group, authorized technology partners, and payment gateway providers (like PhonePe) strictly as needed to facilitate platform features and transactions. We may also disclose data if required by law, court order, or governmental regulations to protect the rights, property, or safety of <span className="font-semibold">citycrossed</span>, its users, or the public.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Security Precautions</h2>
          <p>
            We implement robust administrative, technical, and physical security measures to safeguard your personal data and media streams against unauthorized access, disclosure, alteration, or destruction. However, no internet transmission or electronic storage is completely secure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">6. Data Deletion and Retention</h2>
          <p>
            You have the option to delete your account at any time directly through your profile settings. Upon a deletion request, your personal information and profile data will be removed or anonymized from active servers, except where retention is legally required or necessary for resolving active disputes or enforcing safety policies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">7. Your Rights & Consent</h2>
          <p>
            You can access, rectify, or update your profile information at any time through the Platform. By using <span className="font-semibold">citycrossed</span>, you consent to our collection, storage, and processing of your location and communication data as outlined in this policy. You may withdraw your consent by writing to our Grievance Officer.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">8. Grievance Officer</h2>
          <p className="mb-2">
            In accordance with the Information Technology Act, 2000 and applicable rules, the details of our Grievance Officer are provided below:
          </p>
          <div className="space-y-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p><strong>Name:</strong> Lalchand Pahan</p>
            <p><strong>Designation:</strong> Grievance Officer</p>
            <p><strong>Address:</strong> Simdega, Jharkhand, 835223, India</p>
            <p><strong>Email:</strong> citycrossedsupport@gmail.com</p>
            <p><strong>Phone:</strong> 7250235334</p>
            <p><strong>Working Hours:</strong> Monday - Friday</p>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Please mention &quot;Withdrawal of consent for processing personal data&quot; in the subject line of your email.
          </p>
        </div>

      </div>
    </div>
  );
}