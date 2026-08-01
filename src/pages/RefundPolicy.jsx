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

      <div className="space-y-5 text-sm md:text-base leading-relaxed">
        
        <p>
          This refund and cancellation policy outlines how you can cancel or seek a refund for a product / service
          that you have purchased through the Platform.
        </p>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Cancellation Policy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Cancellations will only be considered if the request is made within 7 days of placing the order.
            </li>
            <li>
              Cancellation requests may not be entertained if the orders have been communicated to sellers/merchant(s) 
              and they have initiated shipping, or the product is out for delivery. In such cases, you may choose 
              to reject the product at the doorstep.
            </li>
            <li>
              <span className="font-semibold">citycrossed</span> does not accept cancellation requests for perishable items like flowers, eatables, etc. 
              However, refund / replacement can be made if the quality of the product delivered is not good.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Refund Policy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              In case of receipt of damaged or defective items, please report to our customer service team within 
              7 days of receipt of products. The request will be processed after the seller/merchant verifies it.
            </li>
            <li>
              If the product received is not as shown on the site or as per your expectations, you must notify 
              our customer service within 7 days of receiving the product.
            </li>
            <li>
              For products that come with a manufacturer warranty, please refer the issue directly to the manufacturer.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Refund Processing</h2>
          <p>
            In case of any refunds approved by <span className="font-semibold">citycrossed</span>, it will take <span className="font-semibold">7 days</span> for the refund 
            to be processed to your original payment method via PhonePe.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Contact Us</h2>
          <p>
            For cancellation or refund requests, please contact: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}