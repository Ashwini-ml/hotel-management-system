
import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import "./CheckOut.css";

export default function CheckOut() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load guests currently available for checkout.
  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/CheckOut");

      setBookings(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load checked-in guests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Get a readable guest name from the API response.
  function guestName(booking) {
    return (
      booking?.guest?.fullName ||
      booking?.guest?.name ||
      booking?.guestName ||
      booking?.fullName ||
      "Guest"
    );
  }

  // Display a date without the time portion.
  function dateOnly(value) {
    if (!value) return "—";

    const date = String(value).slice(0, 10);
    const parts = date.split("-");

    if (
      parts.length === 3 &&
      parts.every((part) => /^\d+$/.test(part))
    ) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return date;
  }

  // Filter guests by booking, guest, room, phone, or email.
  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return bookings;

    return bookings.filter((booking) => {
      const searchable = [
        booking?.id,
        guestName(booking),
        booking?.guest?.phone,
        booking?.guest?.email,
        booking?.room?.roomNumber,
        booking?.roomNumber,
        booking?.room?.roomType?.name,
        booking?.room?.roomTypeName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [bookings, search]);
  const totalPages = Math.ceil(
  visibleBookings.length / recordsPerPage
);

const startIndex = (currentPage - 1) * recordsPerPage;

const paginatedBookings = visibleBookings.slice(
  startIndex,
  startIndex + recordsPerPage
);
const pageGroupSize = 5;

const currentGroup = Math.ceil(currentPage / pageGroupSize);

const startPage = (currentGroup - 1) * pageGroupSize + 1;

const endPage = Math.min(
  startPage + pageGroupSize - 1,
  totalPages
);

const pageNumbers = Array.from(
  { length: endPage - startPage + 1 },
  (_, index) => startPage + index
);

  // Complete checkout using the existing backend endpoint.
  async function checkout(id) {
    const confirmed = window.confirm(
      `Complete checkout for booking #${id}?`
    );

    if (!confirmed) return;

    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await api.post(`/CheckOut/${id}`);

      setMessage(
        response.data?.message ||
          `Checkout completed for booking #${id}.`
      );

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Checkout failed. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  // Count departures scheduled for today's local date.
  const today = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  const departuresToday = bookings.filter(
    (booking) =>
      String(booking?.checkOutDate || "").slice(0, 10) === today
  ).length;

  return (
    <main className="co-page">
      <header className="co-page-header">
        <div>
          <span className="co-eyebrow">
            FRONT OFFICE / DEPARTURES
          </span>
          <h1>Guest Check-out</h1>
          <p>
            Review in-house guests and complete their departure.
          </p>
        </div>

        <button
          type="button"
          className="co-button co-refresh-button"
          onClick={load}
          disabled={loading || busyId !== null}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      {message && (
        <div className="co-alert co-success" role="status">
          <span>✓</span>
          {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="co-alert co-error" role="alert">
          <span>!</span>
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      <section className="co-stats">
        <article className="co-stat">
          <div className="co-stat-icon teal">⌂</div>
          <div>
            <span>In-house Bookings</span>
            <strong>{bookings.length}</strong>
            <small>Currently listed stays</small>
          </div>
        </article>

        <article className="co-stat">
          <div className="co-stat-icon gold">◷</div>
          <div>
            <span>Departures Today</span>
            <strong>{departuresToday}</strong>
            <small>Scheduled for today</small>
          </div>
        </article>

        <article className="co-stat">
          <div className="co-stat-icon navy">✓</div>
          <div>
            <span>Matching Guests</span>
            <strong>{visibleBookings.length}</strong>
            <small>Based on your search</small>
          </div>
        </article>
      </section>

      <section className="co-panel">
        <div className="co-panel-heading">
          <div>
            <span className="co-eyebrow">
              DEPARTURE REGISTER
            </span>
            <h2>Guests Ready for Check-out</h2>
            <p>
              Review booking details before completing departure.
            </p>
          </div>

          <span className="co-count">
            {visibleBookings.length} guests
          </span>
        </div>

        <div className="co-toolbar">
          <label className="co-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search guest, room, booking or phone..."
              value={search}
              onChange={(event) => {
                 setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <span className="co-toolbar-note">
            {bookings.length} total records
          </span>
        </div>

        <div className="co-table-wrap">
          <table className="co-table">
            <thead>
              <tr>
                <th>BOOKING</th>
                <th>GUEST DETAILS</th>
                <th>ROOM</th>
                <th>CHECK-OUT DATE</th>
                <th>STATUS</th>
                <th className="co-action-heading">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="co-empty">
                    Loading guest records...
                  </td>
                </tr>
              ) : visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="co-empty">
                    <span className="co-empty-icon">⌂</span>
                    <strong>
                      {search
                        ? "No matching guests found"
                        : "No checked-in guests found"}
                    </strong>
                    <small>
                      {search
                        ? "Try another name, booking number, or room."
                        : "Guests will appear here when returned by the checkout API."}
                    </small>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking) => {
                  const name = guestName(booking);
                  const roomNumber =
                    booking?.room?.roomNumber ??
                    booking?.roomNumber ??
                    "—";

                  const contact =
                    booking?.guest?.phone ||
                    booking?.guest?.email ||
                    "Guest contact unavailable";

                  const roomType =
                    booking?.room?.roomType?.name ||
                    booking?.room?.roomTypeName ||
                    "Assigned room";

                  return (
                    <tr key={booking.id}>
                      <td>
                        <span className="co-booking-id">
                          #{booking.id}
                        </span>
                      </td>

                      <td>
                        <div className="co-guest-cell">
                          <span className="co-avatar">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <span className="co-guest-text">
                            <strong>{name}</strong>
                            <small>{contact}</small>
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="co-room-number">
                          {roomNumber}
                        </span>
                        <small className="co-room-type">
                          {roomType}
                        </small>
                      </td>

                      <td>{dateOnly(booking.checkOutDate)}</td>

                      <td>
                        <span className="co-status">
                          In-house
                        </span>
                      </td>

                      <td className="co-action-cell">
                        <button
                          type="button"
                          className="co-button co-checkout-button"
                          onClick={() => checkout(booking.id)}
                          disabled={busyId !== null}
                        >
                          {busyId === booking.id
                            ? "Processing..."
                            : "Check out →"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && visibleBookings.length > 0 && (
  <div className="co-pagination">
    <span className="co-pagination-info">
      Showing {startIndex + 1}–
      {Math.min(startIndex + recordsPerPage, visibleBookings.length)}
      {" "}of {visibleBookings.length} guests
    </span>

    <div className="co-pagination-controls">

  <button
    type="button"
    className="co-page-button"
    disabled={startPage === 1}
    onClick={() => setCurrentPage(startPage - 1)}
  >
    Previous
  </button>

  {pageNumbers.map((page) => (
    <button
      type="button"
      key={page}
      className={`co-page-button ${
        currentPage === page ? "active" : ""
      }`}
      onClick={() => setCurrentPage(page)}
    >
      {page}
    </button>
  ))}

  <button
    type="button"
    className="co-page-button"
    disabled={endPage === totalPages}
    onClick={() => setCurrentPage(endPage + 1)}
  >
    Next
  </button>

</div>
  </div>
)}

        <footer className="co-table-footer">
          <span>Guest departure register</span>
          <span>
            {visibleBookings.length} records displayed
          </span>
        </footer>
      </section>
    </main>
  );
}