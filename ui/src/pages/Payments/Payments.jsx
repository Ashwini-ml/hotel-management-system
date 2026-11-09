import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/Services.jsx";
import "./Payments.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState(
    searchParams.get("bookingId") || ""
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  const [bill, setBill] = useState(null);

  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load bookings
  useEffect(() => {
    let active = true;

    async function loadBookings() {
      try {
        const response = await api.get("/CheckOut");
        const items = Array.isArray(response.data) ? response.data : [];

        if (!active) return;

        setBookings(items);

        if (!searchParams.get("bookingId") && items.length) {
          setBookingId(String(items[0].id));
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load bookings. Check the backend connection."
          );
        }
      }
    }

    loadBookings();

    return () => {
      active = false;
    };
  }, [searchParams]);

  // Load selected booking bill
  useEffect(() => {
    if (!bookingId) {
      setBill(null);
      return;
    }

    let active = true;

    async function loadBill() {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const response = await api.get(`/CheckOut/${bookingId}`);

        if (active) {
          setBill(response.data);
          setAmount(String(response.data.pendingAmount || 0));
        }
      } catch (err) {
        if (active) {
          setBill(null);
          setError(
            err.response?.data?.message ||
              "Could not load the selected booking."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBill();

    return () => {
      active = false;
    };
  }, [bookingId]);

  // Save payment
  async function handlePayment(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const paymentAmount = Number(amount);

    if (!bookingId) {
      setError("Please select a booking.");
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }

    if (bill?.booking?.status !== "CheckedIn") {
      setError(
        "Payments can only be added while the booking is CheckedIn."
      );
      return;
    }

    setSaving(true);

    try {
      await api.post(`/CheckOut/${bookingId}/payments`, {
        amount: paymentAmount,
        method,
        reference: reference.trim() || null,
        remarks: remarks.trim() || null,
        paidAt: new Date().toISOString(),
      });

      const response = await api.get(`/CheckOut/${bookingId}`);

      setBill(response.data);
      setAmount(String(response.data.pendingAmount || 0));
      setReference("");
      setRemarks("");
      setMessage("Payment saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save payment. Please check the backend."
      );
    } finally {
      setSaving(false);
    }
  }

  // Payment history
  const payments = bill?.payments || [];

  const recordedPayments = payments.filter(
    (payment) => payment.status === "Recorded"
  );

  // Search bookings
  const filteredBookings = bookings.filter((booking) => {
    const query = dropdownSearch.toLowerCase().trim();

    const guestName =
      booking?.guest?.fullName ||
      booking?.guest?.name ||
      "Guest";

    const roomNumber =
      booking?.room?.roomNumber ||
      booking?.roomNumber ||
      "";

    return (
      guestName.toLowerCase().includes(query) ||
      String(booking.id).includes(query) ||
      String(roomNumber).toLowerCase().includes(query)
    );
  });

  // Currently selected booking
  const selectedBooking = bookings.find(
    (booking) => String(booking.id) === String(bookingId)
  );

  return (
    <main className="payments-container">

      {/* Page Header */}
      <header className="payments-page-header">
        <div>
          <span className="payments-eyebrow">
            FINANCE &amp; ACCOUNTS
          </span>

          <h1>Payments</h1>

          <p>
            Record payments and review the guest's balance.
          </p>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="payment-alert payment-alert-error">
          {error}
        </div>
      )}

      {message && (
        <div
          className="payment-alert payment-alert-success"
          role="status"
        >
          {message}
        </div>
      )}

      {/* Booking Selection and Bill Summary */}
      <section className="payment-card">

        <div className="ci-booking-dropdown payment-guest-dropdown">

          <label className="ci-booking-label">
            Select guest / booking
          </label>

          <button
            type="button"
            className="ci-booking-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="ci-trigger-left">

              <span className="ci-guest-avatar">
                {(selectedBooking?.guest?.fullName || "G")
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="ci-trigger-text">
                {selectedBooking
                  ? selectedBooking.guest?.fullName || "Guest"
                  : "Choose a guest"}
              </span>

            </span>

            <span className="ci-trigger-arrow">
              {dropdownOpen ? "▲" : "▼"}
            </span>
          </button>

          {dropdownOpen && (
            <div className="ci-booking-menu">

              <input
                type="text"
                className="ci-menu-search"
                placeholder="Search guest, room or booking ID..."
                value={dropdownSearch}
                onChange={(event) =>
                  setDropdownSearch(event.target.value)
                }
              />

              <div className="ci-menu-heading">
                Available bookings ({filteredBookings.length})
              </div>

              <div className="ci-booking-options">

                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const name =
                      booking.guest?.fullName ||
                      booking.guest?.name ||
                      "Guest";

                    const room =
                      booking.room?.roomNumber ||
                      booking.roomNumber ||
                      "—";

                    return (
                      <button
                        type="button"
                        key={booking.id}
                        className="ci-booking-option"
                        onClick={() => {
                          setBookingId(String(booking.id));
                          setDropdownOpen(false);
                          setDropdownSearch("");
                        }}
                      >
                        <span className="ci-guest-avatar">
                          {name.charAt(0).toUpperCase()}
                        </span>

                        <span className="ci-guest-info">
                          <strong>{name}</strong>

                          <small>
                            Booking #{booking.id} · Room {room}
                          </small>
                        </span>

                        <span className="ci-option-status">
                          {booking.status || "—"}
                        </span>

                        {String(bookingId) === String(booking.id) && (
                          <span className="ci-option-tick">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="ci-no-bookings">
                    No matching bookings found.
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {loading && <p>Loading bill...</p>}

        {bill && (
          <>
            <div className="payment-booking-details">

              <div>
                <span>Guest</span>
                <strong>
                  {bill.booking?.guest?.fullName || "Guest"}
                </strong>
              </div>

              <div>
                <span>Room</span>
                <strong>
                  {bill.booking?.room?.roomNumber || "—"}
                </strong>
              </div>

              <div>
                <span>Booking status</span>
                <strong>
                  {bill.booking?.status || "—"}
                </strong>
              </div>

            </div>

            <h3>Bill Summary</h3>

            <div className="payment-summary-line">
              <span>Room charges</span>
              <strong>{money(bill.roomCharges)}</strong>
            </div>

            <div className="payment-summary-line">
              <span>Additional charges</span>
              <strong>{money(bill.additionalTotal)}</strong>
            </div>

            <div className="payment-summary-line payment-summary-total">
              <span>Total bill</span>
              <strong>{money(bill.totalAmount)}</strong>
            </div>

            <div className="payment-summary-line">
              <span>Amount received</span>
              <strong>{money(bill.amountReceived)}</strong>
            </div>

            <div className="payment-summary-line payment-summary-pending">
              <span>Balance pending</span>
              <strong>{money(bill.pendingAmount)}</strong>
            </div>
          </>
        )}

      </section>

      {/* Record Payment */}
      <section className="payment-card">

        <h3>Record a Payment</h3>

        <form onSubmit={handlePayment}>

          <label htmlFor="payment-amount">
            Amount received (₹)
          </label>

          <input
            id="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <label htmlFor="payment-method">
            Payment method
          </label>

          <select
            id="payment-method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Credit / Debit Card</option>
          </select>

          <label htmlFor="payment-reference">
            Transaction reference (optional)
          </label>

          <input
            id="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={100}
            placeholder="UPI reference or receipt number"
          />

          <label htmlFor="payment-remarks">
            Remarks (optional)
          </label>

          <textarea
            id="payment-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Payment notes"
          />

          <button
            type="submit"
            disabled={
              saving ||
              loading ||
              !bookingId ||
              bill?.booking?.status !== "CheckedIn"
            }
          >
            {saving ? "Saving payment..." : "Save Payment"}
          </button>

        </form>

        {bill?.booking?.status !== "CheckedIn" && bookingId && (
          <p className="payment-note">
            This booking is not checked in. New payments can only be
            recorded before checkout.
          </p>
        )}

      </section>

      {/* Payment History */}
      <section className="payment-card">

        <h3>Payment History</h3>

        {recordedPayments.length === 0 ? (
          <p className="payment-note">
            No recorded payments for this booking.
          </p>
        ) : (
          <div className="payment-history-list">

            {recordedPayments.map((payment) => (
              <div
                className="payment-history-row"
                key={payment.id}
              >
                <div>
                  <strong>{payment.method}</strong>

                  <span>
                    {payment.reference || "No reference"} ·{" "}
                    {payment.paidAt
                      ? new Date(payment.paidAt).toLocaleString("en-IN")
                      : "Date unavailable"}
                  </span>
                </div>

                <strong>{money(payment.amount)}</strong>
              </div>
            ))}

          </div>
        )}

      </section>

      {/* Back Button */}
      <button
        type="button"
        className="payment-back-button"
        onClick={() => navigate("/billing")}
      >
        Back to Billing
      </button>

    </main>
  );
}