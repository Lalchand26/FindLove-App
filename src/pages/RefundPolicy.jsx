import React from "react";

export default function RefundPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Refund and Cancellation Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        
        <p>
          Welcome to <span className="font-semibold">citycrossed</span>. This Refund and Cancellation Policy outlines the terms regarding digital services, in-app purchases, virtual features, subscriptions, and any transactions made through our location-based social communication platform.
        </p>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Nature of Our Services</h2>
          <p>
            <span className="font-semibold">citycrossed</span> is a social communication platform that connects people through location-based video calls, live streaming, and interactive digital features. Because our offerings are primarily digital services and virtual interactions delivered instantly upon purchase, specific rules apply to cancellations and refunds.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Cancellation Policy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold">Digital Subscriptions & Memberships:</span> You may cancel your recurring subscription or membership plan at any time through your account settings. Cancellation will take effect at the end of the current billing cycle, and you will retain access to your premium features until that period expires.
            </li>
            <li>
              <span className="font-semibold">In-App Purchases & Virtual Credits:</span> Once virtual credits, coins, or digital tokens are credited to your <span className="font-semibold">citycrossed</span> account, they cannot be cancelled, reversed, or refunded.
            </li>
            <li>
              <span className="font-semibold">Live Stream & Video Call Services:</span> Services consumed in real-time (such as paid live stream entry, virtual gifts, or location-based video connections) are fully rendered upon delivery and are ineligible for cancellation.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Refund Policy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold">General Rule:</span> All purchases made on <span className="font-semibold">citycrossed</span>—including digital items, virtual currency, live stream passes, and subscriptions—are strictly non-refundable, except where required by applicable law.
            </li>
            <li>
              <span className="font-semibold">Technical Glitches & Billing Errors:</span> If a technical failure, duplicate charge, or server error on our end results in an incorrect transaction or failure to deliver paid digital features, please report it to our support team within 7 days of the transaction.
            </li>
            <li>
              <span className="font-semibold">Account Bans:</span> If your account is suspended or terminated due to a violation of our Terms of Service or Community Guidelines, you will not be eligible for any refunds on unused subscriptions, virtual credits, or digital purchases.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Refund Processing</h2>
          <p>
            In the rare event that a refund is explicitly approved by <span className="font-semibold">citycrossed</span> due to a verified billing error, it will take up to <span className="font-semibold">7 business days</span> for the amount to be processed and credited back to your original payment method via PhonePe.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Contact Us</h2>
          <p>
            For any billing discrepancies, cancellation inquiries, or support requests regarding your transactions, please reach out to us at: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}