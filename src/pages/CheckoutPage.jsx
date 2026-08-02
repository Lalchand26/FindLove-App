import React, { useState } from "react";
import toast from "react-hot-toast";

export default function CheckoutPage({ session }) {
  const [loading, setLoading] = useState(false);

  // PhonePe Payment Gateway Integration Handler
  const handlePhonePeCheckout = async () => {
    try {
      setLoading(true);
      // Yahan aap apne backend API ko call karenge jo PhonePe payment gateway initiate karega
      // Example: const response = await axios.post('/api/phonepe/pay', { email: session.user.email, amount: 99 });
      
      toast.loading("Redirecting to PhonePe Secure Gateway...", { duration: 3000 });
      
      setTimeout(() => {
        toast.success("Payment gateway initialized successfully!");
        // window.location.href = response.data.redirectUrl; // PhonePe ka payment URL yahan redirect hoga
      }, 2000);

    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate PhonePe payment. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-[80vh] flex flex-col justify-center items-center text-center">
      <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">
        PhonePe Secure Checkout
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Complete your subscription or virtual credit purchase securely using PhonePe.
      </p>

      <div className="w-full bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 text-left space-y-3">
        <div className="flex justify-between">
          <span className="font-medium">Logged User:</span>
          <span className="text-pink-500 font-semibold">{session?.user?.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Item:</span>
          <span>CityCrossed Premium Access / Credits</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
          <span className="font-bold">Total Amount:</span>
          <span className="font-bold text-lg text-green-600">₹99.00</span>
        </div>
      </div>

      <button
        onClick={handlePhonePeCheckout}
        disabled={loading}
        className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span>Pay Securely with PhonePe</span>
        )}
      </button>
    </div>
  );
}