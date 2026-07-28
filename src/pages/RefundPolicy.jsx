import React from "react";

export default function RefundPolicy() {
  const lastUpdated = "July 28, 2026"; // Date update kar lein

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Cancellation & Refund Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <section className="space-y-6 text-sm md:text-base leading-relaxed">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            1. Overview
          </h2>
          <p>
            Thank you for using our platform. We strive to provide the best service possible.
            This Cancellation and Refund Policy outlines the terms regarding service cancellations
            and refund eligibility.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            2. Cancellation Policy
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>User Cancellations:</strong> You can cancel your subscription or active services at any time through your profile settings.
            </li>
            <li>
              <strong>Billing Cycle:</strong> If you cancel during an active subscription period, you will retain access until the end of the current billing cycle.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            3. Refund Policy
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Digital Services:</strong> Payments made for digital subscriptions or premium features are non-refundable once activated, except as explicitly stated below or required by law.
            </li>
            <li>
              <strong>Technical Errors & Double Charges:</strong> In the event of a technical issue leading to double charges or service outage, a full refund will be processed.
            </li>
            <li>
              <strong>Refund Window:</strong> All refund requests must be made within 7 days of the payment date.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            4. Refund Processing
          </h2>
          <p>
            Approved refunds will be processed back to the original payment method (Credit Card, Debit Card, UPI, Netbanking) within <strong>5 to 7 working days</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            5. Contact Us
          </h2>
          <p>
            If you have any questions or wish to request a refund, please reach out to our support team:
          </p>
          <p className="mt-2 font-semibold">
            📧 Email: citycrossedsupport@gmail.com
          </p>
        </div>
      </section>
    </div>
  );
}