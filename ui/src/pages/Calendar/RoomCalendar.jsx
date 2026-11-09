import { useEffect, useMemo, useState } from "react";
import api from "../../services/Services.jsx";
import "./RoomCalendar.css";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function parseDate(value) {
  return new Date(`${value}T12:00:00`);
}


function addDays(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);

  return formatDate(date);
}


function formatShort(value) {
  if (!value) return "—";

  return parseDate(String(value).slice(0, 10)).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}


function normalize(value) {
  return String(value || "").replace(/[\s_-]/g, "").toLowerCase();
}


function bookingStatus(status) {
  const value = normalize(status);

  if (value === "pending") return "pending";

  if (value === "checkedin" || value === "checkin") {
    return "checked-in";
  }

  if (value === "checkedout" || value === "checkout") {
    return "checked-out";
  }

  if (value === "cancelled" || value === "canceled") {
    return "cancelled";
  }

  return "confirmed";
}

function roomStatus(status) {
  const value = normalize(status);

  if (value.includes("maintenance")) return "maintenance";

  if (
    value.includes("outoforder") ||
    value.includes("outofservice")
  ) {
    return "out-of-order";
  }

  if (value.includes("clean")) return "cleaning";
  if (value.includes("occupied")) return "occupied";
  if (value.includes("block")) return "blocked";

  return "available";
}


function getStayDates(item) {
  return {
    start: String(
      item.checkInDate || item.startDate || ""
    ).slice(0, 10),

    end: String(
      item.checkOutDate || item.endDate || ""
    ).slice(0, 10),
  };
}export default function RoomCalendar() {
  const today = formatDate(new Date());

  
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return formatDate(date);
  });

  const [to, setTo] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    return formatDate(date);
  });

  
  const [view, setView] = useState("month");

  
  const [data, setData] = useState({
    rooms: [],
    bookings: [],
    maintenance: [],
  });

  
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  
  const bookingCounts = {
    all: data.bookings.length,

    confirmed: data.bookings.filter(
      (b) => bookingStatus(b.status) === "confirmed"
    ).length,

    pending: data.bookings.filter(
      (b) => bookingStatus(b.status) === "pending"
    ).length,

    cancelled: data.bookings.filter(
      (b) => bookingStatus(b.status) === "cancelled"
    ).length,

    "checked-in": data.bookings.filter(
      (b) => bookingStatus(b.status) === "checked-in"
    ).length,

    "checked-out": data.bookings.filter(
      (b) => bookingStatus(b.status) === "checked-out"
    ).length,
  };

  
  useEffect(() => {
    if (!from || !to || from > to) return;

    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/Booking/calendar", {
        params: { from, to },
      })
      .then((response) => {
        if (!active) return;

        const result = response.data || {};

        setData({
          rooms: Array.isArray(result.rooms)
            ? result.rooms
            : [],

          bookings: Array.isArray(result.bookings)
            ? result.bookings
            : [],

          maintenance: Array.isArray(result.maintenance)
            ? result.maintenance
            : [],
        });
      })
      .catch((error) => {
        console.error("Room Calendar API error:", error);
        console.error("Response:", error.response?.data);

        setError(
          `Could not load room calendar: ${
            error.response?.status || error.message
          }`
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [from, to]);

  
  const dates = useMemo(() => {
    if (!from || !to || from > to) return [];

    const result = [];
    let current = from;

    while (current <= to && result.length < 93) {
      result.push(current);
      current = addDays(current, 1);
    }

    return result;
  }, [from, to]);
  const roomTypes = useMemo(() => {
    return [
      ...new Set(
        data.rooms
          .map(
            (room) =>
              room.roomType ||
              room.roomTypeName ||
              room.typeName
          )
          .filter(Boolean)
      ),
    ];
  }, [data.rooms]);


  const visibleRooms = useMemo(() => {
    return data.rooms.filter((room) => {
      const type =
        room.roomType ||
        room.roomTypeName ||
        room.typeName ||
        "";

      const matchesType =
        roomTypeFilter === "all" ||
        type === roomTypeFilter;

      const currentStatus = roomStatus(room.status);

      const matchesStatus =
        statusFilter === "all" ||
        currentStatus === statusFilter ||
        data.bookings.some(
          (booking) =>
            String(booking.roomId) === String(room.id) &&
            bookingStatus(booking.status) === statusFilter
        );

      return matchesType && matchesStatus;
    });
  }, [
    data.rooms,
    data.bookings,
    roomTypeFilter,
    statusFilter,
  ]);

  
  function moveCalendar(direction) {
    const amount =
      view === "day"
        ? 1
        : view === "week"
          ? 7
          : dates.length || 30;

    const newFrom = addDays(from, amount * direction);

    if (view === "month") {
      const date = parseDate(from);

      date.setDate(1);
      date.setMonth(date.getMonth() + direction);

      const start = formatDate(date);

      const endDate = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      );

      setFrom(start);
      setTo(formatDate(endDate));

      return;
    }

    setFrom(newFrom);

    setTo(
      addDays(
        newFrom,
        view === "day"
          ? 0
          : view === "week"
            ? 6
            : 29
      )
    );
  }

  
  function changeView(nextView) {
    setView(nextView);

    if (nextView === "day") {
      setTo(from);
    } else if (nextView === "week") {
      setTo(addDays(from, 6));
    } else {
      const date = parseDate(from);

      const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      );

      setFrom(
        formatDate(
          new Date(
            date.getFullYear(),
            date.getMonth(),
            1
          )
        )
      );

      setTo(formatDate(end));
    }
  }

  
  function goToday() {
    if (view === "day") {
      setFrom(today);
      setTo(today);
    } else if (view === "week") {
      const date = parseDate(today);
      const weekday = (date.getDay() + 6) % 7;

      const start = addDays(today, -weekday);

      setFrom(start);
      setTo(addDays(start, 6));
    } else {
      const date = parseDate(today);

      const start = formatDate(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        )
      );

      const end = formatDate(
        new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0
        )
      );

      setFrom(start);
      setTo(end);
    }
  }
  
  function bookingsForRoom(room) {
    return data.bookings.filter(
      (booking) =>
        String(booking.roomId) === String(room.id)
    );
  }

  
  function maintenanceForRoom(room) {
    return data.maintenance.filter(
      (block) =>
        String(block.roomId) === String(room.id)
    );
  }

  
  function getBarPosition(item) {
    const stay = getStayDates(item);

    if (!stay.start || !stay.end || dates.length === 0) {
      return null;
    }

    const firstIndex = dates.indexOf(stay.start);
    const lastExclusive = dates.indexOf(stay.end);

    const startIndex =
      firstIndex >= 0
        ? firstIndex
        : stay.start < from
          ? 0
          : -1;

    const endIndex =
      lastExclusive >= 0
        ? lastExclusive
        : stay.end > to
          ? dates.length
          : -1;

    if (
      startIndex < 0 ||
      endIndex < 0 ||
      endIndex <= startIndex
    ) {
      return null;
    }

    return {
      left: `${(startIndex / dates.length) * 100}%`,
      width: `${((endIndex - startIndex) / dates.length) * 100}%`,
    };
  }

  
  function createBookingFromCell(room, date) {
    setSelectedBooking(null);
    setSelectedCell({ room, date });
  }

  
  function openBookingManagement() {
    if (!selectedCell) return;

    const query = new URLSearchParams({
      roomId: String(selectedCell.room.id),
      checkInDate: selectedCell.date,
      checkOutDate: addDays(selectedCell.date, 1),
    });

    window.location.href = `/bookings?${query.toString()}`;
  }

  
  function getRoomSummaryStatus(room) {
    const currentDate = from;

    const blocked = maintenanceForRoom(room).some((block) => {
      const start = String(block.startDate || "").slice(0, 10);
      const end = String(block.endDate || "").slice(0, 10);

      return (
        start &&
        end &&
        start <= currentDate &&
        currentDate < end
      );
    });

    if (blocked) return "maintenance";

    const current = bookingsForRoom(room).some((booking) => {
      const stay = getStayDates(booking);
      const status = bookingStatus(booking.status);

      return (
        stay.start <= currentDate &&
        currentDate < stay.end &&
        status !== "cancelled" &&
        status !== "checked-out"
      );
    });

    if (current) return "occupied";

    return roomStatus(room.status);
  }

  
  const summary = useMemo(() => {
    const counts = {
      total: visibleRooms.length,
      available: 0,
      occupied: 0,
      cleaning: 0,
      maintenance: 0,
      "out-of-order": 0,
    };

    visibleRooms.forEach((room) => {
      const status = getRoomSummaryStatus(room);

      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      } else {
        counts.available += 1;
      }
    });

    return counts;
  }, [
    visibleRooms,
    from,
    data.bookings,
    data.maintenance,
  ]);
  return (
    <main className="room-calendar-page">

      {/* Page Header */}
      <header className="rc-header">
        <div>
          <p className="rc-eyebrow">HOTEL OPERATIONS</p>
          <h1>Room Calendar</h1>
          <p className="rc-subtitle">
            Monitor room availability, reservations, and maintenance.
          </p>
        </div>

        <div className="rc-header-badge">
          <span className="rc-live-dot" />
          Reservation timeline
        </div>
      </header>

      {/* Calendar Navigation */}
      <section className="rc-toolbar">
        <div className="rc-navigation">
          <button
            className="rc-button rc-today"
            onClick={goToday}
          >
            Today
          </button>

          <button
            className="rc-icon-button"
            aria-label="Previous period"
            onClick={() => moveCalendar(-1)}
          >
            ‹
          </button>

          <button
            className="rc-icon-button"
            aria-label="Next period"
            onClick={() => moveCalendar(1)}
          >
            ›
          </button>

          <strong className="rc-date-title">
            {formatShort(from)} – {formatShort(to)}
          </strong>
        </div>

        <div className="rc-view-switch">
          {["day", "week", "month"].map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => changeView(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="rc-filter-panel">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            min={from}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>

        <label>
          Room type
          <select
            value={roomTypeFilter}
            onChange={(event) =>
              setRoomTypeFilter(event.target.value)
            }
          >
            <option value="all">All room types</option>

            {roomTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="cleaning">Cleaning</option>
            <option value="maintenance">Maintenance</option>
            <option value="out-of-order">Out of order</option>
            <option value="confirmed">Confirmed booking</option>
            <option value="pending">Pending booking</option>
            <option value="cancelled">Cancelled booking</option>
            <option value="checked-in">Checked-in booking</option>
            <option value="checked-out">Checked-out booking</option>
          </select>
        </label>

        <button
          className="rc-reset-button"
          onClick={() => {
            setRoomTypeFilter("all");
            setStatusFilter("all");
          }}
        >
          Reset filters
        </button>
      </section>

      {/* Booking Status Cards and Legend */}
      <div className="rc-legend">
  <div className="rc-legend-item">
    <span className="rc-legend-dot confirmed"></span>
    Confirmed
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot pending"></span>
    Pending
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot cancelled"></span>
    Cancelled
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot checked-in"></span>
    Check-in
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot checked-out"></span>
    Check-out
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot blocked"></span>
    Blocked
  </div>

  <div className="rc-legend-item">
    <span className="rc-legend-dot maintenance"></span>
    Maintenance
  </div>
</div>

      {/* Error Message */}
      {error && (
        <div className="rc-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rc-loading">
          <span className="rc-spinner" />
          Loading room calendar…
        </div>
      )}

      {/* Empty Room Message */}
      {!loading && data.rooms.length === 0 && !error && (
        <div className="rc-empty">
          No rooms available for this calendar.
        </div>
      )}
      {/* Calendar Grid */}
      {!loading && data.rooms.length > 0 && dates.length > 0 && (
        <section className="rc-calendar-shell">
          <div className="rc-calendar-scroll">
            <div
              className="rc-calendar"
              style={{ "--day-count": dates.length }}
            >
              {/* Calendar Header */}
              <div className="rc-grid-header">
                <div className="rc-room-heading">
                  <span>ROOM</span>
                  <span>TYPE / FLOOR</span>
                </div>

                <div className="rc-date-headings">
                  {dates.map((date) => {
                    const parsed = parseDate(date);
                    const isToday = date === today;

                    return (
                      <div
                        key={date}
                        className={`rc-date-heading ${
                          isToday ? "is-today" : ""
                        }`}
                      >
                        <span>
                          {parsed.toLocaleDateString("en-IN", {
                            weekday: "short",
                          })}
                        </span>

                        <strong>{parsed.getDate()}</strong>

                        <small>
                          {parsed.toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Rows */}
              {visibleRooms.map((room) => {
                const roomBookings = bookingsForRoom(room);
                const roomMaintenance = maintenanceForRoom(room);

                return (
                  <div className="rc-room-row" key={room.id}>
                    {/* Room Information */}
                    <div className="rc-room-info">
                      <strong>
                        {room.roomNumber ||
                          room.number ||
                          `Room ${room.id}`}
                      </strong>

                      <span>
                        {room.roomType ||
                          room.roomTypeName ||
                          room.typeName ||
                          "Room type unavailable"}
                      </span>

                      <small>
                        Floor {room.floor ?? room.floorNumber ?? "—"}
                      </small>
                    </div>

                    {/* Room Timeline */}
                    <div
                      className="rc-timeline"
                      style={{ "--day-count": dates.length }}
                    >
                      {/* Empty Date Cells */}
                      <div className="rc-empty-cells">
                        {dates.map((date) => (
                          <button
                            key={date}
                            className={`rc-empty-cell ${
                              date === today ? "is-today" : ""
                            }`}
                            aria-label={`Create booking for room ${
                              room.roomNumber || room.id
                            } on ${date}`}
                            title={`Create booking on ${date}`}
                            onClick={() =>
                              createBookingFromCell(room, date)
                            }
                          />
                        ))}
                      </div>

                      {/* Maintenance Bars */}
                      {roomMaintenance.map((block) => {
                        const position = getBarPosition(block);

                        if (!position) return null;

                        const isBlocked = normalize(
                          block.reason
                        ).includes("block");

                        return (
                          <button
                            key={`maintenance-${block.id}`}
                            className={`rc-booking-bar ${
                              isBlocked ? "blocked" : "maintenance"
                            }`}
                            style={position}
                            title={`${
                              isBlocked ? "Blocked" : "Maintenance"
                            }: ${block.reason || "Room unavailable"}`}
                            onClick={() =>
                              setSelectedBooking({
                                ...block,
                                _type: isBlocked
                                  ? "blocked"
                                  : "maintenance",
                              })
                            }
                          >
                            {isBlocked ? "🔒" : "🔧"}{" "}
                            {block.reason ||
                              (isBlocked ? "Blocked" : "Maintenance")}
                          </button>
                        );
                      })}

                      {/* Booking Bars */}
                      {roomBookings.map((booking) => {
                        const position = getBarPosition(booking);

                        if (!position) return null;

                        const status = bookingStatus(booking.status);

                        const adults =
                          booking.adults ??
                          booking.adultCount ??
                          booking.guestsCount ??
                          1;

                        return (
                          <button
                            key={booking.id}
                            className={`rc-booking-bar ${status}`}
                            style={position}
                            title={`${booking.guestName || "Guest"} · ${adults} adult(s) · ${booking.status || "Confirmed"}`}
                            onClick={() =>
                              setSelectedBooking(booking)
                            }
                          >
                            <strong>
                              {booking.guestName || "Guest"}
                            </strong>

                            <span>
                              {" · "}
                              {adults} adult
                              {Number(adults) === 1 ? "" : "s"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar Footer */}
          <div className="rc-calendar-footer">
            Showing {visibleRooms.length} of {data.rooms.length} rooms

            <span>{dates.length} visible dates</span>
          </div>
        </section>
      )}

      {/* Room Status Summary */}
      <section className="rc-summary">
        <div className="rc-summary-heading">
          <div>
            <h2>Room Status Summary</h2>

            <p>
              Status at the beginning of the selected date range
            </p>
          </div>

          <span className="rc-summary-date">
            {formatShort(from)}
          </span>
        </div>

        <div className="rc-summary-grid">
          <div className="rc-summary-card total">
            <span>Total Rooms</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="rc-summary-card available">
            <span>Available</span>
            <strong>{summary.available}</strong>
          </div>

          <div className="rc-summary-card occupied">
            <span>Occupied</span>
            <strong>{summary.occupied}</strong>
          </div>

          <div className="rc-summary-card cleaning">
            <span>Cleaning</span>
            <strong>{summary.cleaning}</strong>
          </div>

          <div className="rc-summary-card maintenance">
            <span>Maintenance</span>
            <strong>{summary.maintenance}</strong>
          </div>

          <div className="rc-summary-card out-of-order">
            <span>Out of Order</span>
            <strong>{summary["out-of-order"]}</strong>
          </div>
        </div>
      </section>
      {/* Booking Details Modal */}
      {selectedBooking && (
        <div
          className="rc-modal-backdrop"
          onClick={() => setSelectedBooking(null)}
          role="presentation"
        >
          <section
            className="rc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rc-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="rc-modal-close"
              aria-label="Close"
              onClick={() => setSelectedBooking(null)}
            >
              ×
            </button>

            <p className="rc-eyebrow">RESERVATION DETAILS</p>

            <h2 id="rc-modal-title">
              {selectedBooking._type === "maintenance"
                ? "Maintenance"
                : selectedBooking._type === "blocked"
                  ? "Blocked Room"
                  : selectedBooking.guestName || "Booking details"}
            </h2>

            {selectedBooking._type ? (
              <>
                <p>
                  <strong>Reason:</strong>{" "}
                  {selectedBooking.reason || "Not specified"}
                </p>

                <p>
                  <strong>Room:</strong>{" "}
                  {selectedBooking.roomNumber || "—"}
                </p>

                <p>
                  <strong>From:</strong>{" "}
                  {formatShort(selectedBooking.startDate)}
                </p>

                <p>
                  <strong>To:</strong>{" "}
                  {formatShort(selectedBooking.endDate)}
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Booking ID:</strong>{" "}
                  BK-{String(selectedBooking.id).padStart(4, "0")}
                </p>

                <p>
                  <strong>Guest:</strong>{" "}
                  {selectedBooking.guestName || "—"}
                </p>

                <p>
                  <strong>Room:</strong>{" "}
                  {selectedBooking.roomNumber || "—"}
                </p>

                <p>
                  <strong>Check-in:</strong>{" "}
                  {formatShort(selectedBooking.checkInDate)}
                </p>

                <p>
                  <strong>Check-out:</strong>{" "}
                  {formatShort(selectedBooking.checkOutDate)}
                </p>

                <p>
                  <strong>Guests:</strong>{" "}
                  {selectedBooking.guestsCount ??
                    selectedBooking.adults ??
                    1}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selectedBooking.status || "Confirmed"}
                </p>

                <p>
                  <strong>Total:</strong>{" "}
                  {selectedBooking.totalAmount == null
                    ? "—"
                    : `₹${Number(
                        selectedBooking.totalAmount
                      ).toLocaleString("en-IN")}`}
                </p>
              </>
            )}

            <button
              className="rc-button rc-primary"
              onClick={() => setSelectedBooking(null)}
            >
              Close details
            </button>
          </section>
        </div>
      )}

      {/* New Booking Modal */}
      {selectedCell && (
        <div
          className="rc-modal-backdrop"
          onClick={() => setSelectedCell(null)}
          role="presentation"
        >
          <section
            className="rc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rc-new-booking-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="rc-modal-close"
              aria-label="Close"
              onClick={() => setSelectedCell(null)}
            >
              ×
            </button>

            <p className="rc-eyebrow">NEW RESERVATION</p>

            <h2 id="rc-new-booking-title">
              Book this room?
            </h2>

            <p>
              <strong>Room:</strong>{" "}
              {selectedCell.room.roomNumber ||
                selectedCell.room.number ||
                selectedCell.room.id}
            </p>

            <p>
              <strong>Check-in:</strong>{" "}
              {formatShort(selectedCell.date)}
            </p>

            <p>
              <strong>Check-out:</strong>{" "}
              {formatShort(addDays(selectedCell.date, 1))}
            </p>

            <p className="rc-modal-note">
              Booking Management will open with the room and dates
              prefilled, provided that page reads these query parameters.
            </p>

            <div className="rc-modal-actions">
              <button
                className="rc-button"
                onClick={() => setSelectedCell(null)}
              >
                Cancel
              </button>

              <button
                className="rc-button rc-primary"
                onClick={openBookingManagement}
              >
                Continue to Booking
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}