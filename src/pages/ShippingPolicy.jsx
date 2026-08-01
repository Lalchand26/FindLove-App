import React from "react";

export default function ShippingPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Shipping Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-5 text-sm md:text-base leading-relaxed">
        
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Shipping Method</h2>
          <p>
            The orders for the user are shipped through <span className="font-semibold">registered domestic courier companies</span> and/or 
            <span className="font-semibold"> speed post</span> only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Shipping Time</h2>
          <p>
            Orders are shipped within <span className="font-semibold">7 days</span> from the date of the order and/or payment. 
            Delivery will also depend on the delivery date agreed at the time of order confirmation and is 
            subject to courier company / post office norms.
          </p>
          <p className="mt-2">
            <span className="font-semibold">Note:</span> Platform Owner shall not be liable for any delay in delivery by the 
            courier company / postal authority.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Delivery Address</h2>
          <p>
            Delivery of all orders will be made to the address provided by the buyer at the time of purchase. 
            Delivery confirmation of our services will be sent to your email ID as specified at the time of registration.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Shipping Charges</h2>
          <p>
            If there are any shipping cost(s) levied by the seller or the Platform Owner, the same is <span className="font-semibold">not refundable</span>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Contact</h2>
          <p>
            For shipping queries: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}