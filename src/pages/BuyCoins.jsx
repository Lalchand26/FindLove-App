import { useState } from "react";
import { supabase } from "../lib/supabase.js";

const coinPackages = [
  { id: 1, coins: 960, price: 6.49, oldPrice: 12.99 },
  { id: 2, coins: 2500, price: 15.99, oldPrice: 31.99 },
  { id: 3, coins: 5000, price: 29.99, oldPrice: 59.99 },
  { id: 4, coins: 10000, price: 54.99, oldPrice: 109.99 },
];

export default function BuyCoins() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async (paymentMethod) => {
    if (!selectedPackage) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login first!");
        setLoading(false);
        return;
      }

      // Yahan aap apne payment gateway (jaise Stripe/Razorpay) ke mutabiq endpoint call karenge
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price: selectedPackage.price,
          coins: selectedPackage.coins,
          userId: user.id,
          payment_method: paymentMethod // 'gpay' ya 'card'
        }
      });

      if (error) throw error;

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create payment session.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#121212", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Buy Coins</h2>
      
      {/* Coin Packages Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
        {coinPackages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          return (
            <div 
              key={pkg.id} 
              onClick={() => setSelectedPackage(pkg)}
              style={{
                background: "#1e1e1e",
                border: isSelected ? "2px solid #2ecc71" : "1px solid #333",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "0.2s transform, 0.2s border",
                transform: isSelected ? "scale(1.02)" : "scale(1)"
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f39c12" }}>
                {pkg.coins} 🪙
              </div>
              <div style={{ margin: "10px 0", fontSize: "16px" }}>
                <span style={{ textDecoration: "line-through", color: "#888", marginRight: "8px" }}>
                  ${pkg.oldPrice.toFixed(2)}
                </span>
                <span style={{ color: "#2ecc71", fontWeight: "bold" }}>
                  ${pkg.price.toFixed(2)}
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPackage(pkg);
                }}
                style={{
                  background: isSelected ? "#2ecc71" : "#ff4757",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchase Option Modal */}
      {selectedPackage && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#1c1c1e",
            padding: "30px",
            borderRadius: "24px",
            width: "380px",
            textAlign: "center",
            position: "relative",
            border: "1px solid #333",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPackage(null)}
              style={{
                position: "absolute",
                top: "20px", right: "20px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "18px",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>Select Purchase Option</h3>
            
            <div style={{ display: "flex", justifyContent: "space-between", margin: "15px 0", fontSize: "16px" }}>
              <span style={{ color: "#aaa" }}>You will get</span>
              <span style={{ fontWeight: "bold", color: "#f39c12" }}>{selectedPackage.coins} 🪙</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", margin: "15px 0 25px 0", fontSize: "16px" }}>
              <span style={{ color: "#aaa" }}>Package price</span>
              <span>
                <span style={{ textDecoration: "line-through", color: "#888", marginRight: "8px" }}>
                  ${selectedPackage.oldPrice.toFixed(2)}
                </span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>
                  ${selectedPackage.price.toFixed(2)}
                </span>
              </span>
            </div>

            {/* Google Pay Button */}
            <button 
              onClick={() => handlePayment('gpay')}
              disabled={loading}
              style={{
                width: "100%",
                background: "#fff",
                color: "#000",
                border: "none",
                padding: "14px",
                borderRadius: "30px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: "12px",
                display: "flex",
                justifyContent: "center",
                alignItem: "center",
                gap: "8px"
              }}
            >
              {loading ? "Processing..." : "G Pay"}
            </button>

            {/* Pay with Card Button */}
            <button 
              onClick={() => handlePayment('card')}
              disabled={loading}
              style={{
                width: "100%",
                background: "#fff",
                color: "#000",
                border: "none",
                padding: "14px",
                borderRadius: "30px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {loading ? "Processing..." : "Pay with Card 💳"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}