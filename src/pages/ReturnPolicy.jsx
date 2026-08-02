import React from "react";

export default function ReturnPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Return and Digital Service Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        
        <p>
          Welcome to <span className="font-semibold">citycrossed</span>. Since our platform specializes in location-based social communication, live streaming, and instant digital features rather than physical e-commerce goods, physical item returns and exchanges do not apply. This policy outlines how our digital services and virtual transactions are handled.
        </p>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Nature of Digital Deliverables</h2>
          <p>
            All services offered on <span className="font-semibold">citycrossed</span>—including live stream access, location-based video connections, virtual credits, coins, tokens, and digital subscriptions—are rendered and credited instantly upon successful payment. Because these are digital services consumed in real-time, they are generally non-returnable and non-exchangeable.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Reporting Service Errors or Discrepancies</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold">Technical Failures:</span> If you experience a verified server error, app glitch, or payment deduction without receiving the corresponding digital credits or subscription access, you must report it to our support team within <span className="font-semibold">7 days</span> of the transaction.
            </li>
            <li>
              <span className="font-semibold">Transaction Verification:</span> Once our team verifies the technical failure or duplicate charge, we will rectify the issue or process a correction/refund in accordance with our Refund Policy.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Non-Returnable & Non-Exchangeable Items</h2>
          <p>
            Virtual gifts, spent coins, utilized live stream passes, and active subscription periods that have already commenced cannot be returned, exchanged, or reversed under any circumstances.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Support & Resolution Process</h2>
          <p>
            For any queries or assistance regarding service delivery errors, please contact us with your account details and transaction receipt. Our team will review your case and respond promptly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Contact Us</h2>
          <p>
            For transaction or service queries: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}