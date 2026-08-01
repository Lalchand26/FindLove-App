import React from "react";

export default function Privacy() {
  const lastUpdated = "29 June 2026";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <strong>Last Updated:</strong> {lastUpdated}
      </p>

      <div className="space-y-5 text-sm md:text-base leading-relaxed">
        
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Introduction</h2>
          <p>
            This Privacy Policy describes how <span className="font-semibold">citycrossed</span> and its affiliates (collectively "citycrossed, we, our, us")
            collect, use, share, protect or otherwise process your information/ personal data through our website
            <span className="font-semibold"> https://citycrossed.com </span> (hereinafter referred to as Platform). By visiting this Platform, you expressly agree 
            to be bound by the terms and conditions of this Privacy Policy, the Terms of Use and agree to be 
            governed by the laws of India. If you do not agree please do not use or access our Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Collection</h2>
          <p>
            We collect your personal data when you use our Platform. Information we collect includes name, 
            date of birth, address, telephone/mobile number, email ID and/or any proof of identity or address. 
            Some sensitive personal data may be collected with your consent, such as bank account, payment 
            instrument information or biometric information. You always have the option to not provide information 
            by choosing not to use a particular service.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Usage</h2>
          <p>
            We use personal data to provide the services you request. To market to you, we will provide you 
            the ability to opt-out. We use your data to handle orders, enhance customer experience, resolve 
            disputes, detect fraud, and conduct marketing research.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Sharing</h2>
          <p>
            We may share your personal data within our group entities and with third parties such as sellers, 
            business partners, logistics partners, and payment providers to provide you access to our services. 
            We may disclose data to government agencies if required by law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Security Precautions</h2>
          <p>
            To protect your personal data we adopt reasonable security practices and procedures. However, 
            transmission of information over the internet cannot always be guaranteed as completely secure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Data Deletion and Retention</h2>
          <p>
            You have an option to delete your account by visiting your profile and settings. We retain your 
            personal data for as long as required for the purpose it was collected or as required under law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Your Rights & Consent</h2>
          <p>
            You may access, rectify, and update your personal data directly through the Platform. 
            By using our Platform you consent to collection and processing of your data as per this policy. 
            You can withdraw consent by writing to our Grievance Officer.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Grievance Officer</h2>
          <p>
            <strong>Name:</strong> [Your Name] <br/>
            <strong>Designation:</strong> Grievance Officer <br/>
            <strong>Address:</strong> simdega jharkhand 835223 <br/>
            <strong>Email:</strong> citycrossedsupport@gmail.com <br/>
            <strong>Phone:</strong> [Your Number] <br/>
            <strong>Time:</strong> Monday - Friday 10AM - 6PM
          </p>
          <p className="mt-2 text-xs">
            Please mention "Withdrawal of consent for processing personal data" in subject line.
          </p>
        </div>

      </div>
    </div>
  );
}