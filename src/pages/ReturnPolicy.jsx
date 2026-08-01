import React from "react";

export default function ReturnPolicy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Return Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-5 text-sm md:text-base leading-relaxed">
        
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Return & Exchange Window</h2>
          <p>
            We offer refund / exchange within first <span className="font-semibold">7 days</span> from the date of your purchase. 
            If 7 days have passed since your purchase, you will not be offered a return, exchange or refund of any kind.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Eligibility for Return / Exchange</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              The purchased item should be <span className="font-semibold">unused</span> and in the same condition as you received it
            </li>
            <li>
              The item must have <span className="font-semibold">original packaging</span>
            </li>
            <li>
              If the item was purchased on sale, then the item may not be eligible for a return / exchange
            </li>
            <li>
              Only such items are replaced by us, if such items are found <span className="font-semibold">defective or damaged</span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Exemptions</h2>
          <p>
            You agree that there may be certain category of products / items that are exempted from returns or refunds. 
            Such categories will be identified to you at the time of purchase.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Process</h2>
          <p>
            For exchange / return accepted request(s), once your returned product / item is received and inspected by us, 
            we will send you an email to notify you about receipt of the returned / exchanged product. 
            If approved after quality check, your request will be processed in accordance with our policies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Contact</h2>
          <p>
            For return/exchange queries: <br/>
            <span className="font-semibold">Email: citycrossedsupport@gmail.com</span>
          </p>
        </div>

      </div>
    </div>
  );
}