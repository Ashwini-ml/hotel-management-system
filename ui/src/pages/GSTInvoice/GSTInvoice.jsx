import React from "react";

function GSTInvoice() {
  const roomCharge = 5000;
  const foodCharge = 1500;
  const serviceCharge = 500;

  const subtotal = roomCharge + foodCharge + serviceCharge;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="invoice-container">
      <h1>GST Invoice</h1>

      <div className="hotel-details">
        <h2>Grand Palace Hotel</h2>
        <p>Bangalore, Karnataka</p>
        <p>GSTIN: 29ABCDE1234F1Z5</p>
      </div>

      <hr />

      <h3>Guest Details</h3>
      <p><strong>Guest Name:</strong> Hotel Guest</p>
      <p><strong>Room Number:</strong> 101</p>

      <hr />

      <h3>Invoice Details</h3>

      <p>Room Charge: ₹{roomCharge}</p>
      <p>Food Charge: ₹{foodCharge}</p>
      <p>Service Charge: ₹{serviceCharge}</p>

      <hr />

      <p>
        <strong>Subtotal:</strong> ₹{subtotal}
      </p>

      <p>
        <strong>GST (18%):</strong> ₹{gst.toFixed(2)}
      </p>

      <h2>
        Grand Total: ₹{total.toFixed(2)}
      </h2>

      <button onClick={() => window.print()}>
        Print Invoice
      </button>
    </div>
  );
}

export default GSTInvoice;