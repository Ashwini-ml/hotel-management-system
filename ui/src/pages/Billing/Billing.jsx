import React, { useEffect, useState } from "react";
import api from "../../services/Services.jsx";
import "./Billing.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const defaultSettings = {
  hotelName: "Grand Horizon Hotel",
  email: "",
  phone: "",
  address: "",
  currency: "INR",
  gst: 18,
  invoicePrefix: "GH",
};

function Billing() {
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState("");
  const [bill, setBill] = useState(null);

  const [hotelSettings, setHotelSettings] = useState(defaultSettings);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listLoading, setListLoading] = useState(true);

  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  
  useEffect(() => {
    let active = true;

    async function loadHotelSettings() {
      try {
        const response = await api.get("/Settings");

        if (active) {
          setHotelSettings({
            ...defaultSettings,
            ...response.data,
          });
        }
      } catch (err) {
        console.error(
          "Could not load hotel settings:",
          err.response?.data || err.message
        );
      }
    }

    loadHotelSettings();

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    let active = true;

    async function loadBookings() {
      setListLoading(true);
      setError("");

      try {
        const response = await api.get("/CheckOut");

        const items = Array.isArray(response.data)
          ? response.data
          : [];

        if (!active) return;

        setBookings(items);

        setBookingId((current) => {
          if (
            current &&
            items.some((booking) => String(booking.id) === current)
          ) {
            return current;
          }

          return items.length ? String(items[0].id) : "";
        });
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load bookings. Check that the backend is running."
          );
        }
      } finally {
        if (active) setListLoading(false);
      }
    }

    loadBookings();

    return () => {
      active = false;
    };
  }, []);

  
  useEffect(() => {
    if (!bookingId) {
      setBill(null);
      return;
    }

    let active = true;

    async function loadBill() {
      setLoading(true);
      setError("");
      setBill(null);

      try {
        const response = await api.get(`/CheckOut/${bookingId}`);

        if (active) {
          setBill(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load this booking's invoice."
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

  
  const selectedBooking = bookings.find(
    (item) => String(item.id) === String(bookingId)
  );

  
  const filteredBookings = bookings.filter((item) => {
    const search = dropdownSearch.toLowerCase().trim();

    const guest = item.guest?.fullName || "";
    const room = item.room?.roomNumber || "";

    return (
      guest.toLowerCase().includes(search) ||
      String(item.id).includes(search) ||
      String(room).toLowerCase().includes(search)
    );
  });

  
  const getInitials = (name) => {
    return (name || "Guest")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Format money
  const money = (value) => {
    const currency = hotelSettings.currency || "INR";

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value) || 0);
    } catch {
      return `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const booking = bill?.booking;
  const charges = bill?.additionalCharges || [];
  const payments = bill?.payments || [];

  const guestName = booking?.guest?.fullName || "Guest";
  const roomNumber = booking?.room?.roomNumber || "—";
  const bookingStatus = booking?.status || "—";

  const roomCharges = Number(bill?.roomCharges || 0);
  const additionalTotal = Number(bill?.additionalTotal || 0);

  const subtotal = roomCharges + additionalTotal;

  const gstPercentage = Math.max(
    0,
    Number(hotelSettings.gst ?? 18) || 0
  );

  const gstAmount = subtotal * (gstPercentage / 100);
  const invoiceTotal = subtotal + gstAmount;

  const amountReceived = Number(bill?.amountReceived || 0);
  const pendingAmount = Math.max(0, invoiceTotal - amountReceived);

  const invoiceReference =
    `${hotelSettings.invoicePrefix || "GH"}-${booking?.id ?? ""}`;

  return (
    <main className="billing-page">

      {/* Header */}
      <header className="billing-header no-print">
        <div>
          <span className="billing-eyebrow">
            FINANCE &amp; ACCOUNTS
          </span>

          <h1>Billing &amp; Invoices</h1>

          <p>
            Review stay charges, payments and guest balances.
          </p>
        </div>

        <button
          className="billing-print-button"
          type="button"
          onClick={() => window.print()}
          disabled={!bill || loading}
        >
          Print Invoice
        </button>
      </header>

      {/* Searchable Booking Dropdown */}
      <section className="billing-selector no-print">
        <div className="ci-booking-dropdown payment-guest-dropdown">

          <label className="ci-booking-label">
            Select Booking
          </label>

          <button
            type="button"
            className="ci-booking-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={listLoading || bookings.length === 0}
          >
            {selectedBooking ? (
              <div className="ci-trigger-left">
                <div className="ci-guest-avatar">
                  {getInitials(
                    selectedBooking.guest?.fullName
                  )}
                </div>

                <div className="ci-trigger-text">
                  <strong>
                    {selectedBooking.guest?.fullName || "Guest"}
                  </strong>

                  <span>
                    Booking #{selectedBooking.id}
                    {" · "}
                    Room {selectedBooking.room?.roomNumber || "—"}
                  </span>
                </div>
              </div>
            ) : (
              <span>
                {listLoading
                  ? "Loading bookings..."
                  : "No bookings available"}
              </span>
            )}

            <span className="ci-trigger-arrow">
              {dropdownOpen ? "▲" : "▼"}
            </span>
          </button>

          {dropdownOpen && (
            <div className="ci-booking-menu">

              <input
                type="text"
                className="ci-menu-search"
                placeholder="Search guest, booking ID or room..."
                value={dropdownSearch}
                onChange={(event) =>
                  setDropdownSearch(event.target.value)
                }
                autoFocus
              />

              <div className="ci-menu-heading">
                Available Bookings ({filteredBookings.length})
              </div>

              <div className="ci-booking-options">

                {filteredBookings.length === 0 ? (
                  <div className="ci-no-bookings">
                    No matching bookings found.
                  </div>
                ) : (
                  filteredBookings.map((item) => {
                    const isSelected =
                      String(item.id) === String(bookingId);

                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`ci-booking-option ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => {
                          setBookingId(String(item.id));
                          setDropdownOpen(false);
                          setDropdownSearch("");
                        }}
                      >
                        <div className="ci-guest-avatar">
                          {getInitials(
                            item.guest?.fullName
                          )}
                        </div>

                        <div className="ci-guest-info">
                          <strong>
                            {item.guest?.fullName || "Guest"}
                          </strong>

                          <span>
                            Booking #{item.id}
                            {" · "}
                            Room {item.room?.roomNumber || "—"}
                          </span>
                        </div>

                        <span className="ci-option-status">
                          {item.status || "—"}
                        </span>

                        {isSelected && (
                          <span className="ci-option-tick">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })
                )}

              </div>
            </div>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="billing-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="billing-message">
          Loading invoice details...
        </div>
      )}

      {!loading && !error && !bill && !listLoading && (
        <div className="billing-message">
          No booking selected. Create a booking or check in a guest first.
        </div>
      )}

      {/* Invoice */}
      {!loading && bill && booking && (
        <div className="invoice-sheet">

          <div className="invoice-top">
            <div className="invoice-brand">

              <div className="invoice-logo">
                {(hotelSettings.invoicePrefix || "GH").slice(0, 3)}
              </div>

              <div>
                <h2>{hotelSettings.hotelName}</h2>

                <p>Guest Folio &amp; Invoice</p>

                {hotelSettings.address && (
                  <p>{hotelSettings.address}</p>
                )}

                {hotelSettings.email && (
                  <p>{hotelSettings.email}</p>
                )}

                {hotelSettings.phone && (
                  <p>{hotelSettings.phone}</p>
                )}
              </div>
            </div>

            <div className="invoice-number">
              <span>INVOICE REFERENCE</span>
              <strong>{invoiceReference}</strong>
              <span className="invoice-status">
                {bookingStatus}
              </span>
            </div>
          </div>

          <div className="invoice-divider" />

          {/* Guest and Stay Details */}
          <section className="invoice-details">

            <div>
              <span className="invoice-label">GUEST</span>

              <h3>{guestName}</h3>

              <p>
                {booking.guest?.email || "Email not available"}
              </p>

              <p>
                {booking.guest?.phone || "Phone not available"}
              </p>
            </div>

            <div>
              <span className="invoice-label">STAY DETAILS</span>

              <p>
                <strong>Room:</strong> {roomNumber}
              </p>

              <p>
                <strong>Check-in:</strong>{" "}
                {formatDate(booking.checkInDate)}
              </p>

              <p>
                <strong>Check-out:</strong>{" "}
                {formatDate(booking.checkOutDate)}
              </p>

              <p>
                <strong>Nights:</strong> {bill.nights ?? 0}
              </p>
            </div>

          </section>

          {/* Itemized Charges */}
          <section className="invoice-table-section">
            <h3>Itemized Charges</h3>

            <div className="billing-table-wrap">
              <table className="billing-table">

                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th className="number-cell">Qty</th>
                    <th className="number-cell">Rate</th>
                    <th className="number-cell">Amount</th>
                  </tr>
                </thead>

                <tbody>

                  <tr>
                    <td>
                      <strong>Room charges</strong>

                      <small>
                        {bill.nights ?? 0} night(s) ×{" "}
                        {money(booking.nightlyRate)}
                      </small>
                    </td>

                    <td>
                      {formatDate(booking.checkInDate)}
                    </td>

                    <td className="number-cell">
                      {bill.nights ?? 0}
                    </td>

                    <td className="number-cell">
                      {money(booking.nightlyRate)}
                    </td>

                    <td className="number-cell">
                      {money(roomCharges)}
                    </td>
                  </tr>

                  {charges.map((charge) => (
                    <tr key={charge.id}>
                      <td>
                        <strong>{charge.description}</strong>
                      </td>

                      <td>
                        {formatDate(
                          charge.chargeDate || charge.createdAt
                        )}
                      </td>

                      <td className="number-cell">
                        {charge.quantity ?? 1}
                      </td>

                      <td className="number-cell">
                        {money(
                          charge.unitAmount ?? charge.amount
                        )}
                      </td>

                      <td className="number-cell">
                        {money(charge.amount)}
                      </td>
                    </tr>
                  ))}

                  {charges.length === 0 && (
                    <tr>
                      <td colSpan="5" className="billing-empty-row">
                        No additional charges recorded.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </section>

          {/* Payments and Totals */}
          <section className="invoice-bottom">

            <div className="payment-section">
              <h3>Payments Received</h3>

              {payments.length === 0 ? (
                <p className="invoice-muted">
                  No payments recorded.
                </p>
              ) : (
                <div className="billing-table-wrap">
                  <table className="billing-table payment-table">

                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th className="number-cell">Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.paidAt)}</td>

                          <td>{payment.method}</td>

                          <td>{payment.reference || "—"}</td>

                          <td className="number-cell">
                            {money(
                              payment.status === "Recorded"
                                ? payment.amount
                                : 0
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}
            </div>

            <div className="invoice-totals">

              <div>
                <span>Room charges</span>
                <strong>{money(roomCharges)}</strong>
              </div>

              <div>
                <span>Additional charges</span>
                <strong>{money(additionalTotal)}</strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>

              <div>
                <span>GST ({gstPercentage}%)</span>
                <strong>{money(gstAmount)}</strong>
              </div>

              <div className="invoice-total-line">
                <span>Total bill</span>
                <strong>{money(invoiceTotal)}</strong>
              </div>

              <div className="invoice-paid-line">
                <span>Amount received</span>
                <strong>{money(amountReceived)}</strong>
              </div>

              <div className="invoice-pending-line">
                <span>Balance pending</span>
                <strong>{money(pendingAmount)}</strong>
              </div>

            </div>
          </section>

          {/* Footer */}
          <footer className="invoice-footer">
            <p>
              Thank you for staying at {hotelSettings.hotelName}.
            </p>

            <span>
              We hope to welcome you again.
            </span>
          </footer>

          {/* Actions */}
          <div className="invoice-actions no-print">

            <button
              type="button"
              className="billing-secondary-button"
              onClick={() => window.history.back()}
            >
              Back
            </button>

            <button
              type="button"
              className="billing-print-button"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>

          </div>

        </div>
      )}
    </main>
  );
}

export default Billing;