import { useEffect, useMemo, useState } from "react";
import api from "../../services/Services.jsx";
import "./Bookings.css";

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getId(item) {
  return item?.id ?? item?.Id;
}

function getStatus(item) {
  return String(item?.status ?? item?.Status ?? "").toLowerCase().trim();
}

function getGuestName(booking) {
  return (
    booking?.guest?.fullName ??
    booking?.Guest?.FullName ??
    booking?.guestName ??
    booking?.GuestName ??
    "Guest"
  );
}

function getRoomNumber(booking) {
  return (
    booking?.room?.roomNumber ??
    booking?.Room?.RoomNumber ??
    booking?.roomNumber ??
    booking?.RoomNumber ??
    "-"
  );
}

function getRoomType(booking) {
  return (
    booking?.room?.roomType?.name ??
    booking?.Room?.RoomType?.Name ??
    booking?.roomTypeName ??
    booking?.RoomTypeName ??
    booking?.roomType ??
    booking?.RoomType ??
    "-"
  );
}

function getBookingCode(booking) {
  const id = getId(booking);
  return `BK-${1023 + (Number(id) || 0)}`;
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) return "";

  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : "";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayStatus(status) {
  const value = String(status || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    checkedin: "Checked-in",
    checkedout: "Checked-out",
  };

  return labels[value] || "Unknown";
}

export default function Bookings() {
  const today = localDate(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDate(tomorrowDate);

  const initialForm = {
    guestId: "",
    roomId: "",
    checkInDate: today,
    checkOutDate: tomorrow,
    guestsCount: 1,
    status: "Pending",
  };

  const initialGuestForm = {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    nationality: "",
    dateOfBirth: "",
    gender: "",
    identificationType: "Aadhaar",
    identificationNumber: "",
  };

  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  const [guestMode, setGuestMode] = useState("new");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [statusTab, setStatusTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    roomType: "",
    source: "",
    from: "",
    to: "",
  });

  // Load all bookings
  async function loadBookings() {
    try {
      const response = await api.get("/Booking");
      const data = response.data;

      const bookingList = Array.isArray(data)
        ? data
        : data?.bookings ?? data?.Bookings ?? [];

      setBookings(bookingList);
      setError("");

      console.log("Bookings loaded:", bookingList);
    } catch (err) {
      console.error("Load bookings error:", err);

      setError(
        err.response?.data?.message ||
        "Could not load bookings. Check that the API is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // Confirm or cancel a pending booking
  async function updateBookingStatus(bookingId, status) {
    try {
      setError("");
      setMessage("");

      console.log("Updating booking ID:", bookingId);
      console.log("New status:", status);

      const response = await api.put(
        `/Booking/${bookingId}/status`,
        null,
        {
          params: { status },
        }
      );

      const updatedStatus =
        response.data?.status ?? status;

      // Immediately update the booking in the frontend
      setBookings((previousBookings) =>
        previousBookings.map((booking) =>
          Number(getId(booking)) === Number(bookingId)
            ? {
                ...booking,
                status: updatedStatus,
                Status: updatedStatus,
              }
            : booking
        )
      );

      setMessage(
        response.data?.message ||
        `Booking ${status.toLowerCase()} successfully.`
      );

      // Reload latest data from backend
      await loadBookings();

    } catch (err) {
      console.error("Update booking status error:", err);

      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Could not update booking status."
      );
    }
  }


  async function loadOptions(from, to) {
    try {
      const [guestResponse, roomResponse] = await Promise.all([
        api.get("/Booking/guests"),
        api.get("/Booking/rooms", {
          params: { from, to },
        }),
      ]);

      const guestData = guestResponse.data;
      const roomData = roomResponse.data;

      setGuests(
        Array.isArray(guestData)
          ? guestData
          : guestData?.guests ?? guestData?.Guests ?? []
      );

      setRooms(
        Array.isArray(roomData)
          ? roomData
          : roomData?.rooms ?? roomData?.Rooms ?? []
      );
    } catch (err) {
      console.error("Load booking options:", err);
      setError("Could not load guests or available rooms.");
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  
  useEffect(() => {
    if (!selectedBooking) {
      setSelectedRoom(null);
      return;
    }

    const roomId =
      selectedBooking.roomId ?? selectedBooking.RoomId;

    if (!roomId) {
      setSelectedRoom(null);
      return;
    }

    let active = true;

    api.get(`/Rooms/${roomId}`)
      .then((response) => {
        if (active) setSelectedRoom(response.data);
      })
      .catch((err) => {
        console.error("Failed to load room details:", err);
        if (active) setSelectedRoom(null);
      });

    return () => {
      active = false;
    };
  }, [selectedBooking]);

  
  useEffect(() => {
    if (!selectedBooking) {
      setSelectedGuest(null);
      return;
    }

    const guestId =
      selectedBooking.guestId ?? selectedBooking.GuestId;

    if (!guestId) {
      setSelectedGuest(null);
      return;
    }

    let active = true;

    api.get(`/Guests/${guestId}`)
      .then((response) => {
        if (active) setSelectedGuest(response.data);
      })
      .catch((err) => {
        console.error("Failed to load guest details:", err);
        if (active) setSelectedGuest(null);
      });

    return () => {
      active = false;
    };
  }, [selectedBooking]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);// Booking counts for dashboard cards
  const counts = useMemo(() => {
    const total = bookings.length;

    const confirmed = bookings.filter(
      (booking) => getStatus(booking) === "confirmed"
    ).length;

    const pending = bookings.filter(
      (booking) => getStatus(booking) === "pending"
    ).length;

    const cancelled = bookings.filter(
      (booking) => getStatus(booking) === "cancelled"
    ).length;

    const checkedIn = bookings.filter(
      (booking) => getStatus(booking) === "checkedin"
    ).length;

    const checkedOut = bookings.filter(
      (booking) => getStatus(booking) === "checkedout"
    ).length;

    return {
      total,
      confirmed,
      pending,
      cancelled,
      checkedIn,
      checkedOut,
    };
  }, [bookings]);

  
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = getStatus(booking);

      if (statusTab !== "all" && status !== statusTab) {
        return false;
      }

      const searchText = filters.search.toLowerCase().trim();

      if (searchText) {
        const searchValues = [
          getBookingCode(booking),
          getGuestName(booking),
          booking?.guestEmail,
          booking?.GuestEmail,
          booking?.email,
          booking?.Email,
          booking?.phone,
          booking?.Phone,
          getRoomNumber(booking),
          String(getId(booking)),
        ];

        const matchesSearch = searchValues.some((value) =>
          String(value ?? "").toLowerCase().includes(searchText)
        );

        if (!matchesSearch) return false;
      }

      if (filters.roomType) {
        if (
          String(getRoomType(booking)).toLowerCase() !==
          filters.roomType.toLowerCase()
        ) {
          return false;
        }
      }

      if (filters.from) {
        const bookingDate = String(
          booking.checkInDate ?? booking.CheckInDate ?? ""
        ).slice(0, 10);

        if (bookingDate < filters.from) return false;
      }

      if (filters.to) {
        const bookingDate = String(
          booking.checkInDate ?? booking.CheckInDate ?? ""
        ).slice(0, 10);

        if (bookingDate > filters.to) return false;
      }

      return true;
    });
   
  }, [bookings, filters, statusTab]);


  
const totalPages = Math.max(
  1,
  Math.ceil(filteredBookings.length / pageSize)
);

const startIndex = (currentPage - 1) * pageSize;

const paginatedBookings = filteredBookings.slice(
  startIndex,
  startIndex + pageSize
);

const firstRecord =
  filteredBookings.length === 0 ? 0 : startIndex + 1;

const lastRecord = Math.min(
  startIndex + pageSize,
  filteredBookings.length
);

  
  const roomTypes = useMemo(() => {
    return [
      ...new Set(
        bookings
          .map((booking) => getRoomType(booking))
          .filter((type) => type && type !== "-")
      ),
    ];
  }, [bookings]);

  
  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }


  function handleGuestChange(event) {
    const { name, value } = event.target;

    setGuestForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  
  async function openBookingForm() {
    setError("");
    setMessage("");

    setForm(initialForm);
    setEditingBooking(null);
    setGuestForm(initialGuestForm);
    setGuestMode("new");
    setPhotoFile(null);
    setPhotoPreview("");
    setSelectedBooking(null);

    await loadOptions(today, tomorrow);

    setShowForm(true);
  }
  

async function openEditBooking(booking) {
  setError("");
  setMessage("");

  const bookingId = getId(booking);

  const guestId =
    booking.guestId ?? booking.GuestId;

  const roomId =
    booking.roomId ?? booking.RoomId;

  const checkInDate = String(
    booking.checkInDate ?? booking.CheckInDate ?? ""
  ).slice(0, 10);

  const checkOutDate = String(
    booking.checkOutDate ?? booking.CheckOutDate ?? ""
  ).slice(0, 10);

  setEditingBooking(booking);

  setForm({
    guestId: String(guestId ?? ""),
    roomId: String(roomId ?? ""),
    checkInDate,
    checkOutDate,
    guestsCount: Number(
      booking.guestsCount ?? booking.GuestsCount ?? 1
    ),
    status: booking.status ?? booking.Status ?? "Pending",
  });

  setGuestMode("existing");
  setPhotoFile(null);
  setPhotoPreview("");

  await loadOptions(checkInDate, checkOutDate);

  setShowForm(true);
}

  
  useEffect(() => {
    if (!showForm) return;

    if (!form.checkInDate || !form.checkOutDate) return;

    if (form.checkOutDate <= form.checkInDate) {
      setRooms([]);
      return;
    }

    loadOptions(form.checkInDate, form.checkOutDate);
  }, [form.checkInDate, form.checkOutDate, showForm]);

  
  function handleGuestSelect(event) {
    const guestId = event.target.value;

    setForm((previous) => ({
      ...previous,
      guestId,
    }));

    if (!guestId) return;

    const guest = guests.find(
      (item) => Number(getId(item)) === Number(guestId)
    );

    if (guest) {
      setGuestForm({
        fullName:
          guest.fullName ?? guest.FullName ?? "",
        email:
          guest.email ?? guest.Email ?? "",
        phone:
          guest.phone ?? guest.Phone ?? "",
        address:
          guest.address ?? guest.Address ?? "",
        nationality:
          guest.nationality ?? guest.Nationality ?? "",
        dateOfBirth:
          String(
            guest.dateOfBirth ?? guest.DateOfBirth ?? ""
          ).slice(0, 10),
        gender:
          guest.gender ?? guest.Gender ?? "",
        identificationType:
          guest.identificationType ??
          guest.IdentificationType ??
          "Aadhaar",
        identificationNumber:
          guest.identificationNumber ??
          guest.IdentificationNumber ??
          "",
      });
    }
  }

  
  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  
  async function createGuest() {
    const payload = {
      fullName: guestForm.fullName.trim(),
      email: guestForm.email.trim(),
      phone: guestForm.phone.trim(),
      address: guestForm.address.trim(),
      nationality: guestForm.nationality.trim(),
      dateOfBirth: guestForm.dateOfBirth || null,
      gender: guestForm.gender,
      identificationType: guestForm.identificationType,
      identificationNumber:
        guestForm.identificationNumber.trim(),
    };

    const response = await api.post("/Guests", payload);

    const createdGuest = response.data?.guest ?? response.data;

    const guestId = getId(createdGuest);

    if (!guestId) {
      throw new Error(
        "Guest was created, but the API did not return a guest ID."
      );
    }

    if (photoFile) {
      const photoData = new FormData();
      photoData.append("photo", photoFile);

      await api.post(
        `/Guests/${guestId}/photo`,
        photoData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    }

    return guestId;
  }

  
async function handleCreateBooking(event) {
  event.preventDefault();

  setError("");
  setMessage("");

  if (!form.checkInDate || !form.checkOutDate) {
    setError("Please select check-in and check-out dates.");
    return;
  }

  if (form.checkOutDate <= form.checkInDate) {
    setError("Check-out date must be after check-in date.");
    return;
  }

  if (!form.roomId) {
    setError("Please select a room.");
    return;
  }

  if (guestMode === "existing" && !form.guestId) {
    setError("Please select a guest.");
    return;
  }

  if (
    guestMode === "new" &&
    (!guestForm.fullName.trim() || !guestForm.email.trim())
  ) {
    setError("Guest name and email are required.");
    return;
  }

  try {
    setSaving(true);

    let guestId = form.guestId;

    if (guestMode === "new") {
      guestId = await createGuest();
    }

    const payload = {
      guestId: Number(guestId),
      roomId: Number(form.roomId),
      checkInDate: form.checkInDate,
      checkOutDate: form.checkOutDate,
      guestsCount: Number(form.guestsCount),
      status: editingBooking
        ? form.status
        : "Pending",
    };

    if (editingBooking) {
      const bookingId = getId(editingBooking);

      await api.put(`/Booking/${bookingId}`, payload);

      setMessage("Booking updated successfully.");
    } else {
      await api.post("/Booking", payload);

      setMessage("Booking created successfully.");
    }

    setShowForm(false);
    setEditingBooking(null);
    setForm(initialForm);
    setGuestForm(initialGuestForm);
    setPhotoFile(null);
    setPhotoPreview("");

    await loadBookings();
    await loadOptions(today, tomorrow);

  } catch (err) {
    console.error("Save booking error:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      "Could not save booking."
    );
  } finally {
    setSaving(false);
  }
}

  
  function exportBookings() {
    const headers = [
      "Booking ID",
      "Guest",
      "Room",
      "Room Type",
      "Check In",
      "Check Out",
      "Guests",
      "Amount",
      "Status",
    ];

    const rows = filteredBookings.map((booking) => [
      getBookingCode(booking),
      getGuestName(booking),
      getRoomNumber(booking),
      getRoomType(booking),
      formatDate(
        booking.checkInDate ?? booking.CheckInDate
      ),
      formatDate(
        booking.checkOutDate ?? booking.CheckOutDate
      ),
      booking.guestsCount ?? booking.GuestsCount ?? 1,
      booking.totalAmount ?? booking.TotalAmount ?? 0,
      displayStatus(getStatus(booking)),
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "hotel-bookings.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  
  function closeBookingForm() {
    setShowForm(false);
    setError("");
    setMessage("");
  }

  
  function closeDetails() {
    setSelectedBooking(null);
    setSelectedRoom(null);
    setSelectedGuest(null);
  }return (
    <div className="bookings-page">
      {/* Page heading */}
      <div className="bookings-header">
        <div>
          <h1>Booking Management</h1>
          <p>Manage reservations, guests and booking status.</p>
        </div>

        <div className="booking-header-actions">
          <button
            type="button"
            className="booking-export-button"
            onClick={exportBookings}
          >
            Export CSV
          </button>

          <button
            type="button"
            className="booking-add-button"
            onClick={openBookingForm}
          >
            + New Booking
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="booking-error">
          {error}
        </div>
      )}

      {message && (
        <div className="booking-success">
          {message}
        </div>
      )}

      {/* Statistics */}
      <div className="booking-stats">
        <div className="booking-stat-card">
          <span>Total Bookings</span>
          <strong>{counts.total}</strong>
        </div>

        <div className="booking-stat-card">
          <span>Confirmed</span>
          <strong>{counts.confirmed}</strong>
        </div>

        <div className="booking-stat-card">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </div>

        <div className="booking-stat-card">
          <span>Cancelled</span>
          <strong>{counts.cancelled}</strong>
        </div>

        <div className="booking-stat-card">
          <span>Checked-in</span>
          <strong>{counts.checkedIn}</strong>
        </div>
        <div className="booking-stat-card">
        <span>Checked-out</span>
        <strong>{counts.checkedOut}</strong>
       </div>
      </div>

      {/* Status tabs */}
      <div className="booking-tabs">
        {[
          { key: "all", label: "All", count: counts.total },
          {
            key: "confirmed",
            label: "Confirmed",
            count: counts.confirmed,
          },
          {
            key: "pending",
            label: "Pending",
            count: counts.pending,
          },
          {
            key: "cancelled",
            label: "Cancelled",
            count: counts.cancelled,
          },
          {
            key: "checkedin",
            label: "Checked-in",
            count: counts.checkedIn,
          },
          {
            key: "checkedout",
            label: "Checked-out",
            count: counts.checkedOut,
          },
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={
              statusTab === tab.key
                ? "booking-tab active"
                : "booking-tab"
            }
            onClick={() => setStatusTab(tab.key)}
          >
            {tab.label}
            <span>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="booking-filter-panel">
        <div className="booking-filter-field booking-search-field">
          <label>Search bookings</label>

          <input
            type="text"
            placeholder="Search guest, booking ID, room..."
            value={filters.search}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                search: event.target.value,
              }))
            }
          />
        </div>

        <div className="booking-filter-field">
          <label>Room Type</label>

          <select
            value={filters.roomType}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                roomType: event.target.value,
              }))
            }
          >
            <option value="">All Room Types</option>

            {roomTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="booking-filter-field">
          <label>Check-in From</label>

          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                from: event.target.value,
              }))
            }
          />
        </div>

        <div className="booking-filter-field">
          <label>Check-in To</label>

          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                to: event.target.value,
              }))
            }
          />
        </div>

        <button
          type="button"
          className="booking-clear-button"
          onClick={() =>
            setFilters({
              search: "",
              roomType: "",
              source: "",
              from: "",
              to: "",
            })
          }
        >
          Clear Filters
        </button>
      </div>

      {/* Booking table */}
      <div className="booking-table-container">
        <div className="booking-table-heading">
          <div>
            <h2>Reservations</h2>
            <p>
              {filteredBookings.length} booking(s) found
            </p>
          </div>

          <button
  type="button"
  className="booking-refresh-button"
  onClick={loadBookings}
  disabled={loading}
  title="Refresh bookings"
  aria-label="Refresh bookings"
>
  ⟳
</button>
        </div>

        {loading ? (
          <div className="booking-empty">
            Loading bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="booking-empty">
            No bookings found.
          </div>
        ) : (
          <>
          <div className="booking-table-scroll">
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Room Type</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Guests</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedBookings.map((booking) => {
                  const bookingId = getId(booking);
                  const status = getStatus(booking);

                  return (
                    <tr key={bookingId}>
                      <td>
                        <strong>
                          {getBookingCode(booking)}
                        </strong>
                      </td>

                      <td>
                        {getGuestName(booking)}
                      </td>

                      <td>
                        {getRoomNumber(booking)}
                      </td>

                      <td>
                        {getRoomType(booking)}
                      </td>

                      <td>
                        {formatDate(
                          booking.checkInDate ??
                          booking.CheckInDate
                        )}
                      </td>

                      <td>
                        {formatDate(
                          booking.checkOutDate ??
                          booking.CheckOutDate
                        )}
                      </td>

                      <td>
                        {booking.guestsCount ??
                          booking.GuestsCount ??
                          1}
                      </td>

                      <td>
                        {money(
                          booking.totalAmount ??
                          booking.TotalAmount
                        )}
                      </td>

                      <td>
                        <span
                          className={`booking-status status-${status}`}
                        >
                          {displayStatus(status)}
                        </span>
                      </td>

                      <td>
  <div className="booking-actions-wrapper">
    <button
      type="button"
      className="booking-icon-button"
      title="View Booking"
      onClick={() => {
        setSelectedBooking(booking);
        setOpenActionMenu(null);
      }}
    >
      👁
    </button>

    <div className="booking-action-menu-container">
      <button
        type="button"
        className="booking-icon-button"
        title="More Actions"
        onClick={() =>
          setOpenActionMenu(
            openActionMenu === bookingId ? null : bookingId
          )
        }
      >
        ⋮
      </button>

      {openActionMenu === bookingId && (
        <div className="booking-action-menu">
          <button
            type="button"
            onClick={() => {
              setOpenActionMenu(null);
              openEditBooking(booking);
            }}
          >
            ✏ Edit
          </button>

          {status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenu(null);
                  updateBookingStatus(bookingId, "Confirmed");
                }}
              >
                ✓ Confirm
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenActionMenu(null);
                  updateBookingStatus(bookingId, "Cancelled");
                }}
              >
                ✕ Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  </div>
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="booking-pagination">
  <div className="booking-page-info">
    Showing <strong>{firstRecord}–{lastRecord}</strong> of{" "}
    <strong>{filteredBookings.length}</strong> bookings
  </div>

  <div className="booking-pagination-controls">
    <select
      className="booking-page-size"
      value={pageSize}
      onChange={(e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
      }}
    >
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>

    <button
      type="button"
      className="booking-page-button"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((page) => page - 1)}
    >
      Previous
    </button>

    {Array.from(
  {
    length: Math.min(5, totalPages),
  },
  (_, index) => {
    let startPage = Math.max(
      1,
      Math.min(currentPage - 2, totalPages - 4)
    );

    return startPage + index;
  }
).map((page) => (
  <button
    type="button"
    key={page}
    className={`booking-page-button ${
      currentPage === page ? "active" : ""
    }`}
    onClick={() => setCurrentPage(page)}
  >
    {page}
  </button>
))}

    <button
      type="button"
      className="booking-page-button"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((page) => page + 1)}
    >
      Next
    </button>
    </div>
    </div>
    </>
  
  )}
      </div>{/* New Booking Modal */}
      {showForm && (
        <div className="booking-modal-overlay">
          <div className="booking-modal booking-create-modal">
            <div className="booking-modal-header">
              <div>
                <h2>
  {editingBooking ? "Edit Booking" : "Create New Booking"}
</h2>

<p>
  {editingBooking
    ? "Update reservation details."
    : "Enter reservation and guest details."}
</p>
              </div>

              <button
                type="button"
                className="booking-modal-close"
                onClick={closeBookingForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBooking}>
              <div className="booking-form-section">
                <h3>Reservation Details</h3>

                <div className="booking-form-grid">
                  <div className="booking-form-field">
                    <label>Check-in Date *</label>

                    <input
                      type="date"
                      name="checkInDate"
                      value={form.checkInDate}
                      min={today}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="booking-form-field">
                    <label>Check-out Date *</label>

                    <input
                      type="date"
                      name="checkOutDate"
                      value={form.checkOutDate}
                      min={form.checkInDate || today}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="booking-form-field">
                    <label>Number of Guests *</label>

                    <input
                      type="number"
                      name="guestsCount"
                      min="1"
                      value={form.guestsCount}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="booking-form-field">
                    <label>Select Room *</label>

                    <select
  name="roomId"
  value={form.roomId}
  onChange={handleFormChange}
  required
>
  <option value="">
    Select Available Room
  </option>

  {editingBooking &&
    form.roomId &&
    !rooms.some(
      (room) =>
        Number(getId(room)) === Number(form.roomId)
    ) && (
      <option value={form.roomId}>
        Room {getRoomNumber(editingBooking)} -{" "}
        {getRoomType(editingBooking)}
      </option>
    )}

  {rooms.map((room) => {
    const roomId = getId(room);

    return (
      <option key={roomId} value={roomId}>
        Room{" "}
        {room.roomNumber ??
          room.RoomNumber ??
          roomId}
        {" - "}
        {room.roomTypeName ??
          room.RoomTypeName ??
          room.roomType?.name ??
          room.RoomType?.Name ??
          room.roomType ??
          room.RoomType ??
          "Room"}
      </option>
    );
  })}
</select>

                    {rooms.length === 0 && (
                      <small>
                        No available rooms for these dates.
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="booking-form-section">
                <h3>Guest Information</h3>

                <div className="booking-guest-mode">
                  <label>
                    <input
                      type="radio"
                      name="guestMode"
                      checked={guestMode === "new"}
                      onChange={() => {
                        setGuestMode("new");
                        setForm((previous) => ({
                          ...previous,
                          guestId: "",
                        }));
                        setGuestForm(initialGuestForm);
                      }}
                    />
                    New Guest
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="guestMode"
                      checked={guestMode === "existing"}
                      onChange={() => {
                        setGuestMode("existing");
                        setForm((previous) => ({
                          ...previous,
                          guestId: "",
                        }));
                      }}
                    />
                    Existing Guest
                  </label>
                </div>

                {guestMode === "existing" ? (
                  <div className="booking-form-field">
                    <label>Select Guest *</label>

                    <select
                      value={form.guestId}
                      onChange={handleGuestSelect}
                      required
                    >
                      <option value="">
                        Select Guest
                      </option>

                      {guests.map((guest) => (
                        <option
                          key={getId(guest)}
                          value={getId(guest)}
                        >
                          {guest.fullName ??
                            guest.FullName}
                          {" - "}
                          {guest.email ?? guest.Email}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="booking-photo-field">
                      <div className="booking-photo-preview">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Guest preview"
                          />
                        ) : (
                          <span>Guest Photo</span>
                        )}
                      </div>

                      <div>
                        <label>Guest Photo</label>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                        />

                        <small>
                          JPG, PNG or WEBP. Maximum 5 MB.
                        </small>
                      </div>
                    </div>

                    <div className="booking-form-grid">
                      <div className="booking-form-field">
                        <label>Full Name *</label>

                        <input
                          type="text"
                          name="fullName"
                          value={guestForm.fullName}
                          onChange={handleGuestChange}
                          placeholder="Enter guest name"
                          required
                        />
                      </div>

                      <div className="booking-form-field">
                        <label>Email *</label>

                        <input
                          type="email"
                          name="email"
                          value={guestForm.email}
                          onChange={handleGuestChange}
                          placeholder="Enter email"
                          required
                        />
                      </div>

                      <div className="booking-form-field">
                        <label>Phone</label>

                        <input
                          type="tel"
                          name="phone"
                          value={guestForm.phone}
                          onChange={handleGuestChange}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="booking-form-field">
                        <label>Date of Birth</label>

                        <input
                          type="date"
                          name="dateOfBirth"
                          value={guestForm.dateOfBirth}
                          onChange={handleGuestChange}
                        />

                        {guestForm.dateOfBirth && (
                          <small>
                            Age: {getAge(guestForm.dateOfBirth)}
                          </small>
                        )}
                      </div>

                      <div className="booking-form-field">
                        <label>Gender</label>

                        <select
                          name="gender"
                          value={guestForm.gender}
                          onChange={handleGuestChange}
                        >
                          <option value="">Select Gender</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="booking-form-field">
                        <label>Nationality</label>

                        <input
                          type="text"
                          name="nationality"
                          value={guestForm.nationality}
                          onChange={handleGuestChange}
                          placeholder="Enter nationality"
                        />
                      </div>

                      <div className="booking-form-field">
                        <label>Identification Type</label>

                        <select
                          name="identificationType"
                          value={guestForm.identificationType}
                          onChange={handleGuestChange}
                        >
                          <option value="Aadhaar">Aadhaar</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">
                            Driving License
                          </option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                      </div>

                      <div className="booking-form-field">
                        <label>Identification Number</label>

                        <input
                          type="text"
                          name="identificationNumber"
                          value={guestForm.identificationNumber}
                          onChange={handleGuestChange}
                          placeholder="Enter ID number"
                        />
                      </div>

                      <div className="booking-form-field booking-full-width">
                        <label>Address</label>

                        <textarea
                          name="address"
                          value={guestForm.address}
                          onChange={handleGuestChange}
                          placeholder="Enter guest address"
                          rows="3"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="booking-error">
                  {error}
                </div>
              )}

              <div className="booking-modal-footer">
                <button
                  type="button"
                  className="booking-clear-button"
                  onClick={closeBookingForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="booking-add-button"
                  disabled={saving}
                >
                  {saving
                   ? "Saving...": editingBooking ? "Save Changes": "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Booking Details Modal */}
      {selectedBooking && (
        <div
          className="booking-modal-overlay"
          onClick={closeDetails}
        >
          <div
            className="booking-modal booking-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="booking-modal-header">
              <div>
                <h2>Booking Details</h2>
                <p>
                  {getBookingCode(selectedBooking)}
                </p>
              </div>

              <button
                type="button"
                className="booking-modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="booking-details-content">
              <div className="booking-details-section">
                <h3>Reservation Information</h3>

                <div className="booking-details-grid">
                  <div>
                    <span>Booking ID</span>
                    <strong>
                      {getBookingCode(selectedBooking)}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {displayStatus(
                        getStatus(selectedBooking)
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Room Number</span>
                    <strong>
                      {getRoomNumber(selectedBooking)}
                    </strong>
                  </div>

                  <div>
                    <span>Room Type</span>
                    <strong>
                      {getRoomType(selectedBooking) !== "-"
                        ? getRoomType(selectedBooking)
                        : selectedRoom?.roomType?.name ??
                          selectedRoom?.RoomType?.Name ??
                          selectedRoom?.roomTypeName ??
                          selectedRoom?.RoomTypeName ??
                          "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Check-in Date</span>
                    <strong>
                      {formatDate(
                        selectedBooking.checkInDate ??
                        selectedBooking.CheckInDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Check-out Date</span>
                    <strong>
                      {formatDate(
                        selectedBooking.checkOutDate ??
                        selectedBooking.CheckOutDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Number of Guests</span>
                    <strong>
                      {selectedBooking.guestsCount ??
                        selectedBooking.GuestsCount ??
                        1}
                    </strong>
                  </div>

                  <div>
                    <span>Nightly Rate</span>
                    <strong>
                      {money(
                        selectedBooking.nightlyRate ??
                        selectedBooking.NightlyRate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Total Amount</span>
                    <strong>
                      {money(
                        selectedBooking.totalAmount ??
                        selectedBooking.TotalAmount
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="booking-details-section">
                <h3>Guest Information</h3>

                <div className="booking-details-grid">
                  <div>
                    <span>Guest Name</span>
                    <strong>
                      {selectedGuest?.fullName ??
                        selectedGuest?.FullName ??
                        getGuestName(selectedBooking)}
                    </strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>
                      {selectedGuest?.email ??
                        selectedGuest?.Email ??
                        selectedBooking.guestEmail ??
                        selectedBooking.GuestEmail ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {selectedGuest?.phone ??
                        selectedGuest?.Phone ??
                        selectedBooking.guestPhone ??
                        selectedBooking.GuestPhone ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Nationality</span>
                    <strong>
                      {selectedGuest?.nationality ??
                        selectedGuest?.Nationality ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Gender</span>
                    <strong>
                      {selectedGuest?.gender ??
                        selectedGuest?.Gender ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Identification Type</span>
                    <strong>
                      {selectedGuest?.identificationType ??
                        selectedGuest?.IdentificationType ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Identification Number</span>
                    <strong>
                      {selectedGuest?.identificationNumber ??
                        selectedGuest?.IdentificationNumber ??
                        "-"}
                    </strong>
                  </div>

                  <div className="booking-full-width">
                    <span>Address</span>
                    <strong>
                      {selectedGuest?.address ??
                        selectedGuest?.Address ??
                        "-"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="booking-modal-footer">
              <button
                type="button"
                className="booking-clear-button"
                onClick={closeDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}