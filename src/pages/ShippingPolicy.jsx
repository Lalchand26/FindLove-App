import React from "react";

export default function ShippingPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Delivery and Digital Fulfillment Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Nature of Delivery</h2>
          <p>
            <span className="font-semibold">citycrossed</span> is a digital location-based social communication and live-streaming platform. As we do not sell or ship physical products, courier or postal shipments are not applicable. All services, including virtual credits, subscriptions, live stream access, and video call features, are fulfilled digitally.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Instant Digital Fulfillment</h2>
          <p>
            Digital items, virtual currency, coins, and premium subscription features purchased through our Platform are credited and activated instantly upon successful payment confirmation via our payment gateway partners (such as PhonePe). 
          </p>
          <p className="mt-2">
            <span className="font-semibold">Note:</span> In case of any technical delay or server latency, digital fulfillment may take up to a few minutes. If you experience any delay in receiving your digital purchase, please contact our support team.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Account Confirmation</h2>
          <p>
            Confirmation of your successful purchase and digital service activation will be associated directly with your registered <span className="font-semibold">citycrossed</span> account, and a receipt notification will be sent to your registered email ID.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. No Shipping Charges</h2>
          <p>
            Since all offerings on <span className="font-semibold">citycrossed</span> are digital and rendered in-app or online, there are no shipping fees, courier costs, or physical handling charges levied.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Contact</h2>
          <p>
            For digital delivery queries or support with your account credits: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}