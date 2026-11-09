import { useEffect, useMemo, useState } from "react";
import api from "../services/Services.jsx";
import "./BookRoom.css";

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    "Could not complete the booking. Please check the details and try again."
  );
}

export default function BookRoom() {
  const today = localDate(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDate(tomorrowDate);

  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({
    guestId: "",
    roomId: "",
    checkInDate: today,
    checkOutDate: tomorrow,
    guestsCount: 1,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadOptions(checkIn = form.checkInDate, checkOut = form.checkOutDate) {
    setLoading(true);
    setError("");

    try {
      const [guestResponse, roomResponse] = await Promise.all([
        api.get("/Booking/guests"),
        api.get("/Booking/rooms", {
          params: { from: checkIn, to: checkOut },
        }),
      ]);

      const guestData = guestResponse.data;
      const roomData = roomResponse.data;

      setGuests(Array.isArray(guestData) ? guestData : guestData.guests || []);
      setRooms(Array.isArray(roomData) ? roomData : roomData.rooms || []);
    } catch (err) {
      console.error("Failed to load booking options:", err);
      setError(
        "Could not load guests or available rooms. Check that the booking API endpoints are available."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  const selectedRoom = useMemo(
    () => rooms.find((room) => String(room.id ?? room.Id) === form.roomId),
    [rooms, form.roomId]
  );

  const nights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;

    const start = new Date(`${form.checkInDate}T00:00:00`);
    const end = new Date(`${form.checkOutDate}T00:00:00`);
    return Math.max(0, Math.round((end - start) / 86400000));
  }, [form.checkInDate, form.checkOutDate]);

  const nightlyRate = Number(
    selectedRoom?.nightlyRate ??
      selectedRoom?.baseRate ??
      selectedRoom?.rate ??
      selectedRoom?.roomType?.baseRate ??
      selectedRoom?.roomType?.BaseRate ??
      0
  );

  const totalAmount = nights * nightlyRate;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  }

  async function handleDateChange(event) {
    const { name, value } = event.target;
    const updated = { ...form, [name]: value };

    setForm(updated);
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, roomId: "" }));

    const validDates =
      updated.checkInDate &&
      updated.checkOutDate &&
      updated.checkOutDate > updated.checkInDate;

    if (validDates) {
      await loadOptions(updated.checkInDate, updated.checkOutDate);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.guestId || !form.roomId) {
      setError("Please select a guest and an available room.");
      return;
    }

    if (form.checkOutDate <= form.checkInDate) {
      setError("Check-out must be after check-in.");
      return;
    }

    if (nights < 1 || !Number.isFinite(totalAmount)) {
      setError("Please check the stay dates and room price.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/Booking", {
        guestId: Number(form.guestId),
        roomId: Number(form.roomId),
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        guestsCount: Number(form.guestsCount),
      });

      const bookingId = response.data?.id ?? response.data?.Id;

      setSuccess(
        bookingId
          ? `Booking created successfully! Booking ID: ${bookingId}`
          : "Booking created successfully!"
      );

      setForm((current) => ({
        ...current,
        guestId: "",
        roomId: "",
        guestsCount: 1,
      }));

      await loadOptions(form.checkInDate, form.checkOutDate);
    } catch (err) {
      console.error("Booking failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="book-room-page">
      <header className="book-room-header">
        <div>
          <p className="book-room-eyebrow">RESERVATIONS</p>
          <h1>Book a Room</h1>
          <p>Choose your guest, stay dates and available room.</p>
        </div>
        <div className="book-room-header-icon" aria-hidden="true">
          🛎️
        </div>
      </header>

      {error && <div className="booking-alert booking-error" role="alert">{error}</div>}
      {success && <div className="booking-alert booking-success" role="status">{success}</div>}

      <div className="book-room-grid">
        <form className="book-room-form" onSubmit={handleSubmit}>
          <h2>Reservation details</h2>

          {loading ? (
            <p>Loading guests and available rooms...</p>
          ) : (
            <>
              <div className="booking-field">
                <label htmlFor="guestId">Guest</label>
                <select
                  id="guestId"
                  name="guestId"
                  value={form.guestId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a guest</option>
                  {guests.map((guest) => (
                    <option
                      key={guest.id ?? guest.Id}
                      value={guest.id ?? guest.Id}
                    >
                      {guest.fullName ?? guest.FullName}
                    </option>
                  ))}
                </select>
                {guests.length === 0 && (
                  <small>No guests found. Add a guest in Guest Management first.</small>
                )}
              </div>

              <div className="booking-date-grid">
                <div className="booking-field">
                  <label htmlFor="checkInDate">Check-in</label>
                  <input
                    id="checkInDate"
                    name="checkInDate"
                    type="date"
                    min={today}
                    value={form.checkInDate}
                    onChange={handleDateChange}
                    required
                  />
                </div>

                <div className="booking-field">
                  <label htmlFor="checkOutDate">Check-out</label>
                  <input
                    id="checkOutDate"
                    name="checkOutDate"
                    type="date"
                    min={form.checkInDate || today}
                    value={form.checkOutDate}
                    onChange={handleDateChange}
                    required
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="guestsCount">Number of guests</label>
                <input
                  id="guestsCount"
                  name="guestsCount"
                  type="number"
                  min="1"
                  max="20"
                  value={form.guestsCount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="booking-field">
                <label htmlFor="roomId">Available room</label>
                <select
                  id="roomId"
                  name="roomId"
                  value={form.roomId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => {
                    const roomId = room.id ?? room.Id;
                    const roomNumber = room.roomNumber ?? room.RoomNumber;
                    const rate = Number(
                      room.nightlyRate ??
                        room.baseRate ??
                        room.rate ??
                        room.roomType?.baseRate ??
                        room.roomType?.BaseRate ??
                        0
                    );

                    return (
                      <option key={roomId} value={roomId}>
                        Room {roomNumber} — {rate.toFixed(2)} per night
                      </option>
                    );
                  })}
                </select>
                {rooms.length === 0 && (
                  <small>No available rooms found for these dates.</small>
                )}
              </div>

              <button
                className="book-room-submit"
                type="submit"
                disabled={submitting || rooms.length === 0 || guests.length === 0}
              >
                {submitting ? "Confirming..." : "Confirm Booking"}
              </button>
            </>
          )}
        </form>

        <aside className="booking-summary">
          <p className="book-room-eyebrow">YOUR STAY</p>
          <h2>Booking summary</h2>

          <div className="summary-line">
            <span>Check-in</span>
            <strong>{form.checkInDate || "—"}</strong>
          </div>
          <div className="summary-line">
            <span>Check-out</span>
            <strong>{form.checkOutDate || "—"}</strong>
          </div>
          <div className="summary-line">
            <span>Number of nights</span>
            <strong>{nights}</strong>
          </div>
          <div className="summary-line">
            <span>Nightly rate</span>
            <strong>{nightlyRate.toFixed(2)}</strong>
          </div>

          <div className="summary-total">
            <span>Estimated total</span>
            <strong>{totalAmount.toFixed(2)}</strong>
          </div>

          <p className="summary-note">
            The final price is calculated and validated by the booking backend.
          </p>
        </aside>
      </div>
    </main>
  );
}