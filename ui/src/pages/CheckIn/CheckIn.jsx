import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import "./CheckIn.css";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dateOnly = (value) => value ? String(value).slice(0, 10) : "";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const guestOf = (booking) => booking?.guest || {};
const roomOf = (booking) => booking?.room || {};

function guestName(booking) {
  const guest = guestOf(booking);
  return (
    guest.fullName ||
    [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
    booking?.guestName ||
    "Guest"
  );
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const difference =
    new Date(`${checkOut}T00:00:00`) -
    new Date(`${checkIn}T00:00:00`);
  return Math.max(1, Math.ceil(difference / 86400000));
}

export default function CheckIn() {
  const [bookings, setBookings] = useState([]);
  const [selectedId, setSelectedId] = useState("");
const [search, setSearch] = useState("");

const [dropdownOpen, setDropdownOpen] = useState(false);
const [dropdownSearch, setDropdownSearch] = useState("");

  const [activeTab, setActiveTab] = useState("checkin");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState("");
const [checkoutBookings, setCheckoutBookings] = useState([]);
const [checkoutId, setCheckoutId] = useState("");
const [checkoutBilling, setCheckoutBilling] = useState(null);
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [checkoutDropdownOpen, setCheckoutDropdownOpen] = useState(false);
const [checkoutDropdownSearch, setCheckoutDropdownSearch] = useState("");

const [chargeForm, setChargeForm] = useState({
  description: "",
  quantity: 1,
  unitAmount: "",
});

const [paymentForm, setPaymentForm] = useState({
  amount: "",
  method: "Cash",
  reference: "",
  remarks: "",
});

  const [guestForm, setGuestForm] = useState({
    title: "Mr.",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Indian",
    idProofType: "",
    idProofNumber: "",
    address: "",
  });

  const [form, setForm] = useState({
    checkInDate: today(),
    checkInTime: new Date().toTimeString().slice(0, 5),
    checkOutDate: "",
    guestsCount: 1,
    paymentMode: "Cash",
    advanceAmount: "0",
    paymentReference: "",
    extras: "0",
    discount: "0",
    sendConfirmation: false,
  });
  
  async function loadBookings() {
  setLoading(true);
  setError("");

  try {
    const response = await api.get("/CheckIn");
    const data = response.data;

    const rows = Array.isArray(data)
      ? data
      : data?.bookings || data?.data || [];

    setBookings(rows);

    setSelectedId((current) => {
      if (rows.some((item) => String(item.id) === String(current))) {
        return current;
      }

      return rows.length ? String(rows[0].id) : "";
    });
  } catch (err) {
    console.error("Could not load check-in bookings:", err);

    setError(
      err.response?.data?.message ||
      "Could not load eligible bookings. Check that the backend is running."
    );
  } finally {
    setLoading(false);
  }
}

async function loadCheckoutBookings() {
  setCheckoutLoading(true);
  setError("");

  try {
    const response = await api.get("/CheckOut");
    const data = response.data;

    const rows = Array.isArray(data)
      ? data
      : data?.bookings || data?.data || [];

    const checkedIn = rows.filter(
      (item) =>
        String(item.status || "").toLowerCase() === "checkedin"
    );

    setCheckoutBookings(checkedIn);

    setCheckoutId((current) => {
      if (checkedIn.some((item) => String(item.id) === String(current))) {
        return current;
      }

      return checkedIn.length ? String(checkedIn[0].id) : "";
    });
  } catch (err) {
    console.error("Could not load check-out bookings:", err);
    setError(
      err.response?.data?.message ||
      "Could not load checked-in bookings."
    );
  } finally {
    setCheckoutLoading(false);
  }
}

async function loadCheckoutBilling(id) {
  if (!id) {
    setCheckoutBilling(null);
    return;
  }

  setCheckoutLoading(true);
  setError("");

  try {
    const response = await api.get(`/CheckOut/${id}`);
    setCheckoutBilling(response.data);
  } catch (err) {
    console.error("Could not load billing:", err);
    setCheckoutBilling(null);
    setError(
      err.response?.data?.message ||
      "Could not load guest billing details."
    );
  } finally {
    setCheckoutLoading(false);
  }
}

useEffect(() => {
  if (activeTab === "checkout") {
    loadCheckoutBookings();
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === "checkout" && checkoutId) {
    loadCheckoutBilling(checkoutId);
  } else {
    setCheckoutBilling(null);
  }
}, [activeTab, checkoutId]);

async function addCheckoutCharge(event) {
  event.preventDefault();
  setError("");
  setMessage("");

  if (!chargeForm.description.trim() || Number(chargeForm.unitAmount) <= 0) {
    setError("Enter a charge description and a valid amount.");
    return;
  }

  try {
    setBusy(true);

    await api.post(`/CheckOut/${checkoutId}/charges`, {
      description: chargeForm.description,
      quantity: Number(chargeForm.quantity),
      unitAmount: Number(chargeForm.unitAmount),
    });

    setChargeForm({
      description: "",
      quantity: 1,
      unitAmount: "",
    });

    setMessage("Additional charge added successfully.");
    await loadCheckoutBilling(checkoutId);
  } catch (err) {
    setError(
      err.response?.data?.message || "Could not add the charge."
    );
  } finally {
    setBusy(false);
  }
}

async function addCheckoutPayment(event) {
  event.preventDefault();
  setError("");
  setMessage("");

  if (Number(paymentForm.amount) <= 0) {
    setError("Enter a valid payment amount.");
    return;
  }

  try {
    setBusy(true);

    await api.post(`/CheckOut/${checkoutId}/payments`, {
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      reference: paymentForm.reference,
      remarks: paymentForm.remarks,
    });

    setPaymentForm({
      amount: "",
      method: "Cash",
      reference: "",
      remarks: "",
    });

    setMessage("Payment recorded successfully.");
    await loadCheckoutBilling(checkoutId);
  } catch (err) {
    setError(
      err.response?.data?.message || "Could not record payment."
    );
  } finally {
    setBusy(false);
  }
}

async function completeCheckout() {
  if (!checkoutId) {
    setError("Please select a checked-in guest.");
    return;
  }

  if (!window.confirm("Are you sure you want to complete check-out?")) {
    return;
  }

  setError("");
  setMessage("");

  try {
    setBusy(true);

    const response = await api.post(`/CheckOut/${checkoutId}`);

    setMessage(
      response.data?.message || "Check-out completed successfully."
    );

    setCheckoutBilling(null);
    await loadCheckoutBookings();
  } catch (err) {
    console.error("Check-out failed:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.title ||
      "Check-out failed. Please check the outstanding balance."
    );

    await loadCheckoutBilling(checkoutId);
  } finally {
    setBusy(false);
  }
}

  useEffect(() => {
    loadBookings();
  }, []);

  const selectedBooking = bookings.find(
    (booking) => String(booking.id) === String(selectedId)
  );

  const guest = guestOf(selectedBooking);
  const room = roomOf(selectedBooking);

  const roomNumber =
    room.roomNumber || selectedBooking?.roomNumber || "—";

  const roomType =
    room.roomType?.name ||
    room.roomTypeName ||
    selectedBooking?.roomTypeName ||
    "—";

  const rate = Number(
    selectedBooking?.nightlyRate ??
    room.roomType?.baseRate ??
    room.baseRate ??
    0
  );

  const nights = calculateNights(
    dateOnly(selectedBooking?.checkInDate),
    dateOnly(selectedBooking?.checkOutDate)
  );

  const roomCharges = nights * rate;
  const extras = Math.max(0, Number(form.extras) || 0);
  const discount = Math.max(0, Number(form.discount) || 0);
  const advance = Math.max(0, Number(form.advanceAmount) || 0);
  const total = Math.max(0, roomCharges + extras - discount);
  const balance = Math.max(0, total - advance);

  useEffect(() => {
    if (!selectedBooking) return;

    const name = guestName(selectedBooking);
    const parts = name === "Guest" ? [] : name.split(" ");

    setGuestForm({
      title: "Mr.",
      firstName: guest.firstName || parts[0] || "",
      lastName: guest.lastName || parts.slice(1).join(" ") || "",
      phone: guest.phone || "",
      email: guest.email || "",
      dateOfBirth: dateOnly(guest.dateOfBirth),
      gender: guest.gender || "",
      nationality: guest.nationality || "Indian",
      idProofType:
  guest.idProofType ||
  guest.identificationType ||
  selectedBooking.idProofType ||
  selectedBooking.identificationType ||
  "",

idProofNumber:
  guest.idProofNumber ||
  guest.identificationNumber ||
  selectedBooking.idProofNumber ||
  selectedBooking.identificationNumber ||
  "",
      address: guest.address || "",
    });

    setForm((current) => ({
  ...current,
  checkInDate: dateOnly(selectedBooking.checkInDate),
  checkOutDate: dateOnly(selectedBooking.checkOutDate),
  guestsCount: Number(selectedBooking.guestsCount || 1),
}));

    setNotes("");
    setIdFile(null);
    setIdPreview("");
  }, [selectedId]);

  const visibleBookings = useMemo(() => {
    let rows = bookings;

    if (activeTab === "arrivals") {
      rows = rows.filter((booking) =>
        ["confirmed", "pending"].includes(
          String(booking.status || "").toLowerCase()
        )
      );
    }

    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((booking) =>
      [
        booking.id,
        guestName(booking),
        roomOf(booking).roomNumber,
        booking.roomNumber,
        guestOf(booking).phone,
        guestOf(booking).email,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [bookings, search, activeTab]);
  const filteredCheckoutBookings = useMemo(() => {
  const searchText = checkoutDropdownSearch.toLowerCase().trim();

  return checkoutBookings.filter((booking) => {
    const name = guestName(booking).toLowerCase();
    const room = String(
      roomOf(booking).roomNumber || booking.roomNumber || ""
    ).toLowerCase();
    const id = String(booking.id || "");

    return (
      name.includes(searchText) ||
      room.includes(searchText) ||
      id.includes(searchText)
    );
  });
}, [checkoutBookings, checkoutDropdownSearch]);

  const filteredDropdownBookings = useMemo(() => {
  const term = dropdownSearch.trim().toLowerCase();

  if (!term) return visibleBookings;

  return visibleBookings.filter((booking) => {
    const name = guestName(booking).toLowerCase();

    const roomNo = String(
      roomOf(booking).roomNumber ||
      booking.roomNumber ||
      ""
    ).toLowerCase();

    const bookingNo = String(booking.id || "").toLowerCase();

    return (
      name.includes(term) ||
      roomNo.includes(term) ||
      bookingNo.includes(term)
    );
  });
}, [visibleBookings, dropdownSearch]);

  function updateGuest(event) {
    const { name, value } = event.target;
    setGuestForm((current) => ({ ...current, [name]: value }));
  }

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleIdFile(event) {
    const file = event.target.files?.[0];
    setIdFile(null);
    setIdPreview("");
    setError("");

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Select a JPG, PNG, or PDF document.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The ID document must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIdFile(file);

    if (file.type.startsWith("image/")) {
      setIdPreview(URL.createObjectURL(file));
    }
  }

 async function completeCheckIn(event) {
  event.preventDefault();
  setError("");
  setMessage("");

  if (!selectedBooking) {
    setError("Please select a booking.");
    return;
  }

  if (
    !form.checkInDate ||
    !form.checkOutDate ||
    form.checkOutDate <= form.checkInDate
  ) {
    setError("Check-out date must be after check-in date.");
    return;
  }

  if (Number(form.guestsCount) < 1) {
    setError("The number of guests must be at least one.");
    return;
  }

  if (extras < 0 || advance < 0) {
    setError("Extra charges and advance cannot be negative.");
    return;
  }

  if (advance > total) {
    setError("Advance amount cannot exceed the estimated total.");
    return;
  }

  setBusy(true);

  try {
    const response = await api.post(
      `/CheckIn/${selectedBooking.id}`,
      {
        notes,
        extras: Number(form.extras) || 0,
        extrasDescription: "Extra stay charges",
        advanceAmount: Number(form.advanceAmount) || 0,
        paymentMode: form.paymentMode,
        paymentReference: form.paymentReference || null
      }
    );

    setMessage(
      response.data?.message ||
      "Check-in completed successfully."
    );

    await loadBookings();
  } catch (err) {
    console.error("Check-in failed:", err);

    setError(
      err.response?.data?.message ||
      "Check-in failed."
    );
  } finally {
    setBusy(false);
  }
}

  const confirmedCount = bookings.filter(
    (b) => String(b.status).toLowerCase() === "confirmed"
  ).length;

  const inHouseCount = bookings.filter(
    (b) => ["checkedin", "occupied"].includes(
      String(b.status).toLowerCase()
    )
  ).length;

  const departureCount = bookings.filter(
    (b) =>
      dateOnly(b.checkOutDate) === today() &&
      ["checkedin", "occupied"].includes(
        String(b.status).toLowerCase()
      )
  ).length;

  return (
    <main className="checkin-page">
      <header className="ci-page-header">
        <div>
          <span className="ci-eyebrow">FRONT OFFICE MANAGEMENT</span>
          <h1>Guest Check-in</h1>
          <p>Manage reservations, arrivals and guest registration.</p>
        </div>
        <button
          type="button"
          className="ci-button ci-secondary"
          onClick={loadBookings}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </header>

      <nav className="ci-tabs">
        <button
          type="button"
          className={activeTab === "checkin" ? "active" : ""}
          onClick={() => setActiveTab("checkin")}
        >
          Check-in
        </button>
        <button
          type="button"
          className={activeTab === "checkout" ? "active" : ""}
          onClick={() => setActiveTab("checkout")}
        >
          Check-out
        </button>
        <button
          type="button"
          className={activeTab === "arrivals" ? "active" : ""}
          onClick={() => setActiveTab("arrivals")}
        >
          Expected Arrivals
        </button>
      </nav>

      {message && <div className="ci-alert ci-success" role="status">{message}</div>}
      {error && <div className="ci-alert ci-error" role="alert">{error}</div>}

      <section className="ci-stats">
        <article className="ci-stat">
          <span>Expected Arrivals</span>
          <strong>{confirmedCount}</strong>
          <small>Confirmed reservations</small>
        </article>
        <article className="ci-stat">
          <span>In-house Guests</span>
          <strong>{inHouseCount}</strong>
          <small>Currently checked in</small>
        </article>
        <article className="ci-stat">
          <span>Today's Departures</span>
          <strong>{departureCount}</strong>
          <small>Scheduled to check out today</small>
        </article>
      </section>
{activeTab === "checkout" ? (
  <div className="ci-checkout-container">
    <section className="ci-panel">
      <div className="ci-panel-heading">
        <div>
          <span className="ci-eyebrow">FRONT OFFICE</span>
          <h2>Check-out Management</h2>
        </div>

        <button
          type="button"
          className="ci-button ci-secondary"
          onClick={loadCheckoutBookings}
          disabled={checkoutLoading}
        >
          ↻ Refresh
        </button>
      </div>
<div className="ci-booking-dropdown">
  <label className="ci-booking-label">
    Select checked-in guest
  </label>

  <button
    type="button"
    className="ci-booking-trigger"
    onClick={() =>
      setCheckoutDropdownOpen(!checkoutDropdownOpen)
    }
  >
    <span className="ci-trigger-left">
      <span className="ci-guest-avatar">
        {checkoutId
          ? guestName(
              checkoutBookings.find(
                (b) => String(b.id) === String(checkoutId)
              ) || {}
            ).charAt(0).toUpperCase()
          : "G"}
      </span>

      <span className="ci-trigger-text">
        {checkoutId
          ? guestName(
              checkoutBookings.find(
                (b) => String(b.id) === String(checkoutId)
              ) || {}
            )
          : "Select a checked-in guest"}
      </span>
    </span>

    <span className="ci-trigger-arrow">
      {checkoutDropdownOpen ? "▲" : "▼"}
    </span>
  </button>

  {checkoutDropdownOpen && (
    <div className="ci-booking-menu">
      <input
        type="text"
        className="ci-menu-search"
        placeholder="Search guest, room or booking ID..."
        value={checkoutDropdownSearch}
        onChange={(e) =>
          setCheckoutDropdownSearch(e.target.value)
        }
      />

      <div className="ci-menu-heading">
        Checked-in guests ({filteredCheckoutBookings.length})
      </div>

      <div className="ci-booking-options">
        {filteredCheckoutBookings.length > 0 ? (
          filteredCheckoutBookings.map((booking) => (
            <button
              type="button"
              key={booking.id}
              className="ci-booking-option"
              onClick={() => {
                setCheckoutId(String(booking.id));
                setCheckoutDropdownOpen(false);
                setCheckoutDropdownSearch("");
              }}
            >
              <span className="ci-guest-avatar">
                {guestName(booking).charAt(0).toUpperCase()}
              </span>

              <span className="ci-guest-info">
                <strong>{guestName(booking)}</strong>
                <small>
                  Booking #{booking.id} · Room{" "}
                  {roomOf(booking).roomNumber ||
                    booking.roomNumber ||
                    "—"}
                </small>
              </span>

              <span className="ci-option-status">
                Checked-in
              </span>

              {String(checkoutId) === String(booking.id) && (
                <span className="ci-option-tick">✓</span>
              )}
            </button>
          ))
        ) : (
          <div className="ci-no-bookings">
            No checked-in guests found.
          </div>
        )}
      </div>
    </div>
  )}
</div>

      {checkoutLoading && (
        <p className="ci-muted">Loading check-out information...</p>
      )}

      {!checkoutLoading && checkoutBookings.length === 0 && (
        <p className="ci-muted">
          No checked-in guests are currently available for check-out.
        </p>
      )}
    </section>

    {checkoutBilling && (
      <>
        <section className="ci-panel">
          <div className="ci-panel-heading">
            <h2>Guest Billing Summary</h2>
          </div>

          <div className="ci-detail-list">
            <div>
              <span>Booking ID</span>
              <strong>#{checkoutBilling.booking?.id || checkoutId}</strong>
            </div>

            <div>
              <span>Guest</span>
              <strong>
                {guestName(checkoutBilling.booking || {})}
              </strong>
            </div>

            <div>
              <span>Room</span>
              <strong>
                {roomOf(checkoutBilling.booking).roomNumber ||
                  checkoutBilling.booking?.roomNumber || "—"}
              </strong>
            </div>

            <div>
              <span>Stay nights</span>
              <strong>{checkoutBilling.nights ?? 0}</strong>
            </div>

            <div>
              <span>Room charges</span>
              <strong>{money(checkoutBilling.roomCharges)}</strong>
            </div>

            <div>
              <span>Additional charges</span>
              <strong>{money(checkoutBilling.additionalTotal)}</strong>
            </div>

            <div>
              <span>Subtotal</span>
              <strong>{money(checkoutBilling.subtotal)}</strong>
            </div>

            <div>
              <span>GST ({checkoutBilling.gstPercentage ?? 0}%)</span>
              <strong>{money(checkoutBilling.gstAmount)}</strong>
            </div>

            <div>
              <span>Total amount</span>
              <strong>{money(checkoutBilling.totalAmount)}</strong>
            </div>

            <div>
              <span>Amount received</span>
              <strong>{money(checkoutBilling.amountReceived)}</strong>
            </div>

            <div>
              <span>Pending amount</span>
              <strong>{money(checkoutBilling.pendingAmount)}</strong>
            </div>
          </div>
        </section>

        <div className="ci-two-columns">
          <section className="ci-panel">
            <h2>Add Additional Charge</h2>

            <form onSubmit={addCheckoutCharge} className="ci-form-grid">
              <label className="ci-full">
                Description
                <input
                  value={chargeForm.description}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Food, laundry, minibar..."
                  required
                />
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={chargeForm.quantity}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      quantity: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Unit amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={chargeForm.unitAmount}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      unitAmount: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <button
                className="ci-button ci-primary ci-full"
                type="submit"
                disabled={busy}
              >
                Add Charge
              </button>
            </form>
          </section>

          <section className="ci-panel">
            <h2>Record Payment</h2>

            <form onSubmit={addCheckoutPayment} className="ci-form-grid">
              <label className="ci-full">
                Payment amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Payment method
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: event.target.value,
                    })
                  }
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </label>

              <label>
                Reference
                <input
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: event.target.value,
                    })
                  }
                  placeholder="Transaction ID"
                />
              </label>

              <label className="ci-full">
                Remarks
                <input
                  value={paymentForm.remarks}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      remarks: event.target.value,
                    })
                  }
                  placeholder="Payment notes"
                />
              </label>

              <button
                className="ci-button ci-primary ci-full"
                type="submit"
                disabled={busy}
              >
                Record Payment
              </button>
            </form>
          </section>
        </div>

        <section className="ci-panel">
          <h2>Additional Charges</h2>

          {checkoutBilling.additionalCharges?.length ? (
            <div className="ci-detail-list">
              {checkoutBilling.additionalCharges.map((charge) => (
                <div key={charge.id}>
                  <span>
                    {charge.description} × {charge.quantity}
                  </span>
                  <strong>
                    {money(
                      Number(charge.quantity) * Number(charge.unitAmount)
                    )}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="ci-muted">No additional charges recorded.</p>
          )}
        </section>

        <section className="ci-panel">
          <h2>Payment History</h2>

          {checkoutBilling.payments?.length ? (
            <div className="ci-detail-list">
              {checkoutBilling.payments.map((payment) => (
                <div key={payment.id}>
                  <span>
                    {payment.method} · {payment.reference || "No reference"}
                  </span>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="ci-muted">No payments recorded yet.</p>
          )}
        </section>

        <section className="ci-confirm-bar">
          <div>
            <strong>Complete Guest Check-out</strong>
            <p>
              Outstanding balance:{" "}
              {money(checkoutBilling.pendingAmount)}
            </p>
          </div>

          <button
            type="button"
            className="ci-button ci-primary"
            onClick={completeCheckout}
            disabled={
              busy ||
              Number(checkoutBilling.pendingAmount || 0) > 0.01
            }
          >
            {busy ? "Processing..." : "✓ Complete Check-out"}
          </button>
        </section>
      </>
    )}
  </div>
) : (
        <>
         <section className="ci-panel ci-picker">
  <div className="ci-panel-heading">
    <div>
      <span className="ci-eyebrow">RESERVATIONS</span>
      <h2>
        {activeTab === "arrivals"
          ? "Expected Arrivals"
          : "Select a Booking"}
      </h2>
    </div>

    <span className="ci-count">
      {visibleBookings.length} bookings
    </span>
  </div>

  <div className="ci-booking-dropdown">
  <label className="ci-booking-label">
    Select Guest Booking
  </label>

  <button
    type="button"
    className={`ci-booking-trigger ${dropdownOpen ? "open" : ""}`}
    onClick={() => setDropdownOpen((previous) => !previous)}
    disabled={loading || visibleBookings.length === 0}
  >
    <span className="ci-trigger-left">
      <span className="ci-trigger-icon">♙</span>

      <span className="ci-trigger-text">
        {selectedBooking ? (
          <>
            <strong>{guestName(selectedBooking)}</strong>
            <small>
              Booking #{selectedBooking.id} · Room {roomNumber}
            </small>
          </>
        ) : (
          <>
            <strong>Select a guest booking</strong>
            <small>Choose a reservation to continue check-in</small>
          </>
        )}
      </span>
    </span>

    <span className="ci-trigger-arrow">
      {dropdownOpen ? "⌃" : "⌄"}
    </span>
  </button>

  {dropdownOpen && (
    <div className="ci-booking-menu">
      <div className="ci-menu-search">
        <span>⌕</span>

        <input
          type="text"
          placeholder="Search guest, room or booking ID..."
          value={dropdownSearch}
          onChange={(event) => setDropdownSearch(event.target.value)}
          autoFocus
        />
      </div>

      <div className="ci-menu-heading">
        <span>AVAILABLE BOOKINGS</span>
        <small>{filteredDropdownBookings.length} results</small>
      </div>

      <div className="ci-booking-options">
        {filteredDropdownBookings.length > 0 ? (
          filteredDropdownBookings.map((booking) => {
            const id = String(booking.id);
            const bookingGuest = guestOf(booking);
            const bookingRoom = roomOf(booking);

            const number =
              bookingRoom.roomNumber ||
              booking.roomNumber ||
              "—";

            const status = booking.status || "Confirmed";

            const isSelected = id === String(selectedId);

            return (
              <button
                type="button"
                key={id}
                className={`ci-booking-option ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedId(id);
                  setDropdownOpen(false);
                  setDropdownSearch("");
                }}
              >
                <span className="ci-guest-avatar">
                  {guestName(booking).charAt(0).toUpperCase()}
                </span>

                <span className="ci-guest-info">
                  <strong>{guestName(booking)}</strong>

                  <span className="ci-guest-booking">
                    Booking #{id}
                  </span>

                  <span className="ci-guest-meta">
                    Room {number}
                    <span>·</span>
                    {dateOnly(booking.checkInDate) || "Date unavailable"}
                  </span>
                </span>

                <span className="ci-option-right">
                  <span className="ci-option-status">
                    {status}
                  </span>

                  {isSelected && (
                    <span className="ci-option-tick">✓</span>
                  )}
                </span>
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

  {loading && (
    <p className="ci-muted">Loading bookings...</p>
  )}

  {!loading && visibleBookings.length === 0 && (
    <p className="ci-muted">
      No eligible bookings found.
    </p>
  )}

  {selectedBooking && (
    <div className="ci-selected-booking">
      <strong>{guestName(selectedBooking)}</strong>
      <span>
        Booking #{selectedBooking.id} · Room {roomNumber}
      </span>
      <small>
        Check-in: {dateOnly(selectedBooking.checkInDate)}
        {" · "}
        Check-out: {dateOnly(selectedBooking.checkOutDate)}
      </small>
    </div>
  )}
</section>

          {selectedBooking && (
            <form onSubmit={completeCheckIn}>
              <div className="ci-three-columns">
                <section className="ci-panel">
                  <div className="ci-panel-heading">
                    <div><span className="ci-number">01</span><h2>Booking Details</h2></div>
                  </div>
                  <div className="ci-detail-list">
                    <div><span>Booking ID</span><strong>#{selectedBooking.id}</strong></div>
                    <div><span>Guest</span><strong>{guestName(selectedBooking)}</strong></div>
                    <div><span>Room type</span><strong>{roomType}</strong></div>
                    <div><span>Room number</span><strong>{roomNumber}</strong></div>
                    <div><span>Arrival date</span><strong>{dateOnly(selectedBooking.checkInDate) || "—"}</strong></div>
                    <div><span>Departure date</span><strong>{dateOnly(selectedBooking.checkOutDate) || "—"}</strong></div>
                    <div><span>Guests</span><strong>{selectedBooking.guestsCount || 1}</strong></div>
                    <div><span>Source</span><strong>{selectedBooking.source || "Direct"}</strong></div>
                    <div><span>Status</span><strong className="ci-status">{selectedBooking.status || "Confirmed"}</strong></div>
                  </div>
                </section>

                <section className="ci-panel">
                  <div className="ci-panel-heading">
                    <div><span className="ci-number">02</span><h2>Guest Details</h2></div>
                  </div>
                  <div className="ci-form-grid">
                    <label>Title
                      <select name="title" value={guestForm.title} onChange={updateGuest}>
                        <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option><option>Mx.</option>
                      </select>
                    </label>
                    <label>First name
                      <input name="firstName" value={guestForm.firstName} onChange={updateGuest} required />
                    </label>
                    <label>Last name
                      <input name="lastName" value={guestForm.lastName} onChange={updateGuest} />
                    </label>
                    <label>Phone
                      <input name="phone" type="tel" value={guestForm.phone} onChange={updateGuest} />
                    </label>
                    <label>Email
                      <input name="email" type="email" value={guestForm.email} onChange={updateGuest} />
                    </label>
                    <label>Date of birth
                      <input name="dateOfBirth" type="date" value={guestForm.dateOfBirth} onChange={updateGuest} />
                    </label>
                    <label>Gender
                      <select name="gender" value={guestForm.gender} onChange={updateGuest}>
                        <option value="">Select</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
                      </select>
                    </label>
                    <label>Nationality
                      <input name="nationality" value={guestForm.nationality} onChange={updateGuest} />
                    </label>
                    <label>ID proof type
                      <select name="idProofType" value={guestForm.idProofType} onChange={updateGuest}>
                        <option value="">Select</option><option>Passport</option><option>Driving Licence</option><option>Voter ID</option><option>Aadhaar</option><option>Other</option>
                      </select>
                    </label>
                    <label>ID proof number
                      <input name="idProofNumber" value={guestForm.idProofNumber} onChange={updateGuest} />
                    </label>
                    <label className="ci-full">Address
                      <textarea name="address" rows="2" value={guestForm.address} onChange={updateGuest} />
                    </label>
                  </div>
                
                </section>

                <section className="ci-panel">
                  <div className="ci-panel-heading">
                    <div><span className="ci-number">03</span><h2>Room Information</h2></div>
                  </div>
                  <div className="ci-room-highlight">
                    <span>ASSIGNED ROOM</span>
                    <strong>{roomNumber}</strong>
                    <small>{roomType}</small>
                  </div>
                  <div className="ci-detail-list">
                    <div><span>Floor</span><strong>{room.floor ?? "—"}</strong></div>
                    <div><span>Nightly rate</span><strong>{money(rate)}</strong></div>
                    <div><span>Package nights</span><strong>{nights}</strong></div>
                    <div><span>Guests</span><strong>{form.guestsCount}</strong></div>
                    <div><span>Children</span><strong>{selectedBooking.childrenCount ?? 0}</strong></div>
                  </div>
                  <div className="ci-ready"><span /> Reservation ready for check-in</div>
                  
                </section>
              </div>

              <div className="ci-two-columns">
                <section className="ci-panel">
                  <div className="ci-panel-heading">
                    <div><span className="ci-number">04</span><h2>Check-in Details</h2></div>
                  </div>
                  <div className="ci-form-grid">
                    <label>Check-in date
                      <input type="date" name="checkInDate" value={form.checkInDate} onChange={updateForm} required />
                    </label>
                    <label>Check-in time
                      <input type="time" name="checkInTime" value={form.checkInTime} onChange={updateForm} required />
                    </label>
                    <label>Expected check-out
                      <input type="date" name="checkOutDate" value={form.checkOutDate} onChange={updateForm} required />
                    </label>
                    <label>Number of guests
                      <input type="number" min="1" max="20" name="guestsCount" value={form.guestsCount} onChange={updateForm} required />
                    </label>
                    <label>Advance payment mode
                      <select name="paymentMode" value={form.paymentMode} onChange={updateForm}>
                        <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option>
                      </select>
                    </label>
                    <label>Advance amount (₹)
                      <input type="number" min="0" step="0.01" name="advanceAmount" value={form.advanceAmount} onChange={updateForm} />
                    </label>
                    <label className="ci-full">Payment reference
                      <input name="paymentReference" value={form.paymentReference} onChange={updateForm} placeholder="Transaction or receipt reference" />
                    </label>
                    <label className="ci-full">Special requests / check-in notes
                      <textarea rows="3" maxLength="1000" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Arrival instructions or guest requests..." />
                    </label>
                  </div>
                  <label className="ci-checkbox">
                    <input type="checkbox" name="sendConfirmation" checked={form.sendConfirmation} onChange={updateForm} />
                    Send confirmation email (email integration required)
                  </label>
                </section>

                <div className="ci-side-stack">
                  <section className="ci-panel">
                    <div className="ci-panel-heading">
                      <div><span className="ci-number">05</span><h2>Guest ID Proof</h2></div>
                    </div>
                    <p className="ci-muted">JPG, PNG or PDF · Maximum 5 MB</p>
                    <label className="ci-upload">
                      <strong>＋ Choose ID document</strong>
                      <small>Select a document from your device</small>
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleIdFile} />
                    </label>
                    {idFile && (
                      <div className="ci-file-preview">
                        {idPreview
                          ? <img src={idPreview} alt="ID proof preview" />
                          : <span className="ci-pdf">PDF</span>}
                        <div><strong>{idFile.name}</strong><small>{(idFile.size / 1024).toFixed(0)} KB · Local preview only</small></div>
                      </div>
                    )}
                  </section>

                  <section className="ci-panel">
                    <div className="ci-panel-heading">
                      <div><span className="ci-number">06</span><h2>Stay Charges</h2></div>
                    </div>
                    <div className="ci-charge-list">
                      <div><span>Room ({nights} nights × {money(rate)})</span><strong>{money(roomCharges)}</strong></div>
                      <label><span>Extras (₹)</span><input type="number" min="0" step="0.01" name="extras" value={form.extras} onChange={updateForm} /></label>
                      <label><span>Discount (₹)</span><input type="number" min="0" step="0.01" name="discount" value={form.discount} onChange={updateForm} /></label>
                      <div className="ci-charge-total"><span>Total</span><strong>{money(total)}</strong></div>
                      <div><span>Advance entered</span><strong>{money(advance)}</strong></div><div className="ci-charge-balance"><span>Estimated balance</span><strong>{money(balance)}</strong></div>
                    </div>
                  </section>
                </div>
              </div>

              <section className="ci-confirm-bar">
                <div>
                  <strong>Ready to check in?</strong>
                  <p>Booking #{selectedBooking.id} · Room {roomNumber} · {guestName(selectedBooking)}</p>
                </div>
                <button className="ci-button ci-primary" type="submit" disabled={busy || loading}>
                  {busy ? "Processing…" : "✓ Confirm Check-in"}
                </button>
              </section>
            </form>
          )}
        </>
      )}
    </main>
  );
}