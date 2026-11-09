import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./Guests.css";

const emptyGuest = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  nationality: "",
  dateOfBirth: "",
  gender: "",
  identificationType: "",
  identificationNumber: "",
  guestType: "Regular",
  rating: "",
};

const getGuestId = (guest) => guest?.id ?? guest?.Id;

const getGuestName = (guest) =>
  guest?.fullName || guest?.FullName || guest?.name || "Unnamed guest";

const getGuestPhoto = (guest) =>
  guest?.photoUrl || guest?.PhotoUrl || "";

const getGuestType = (guest) => {
  return (
    guest?.guestType ??
    guest?.GuestType ??
    guest?.type ??
    "Regular"
  );
};

const getPhotoUrl = (photoPath) => {
  if (!photoPath) return "";

  if (photoPath.startsWith("http")) return photoPath;

  const baseURL = api.defaults.baseURL || "http://localhost:5178/api";
  const origin = baseURL.replace(/\/api\/?$/, "").replace(/\/$/, "");

  return `${origin}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
};

function Guests() {
  const navigate = useNavigate();

  const [guests, setGuests] = useState([]);
  const [form, setForm] = useState(emptyGuest);

  const [editingId, setEditingId] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("");
  const [guestType, setGuestType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
const [showBookingForm, setShowBookingForm] = useState(false);
const [bookingSaving, setBookingSaving] = useState(false);
const [bookingRooms, setBookingRooms] = useState([]);
const [bookingGuestId, setBookingGuestId] = useState(null);

const getToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const [bookingForm, setBookingForm] = useState({
  roomId: "",
  checkInDate: getToday(),
  checkOutDate: getTomorrow(),
  guestsCount: 1,
});

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [importReport, setImportReport] = useState("");

  const photoInputRef = useRef(null);
  const fileInput = useRef(null);

  
  const loadGuests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Guests");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setGuests(data);
    } catch (err) {
      console.error("Error loading guests:", err);
      setError("Unable to load guests. Please check the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);


const totalGuests = guests.length;

const TEST_YEAR = 2026;
const TEST_MONTH = 8; 

const newGuests = guests.filter((guest) => {
  const createdValue = guest.createdAt || guest.CreatedAt;
  if (!createdValue) return false;

  const created = new Date(createdValue);

  return (
    !Number.isNaN(created.getTime()) &&
    created.getMonth() === TEST_MONTH &&
    created.getFullYear() === TEST_YEAR
  );
}).length;

const repeatGuests = guests.filter((guest) => {
  const stays = Number(
    guest.totalStays ?? guest.TotalStays ?? 0
  );

  return stays >= 2;
}).length;

const ratings = guests
  .map((guest) => guest.rating ?? guest.Rating)
  .filter(
    (rating) =>
      rating !== null &&
      rating !== undefined &&
      rating !== ""
  )
  .map(Number)
  .filter(
    (rating) =>
      Number.isFinite(rating) &&
      rating >= 1 &&
      rating <= 5
  );

const averageRating = ratings.length
  ? (
      ratings.reduce((total, rating) => total + rating, 0) /
      ratings.length
    ).toFixed(1) + " / 5 ⭐"
  : "Not rated";

  
  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const name = getGuestName(guest).toLowerCase();
      const email = (guest.email || guest.Email || "").toLowerCase();
      const phone = (guest.phone || guest.Phone || "").toLowerCase();
      const idNumber = (
        guest.identificationNumber ||
        guest.IdentificationNumber ||
        ""
      ).toLowerCase();

      const searchValue = search.toLowerCase();

      const matchesSearch =
        !searchValue ||
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        phone.includes(searchValue) ||
        idNumber.includes(searchValue);

      const guestNationality =
        guest.nationality || guest.Nationality || "";

      const matchesNationality =
        !nationality || guestNationality === nationality;

      const matchesType =
        !guestType || getGuestType(guest) === guestType;

      const guestStatus = guest.status || guest.Status || "Active";

      const matchesStatus =
        !statusFilter || guestStatus === statusFilter;

      return (
        matchesSearch &&
        matchesNationality &&
        matchesType &&
        matchesStatus
      );
    });
  }, [guests, search, nationality, guestType, statusFilter]);
  
const totalPages = Math.max(
  1,
  Math.ceil(filteredGuests.length / pageSize)
);

const startIndex = (currentPage - 1) * pageSize;

const paginatedGuests = filteredGuests.slice(
  startIndex,
  startIndex + pageSize
);

const firstRecord =
  filteredGuests.length === 0 ? 0 : startIndex + 1;

const lastRecord = Math.min(
  startIndex + pageSize,
  filteredGuests.length
);


useEffect(() => {
  setCurrentPage(1);
}, [search, nationality, guestType, statusFilter]);


useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [currentPage, totalPages]);

  
  const exportGuests = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Address",
      "Nationality",
      "Identification Type",
      "Identification Number",
    ];

    const rows = filteredGuests.map((guest) => [
      getGuestName(guest),
      guest.email || guest.Email || "",
      guest.phone || guest.Phone || "",
      guest.address || guest.Address || "",
      guest.nationality || guest.Nationality || "",
      guest.identificationType || guest.IdentificationType || "",
      guest.identificationNumber || guest.IdentificationNumber || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "guests.csv";
    link.click();

    URL.revokeObjectURL(url);
  };
  const handlePhotoChange = (event) => {
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

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(URL.createObjectURL(file));
  };

  
  const resetPhotoSelection = () => {
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoPreview("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  
  const uploadGuestPhoto = async (guestId) => {
  if (!photoFile) return;

  const formData = new FormData();

  
  formData.append("photo", photoFile);

  await api.post(`/Guests/${guestId}/photo`, formData);
};

  
  const startNewGuest = () => {
    setEditingId(null);
    setForm(emptyGuest);
    resetPhotoSelection();
    setSelectedGuest(null);
    setError("");
    setNotice("");
    setShowForm(true);
  };

  const editGuest = (guest) => {
  setEditingId(getGuestId(guest));

  setForm({
    fullName: guest.fullName || guest.FullName || "",
    email: guest.email || guest.Email || "",
    phone: guest.phone || guest.Phone || "",
    address: guest.address || guest.Address || "",
    nationality: guest.nationality || guest.Nationality || "",
    dateOfBirth: (
      guest.dateOfBirth || guest.DateOfBirth || ""
    ).toString().split("T")[0],
    gender: guest.gender || guest.Gender || "",
    identificationType:
      guest.identificationType || guest.IdentificationType || "",
    identificationNumber:
      guest.identificationNumber || guest.IdentificationNumber || "",
    guestType: guest.guestType || guest.GuestType || "Regular",
    rating: guest.rating ?? guest.Rating ?? "",
  });

  resetPhotoSelection();

  const existingPhoto = getGuestPhoto(guest);

  setPhotoPreview(
    existingPhoto ? getPhotoUrl(existingPhoto) : ""
  );

  setSelectedGuest(null);
  setError("");
  setNotice("");
  setShowForm(true);
};

  
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  
const loadBookingRooms = async (from, to) => {
  try {
    const response = await api.get("/Booking/rooms", {
      params: { from, to },
    });

    const data = response.data;

    setBookingRooms(
      Array.isArray(data)
        ? data
        : data?.rooms || data?.Rooms || []
    );
  } catch (err) {
    console.error("Error loading available rooms:", err);
    setError("Unable to load available rooms.");
    setBookingRooms([]);
  }
};


const handleGuestBooking = async (event) => {
  event.preventDefault();

  if (!bookingGuestId) {
    setError("Guest information is missing.");
    return;
  }

  if (!bookingForm.roomId) {
    setError("Please select an available room.");
    return;
  }

  if (bookingForm.checkOutDate <= bookingForm.checkInDate) {
    setError("Check-out date must be after check-in date.");
    return;
  }

  try {
    setBookingSaving(true);
    setError("");

    const payload = {
      guestId: Number(bookingGuestId),
      roomId: Number(bookingForm.roomId),
      checkInDate: bookingForm.checkInDate,
      checkOutDate: bookingForm.checkOutDate,
      guestsCount: Number(bookingForm.guestsCount),
      status: "Pending",
    };

    await api.post("/Booking", payload);

    setShowBookingForm(false);
    setBookingGuestId(null);

    setNotice("Guest added and room booking created successfully.");

    await loadGuests();
  } catch (err) {
    console.error("Guest booking error:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.title ||
      "Unable to create room booking."
    );
  } finally {
    setBookingSaving(false);
  }
};
  
const submitGuest = async (event) => {
  event.preventDefault();

  try {
    setSaving(true);
    setError("");
    setNotice("");

    let guestId = editingId;

    if (editingId) {
      await api.put(`/Guests/${editingId}`, form);
    } else {
      const response = await api.post("/Guests", form);

      const createdGuest =
        response.data?.guest || response.data;

      guestId =
        createdGuest?.id ??
        createdGuest?.Id ??
        createdGuest?.guestId ??
        createdGuest?.GuestId;
    }

    if (photoFile) {
      if (!guestId) {
        throw new Error("Guest ID was not returned by the API.");
      }

      await uploadGuestPhoto(guestId);
    }

    setShowForm(false);
    setEditingId(null);
    resetPhotoSelection();

    await loadGuests();

    
    if (editingId) {
      setNotice("Guest updated successfully.");
      setForm(emptyGuest);
      return;
    }

    if (!guestId) {
      throw new Error("Guest was saved, but its ID was not returned.");
    }

    
    setBookingGuestId(guestId);

    setBookingForm({
      roomId: "",
      checkInDate: getToday(),
      checkOutDate: getTomorrow(),
      guestsCount: 1,
    });

    await loadBookingRooms(getToday(), getTomorrow());

    setShowBookingForm(true);
  } catch (err) {
    console.error("Error saving guest:", err);

    setError(
      err.response?.data?.message ||
      err.message ||
      "Unable to save guest."
    );
  } finally {
    setSaving(false);
  }
};

  
  const deleteGuest = async (guest) => {
    const guestId = getGuestId(guest);

    if (!window.confirm(`Delete ${getGuestName(guest)}?`)) {
      return;
    }

    try {
      await api.delete(`/Guests/${guestId}`);

      setNotice("Guest deleted successfully.");
      setSelectedGuest(null);

      await loadGuests();
    } catch (err) {
      console.error("Error deleting guest:", err);

      setError(
        err.response?.data?.message ||
        "Unable to delete guest."
      );
    }
  };

  
  const toggleGuestSelection = (guestId) => {
    setSelectedIds((previous) =>
      previous.includes(guestId)
        ? previous.filter((id) => id !== guestId)
        : [...previous, guestId]
    );
  };

  
  const toggleAllGuests = (checked) => {
    setSelectedIds(
      checked
        ? filteredGuests.map((guest) => getGuestId(guest))
        : []
    );
  };

  
  const clearFilters = () => {
    setSearch("");
    setNationality("");
    setGuestType("");
    setStatusFilter("");
  };
  const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && insideQuotes && nextChar === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        row.push(value.trim());
        value = "";
      } else if (
        (char === "\n" || char === "\r") &&
        !insideQuotes
      ) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }

        row.push(value.trim());

        if (row.some((item) => item !== "")) {
          rows.push(row);
        }

        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    row.push(value.trim());

    if (row.some((item) => item !== "")) {
      rows.push(row);
    }

    return rows;
  };

  
  const importGuests = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setImportReport("Importing guests...");

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        throw new Error("The CSV file does not contain guest records.");
      }

      const headers = rows[0].map((header) =>
        header.toLowerCase().replace(/\s+/g, "")
      );

      const getValue = (record, possibleNames) => {
        const index = headers.findIndex((header) =>
          possibleNames.includes(header)
        );

        return index >= 0 ? record[index] || "" : "";
      };

      let successCount = 0;
      let failedCount = 0;

      for (const record of rows.slice(1)) {
        const guest = {
          fullName: getValue(record, ["fullname", "name"]),
          email: getValue(record, ["email"]),
          phone: getValue(record, ["phone", "phonenumber"]),
          address: getValue(record, ["address"]),
          nationality: getValue(record, ["nationality"]),
          identificationType: getValue(record, [
            "identificationtype",
            "idtype",
          ]),
          identificationNumber: getValue(record, [
            "identificationnumber",
            "idnumber",
          ]),
        };

        if (!guest.fullName || !guest.email) {
          failedCount++;
          continue;
        }

        try {
          await api.post("/Guests", guest);
          successCount++;
        } catch {
          failedCount++;
        }
      }

      setImportReport(
        `Import completed: ${successCount} successful, ${failedCount} failed.`
      );

      await loadGuests();
    } catch (err) {
      console.error("CSV import error:", err);
      setError(err.message || "Unable to import CSV file.");
      setImportReport("");
    } finally {
      event.target.value = "";
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "—";

    const birthDate = new Date(dateOfBirth);

    if (Number.isNaN(birthDate.getTime())) return "—";

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference =
      today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 0 ? age : "—";
  };


  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  
  const openGuestDetails = (guest) => {
    setSelectedGuest(guest);
  };

 
  const closeGuestDetails = () => {
    setSelectedGuest(null);
  };

 
  const selectedGuestName = selectedGuest
    ? getGuestName(selectedGuest)
    : "";

  const selectedGuestPhoto = selectedGuest
    ? getPhotoUrl(getGuestPhoto(selectedGuest))
    : "";

  const selectedGuestAge = selectedGuest
    ? calculateAge(
        selectedGuest.dateOfBirth ||
        selectedGuest.DateOfBirth
      )
    : "—";return (
    <div className="guest-page">

      {/* Header */}
      <div className="guest-header">
        <div>
          <h1>Guest Management</h1>
          <p>Manage guest profiles and information.</p>
        </div>

        <div className="guest-header-actions">
          <button
            className="guest-secondary-btn"
            onClick={exportGuests}
          >
            Export CSV
          </button>

          <button
            className="guest-secondary-btn"
            onClick={() => fileInput.current?.click()}
          >
            Import CSV
          </button>

          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            hidden
            onChange={importGuests}
          />

          <button
            className="guest-primary-btn"
            onClick={startNewGuest}
          >
            + Add New Guest
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="guest-alert guest-alert-error">
          {error}
        </div>
      )}

      {notice && (
        <div className="guest-alert guest-alert-success">
          {notice}
        </div>
      )}

      {importReport && (
        <div className="guest-alert">
          {importReport}
        </div>
      )}

      {/* Statistics */}
      <div className="guest-stats">
        <div className="guest-stat-card">
          <span>Total Guests</span>
          <h2>{totalGuests}</h2>
        </div>

        <div className="guest-stat-card">
          <span>New Guests This Month</span>
          <h2>{newGuests}</h2>
        </div>

        <div className="guest-stat-card">
          <span>Repeat Guests</span>
          <h2>{repeatGuests}</h2>
        </div>

        <div className="guest-stat-card">
          <span>Average Rating</span>
          <h2>{averageRating}</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="guest-filter-panel">

        <input
          type="text"
          placeholder="Search name, email, phone or ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={nationality}
          onChange={(event) => setNationality(event.target.value)}
        >
          <option value="">All Nationalities</option>

          {[...new Set(
            guests
              .map((guest) =>
                guest.nationality || guest.Nationality
              )
              .filter(Boolean)
          )].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={guestType}
          onChange={(event) => setGuestType(event.target.value)}
        >
          <option value="">All Guest Types</option>
          <option value="Regular">Regular</option>
          <option value="VIP">VIP</option>
          <option value="Corporate">Corporate</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          className="guest-clear-btn"
          onClick={clearFilters}
        >
          Clear Filters
        </button>

      </div>{/* Guest Table */}
      <div className="guest-table-container">

        <div className="guest-table-heading">
          <h2>Guest List</h2>
          <span>{filteredGuests.length} guests found</span>
        </div>

        {loading ? (
          <div className="guest-loading">
            Loading guests...
          </div>
        ) : (
          <div className="guest-table-scroll">
            <table className="guest-table">

              <thead>
                <tr>
                  <th>Select</th>
                  <th>#</th>
                  <th>Guest</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Nationality</th>
                  <th>Type</th>
                  <th>Total Stays</th>
                  <th>Last Stay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="guest-empty">
                      No guests found.
                    </td>
                  </tr>
                ) : (
                  paginatedGuests.map((guest, index) => {
                    const guestId = getGuestId(guest);
                    const photo = getPhotoUrl(getGuestPhoto(guest));

                    return (
                      <tr key={guestId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(guestId)}
                            onChange={() =>
                              toggleGuestSelection(guestId)
                            }
                          />
                        </td>

                        <td>{startIndex+index + 1}</td>

                        <td>
                          <div className="guest-profile">
                            {photo ? (
                              <img
                                src={photo}
                                alt={getGuestName(guest)}
                                className="guest-table-avatar"
                              />
                            ) : (
                              <div className="guest-avatar">
                                {getGuestName(guest)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}

                            <button
                              className="guest-name-button"
                              onClick={() => openGuestDetails(guest)}
                            >
                              {getGuestName(guest)}
                            </button>
                          </div>
                        </td>

                        <td>{guest.phone || guest.Phone || "—"}</td>
                        <td>{guest.email || guest.Email || "—"}</td>

                        <td>
                          {guest.nationality ||
                            guest.Nationality || "—"}
                        </td>

                        <td>
                          <span className="guest-type-badge">
                            {getGuestType(guest)}
                          </span>
                        </td>

                        <td>
                          {guest.totalStays ||
                            guest.TotalStays || 0}
                        </td>

                        <td>
                          {formatDate(
                            guest.lastStay ||
                            guest.lastStayDate ||
                            guest.LastStay
                          )}
                        </td>

                        <td>
                          <span className="guest-status-badge">
                            {guest.status || guest.Status || "Active"}
                          </span>
                        </td>

                        <td>
  <div className="guest-actions">

    {/* View Icon */}
    <button
      type="button"
      className="guest-action-icon view"
      title="View Guest"
      aria-label="View Guest"
      onClick={() => openGuestDetails(guest)}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </button>

    {/* Edit Icon */}
    <button
      type="button"
      className="guest-action-icon edit"
      title="Edit Guest"
      aria-label="Edit Guest"
      onClick={() => editGuest(guest)}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20h9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>

    {/* Delete Icon */}
    <button
      type="button"
      className="guest-action-icon delete"
      title="Delete Guest"
      aria-label="Delete Guest"
      onClick={() => deleteGuest(guest)}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M3 6h18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 6V4h8v2m3 0-1 14H6L5 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 11v5m4-5v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>

  </div>
</td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>
        )}

        {/* GUEST PAGINATION */}
        {!loading && filteredGuests.length > 0 && (
          <div className="guest-pagination">

            <div className="guest-page-info">
              Showing <strong>{firstRecord}–{lastRecord}</strong> of{" "}
              <strong>{filteredGuests.length}</strong> guests
            </div>

            <div className="guest-pagination-controls">

              <select
                className="guest-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
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
                className="guest-page-button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((page) => page - 1)
                }
              >
                Previous
              </button>

              {Array.from(
                { length: Math.min(5, totalPages) },
                (_, index) =>
                  Math.max(
                    1,
                    Math.min(currentPage - 2, totalPages - 4)
                  ) + index
              ).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={`guest-page-button ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="guest-page-button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => page + 1)
                }
              >
                Next
              </button>

            </div>
          </div>
        )}
      </div>
      {/* Add / Edit Guest Modal */}
      {showForm && (
        <div className="guest-modal-overlay">
          <div className="guest-modal">

            <div className="guest-modal-heading">
              <div>
                <h2>
                  {editingId ? "Edit Guest" : "Add New Guest"}
                </h2>
                <p>Enter guest information below.</p>
              </div>

              <button
                type="button"
                className="guest-close-button"
                onClick={() => {
                  setShowForm(false);
                  resetPhotoSelection();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitGuest}>

              {/* Guest Photo */}
              <div className="guest-photo-upload">
                <div className="guest-photo-preview">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Guest preview"
                    />
                  ) : (
                    <span>
                      {form.fullName
                        ? form.fullName.charAt(0).toUpperCase()
                        : "G"}
                    </span>
                  )}
                </div>

                <div className="guest-photo-controls">
                  <strong>Guest Photo</strong>
                  <p>JPG, PNG or WEBP. Maximum 5 MB.</p>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                  />

                  {photoFile && (
                    <button
                      type="button"
                      onClick={resetPhotoSelection}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="guest-form">

                <label>
                  Full Name *
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Email *
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email"
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </label>

                <label>
                  Nationality
                  <input
                    name="nationality"
                    value={form.nationality}
                    onChange={handleChange}
                    placeholder="Enter nationality"
                  />
                </label>
                <label>
  Guest Type *
  <label>
  Guest Rating
  <select
    name="rating"
    value={form.rating}
    onChange={handleChange}
  >
    <option value="">Not Rated</option>
    <option value="1">⭐ 1 Star</option>
    <option value="2">⭐⭐ 2 Stars</option>
    <option value="3">⭐⭐⭐ 3 Stars</option>
    <option value="4">⭐⭐⭐⭐ 4 Stars</option>
    <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
  </select>
</label>
  <select
    name="guestType"
    value={form.guestType}
    onChange={handleChange}
    required
  >
    <option value="Regular">Regular</option>
    <option value="VIP">VIP</option>
    <option value="Corporate">Corporate</option>
  </select>
</label>

                <label>
                  Date of Birth
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Gender
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label><label>
                  Identification Type
                  <select
                    name="identificationType"
                    value={form.identificationType}
                    onChange={handleChange}
                  >
                    <option value="">Select ID type</option>
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving Licence">
                      Driving Licence
                    </option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Identification Number
                  <input
                    name="identificationNumber"
                    value={form.identificationNumber}
                    onChange={handleChange}
                    placeholder="Enter ID number"
                  />
                </label>

                <label className="guest-address-field">
                  Address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter address"
                    rows={3}
                  />
                </label>

              </div>

              <div className="guest-form-actions">
                <button
                  type="button"
                  className="guest-secondary-btn"
                  onClick={() => {
                    setShowForm(false);
                    resetPhotoSelection();
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="guest-primary-btn"
                  disabled={saving || photoUploading}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Guest"
                    : "Save Guest"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
     
{showBookingForm && (
  <div className="guest-modal-overlay">
    <div className="guest-modal">
      <div className="guest-modal-heading">
        <div>
          <h2>Book a Room</h2>
          <p>
            Guest details have been saved. Complete the room reservation.
          </p>
        </div>

        <button
          type="button"
          className="guest-close-button"
          onClick={() => {
            setShowBookingForm(false);
            setBookingGuestId(null);
          }}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleGuestBooking}>
        <div className="guest-form">
          <label>
            Check-in Date *
            <input
              type="date"
              value={bookingForm.checkInDate}
              min={getToday()}
              onChange={async (event) => {
                const checkInDate = event.target.value;

                const next = {
                  ...bookingForm,
                  checkInDate,
                  roomId: "",
                };

                if (next.checkOutDate <= checkInDate) {
                  const date = new Date(`${checkInDate}T00:00:00`);
                  date.setDate(date.getDate() + 1);

                  next.checkOutDate =
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                }

                setBookingForm(next);

                if (next.checkOutDate > next.checkInDate) {
                  await loadBookingRooms(
                    next.checkInDate,
                    next.checkOutDate
                  );
                }
              }}
              required
            />
          </label>

          <label>
            Check-out Date *
            <input
              type="date"
              value={bookingForm.checkOutDate}
              min={bookingForm.checkInDate}
              onChange={async (event) => {
                const checkOutDate = event.target.value;

                setBookingForm((prev) => ({
                  ...prev,
                  checkOutDate,
                  roomId: "",
                }));

                if (checkOutDate > bookingForm.checkInDate) {
                  await loadBookingRooms(
                    bookingForm.checkInDate,
                    checkOutDate
                  );
                }
              }}
              required
            />
          </label>

          <label>
            Number of Guests *
            <input
              type="number"
              min="1"
              value={bookingForm.guestsCount}
              onChange={(event) =>
                setBookingForm((prev) => ({
                  ...prev,
                  guestsCount: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Select Available Room *
            <select
              value={bookingForm.roomId}
              onChange={(event) =>
                setBookingForm((prev) => ({
                  ...prev,
                  roomId: event.target.value,
                }))
              }
              required
            >
              <option value="">Select Available Room</option>

              {bookingRooms.map((room) => {
                const roomId = room.id ?? room.Id;

                return (
                  <option key={roomId} value={roomId}>
                    Room {room.roomNumber ?? room.RoomNumber ?? roomId}
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

            {bookingRooms.length === 0 && (
              <small>No available rooms for these dates.</small>
            )}
          </label>
        </div>

        {error && (
          <div className="guest-alert guest-alert-error">
            {error}
          </div>
        )}

        <div className="guest-form-actions">
          <button
            type="button"
            className="guest-secondary-btn"
            onClick={() => {
              setShowBookingForm(false);
              setBookingGuestId(null);
              setError("");
            }}
          >
            Skip for now
          </button>

          <button
            type="submit"
            className="guest-primary-btn"
            disabled={bookingSaving || bookingRooms.length === 0}
          >
            {bookingSaving ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Guest Details */}
      {selectedGuest && (
        <div
          className="guest-drawer-backdrop"
          onClick={closeGuestDetails}
        >
          <div
            className="guest-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guest-drawer-heading">
              <h2>Guest Details</h2>

              <button onClick={closeGuestDetails}>
                ×
              </button>
            </div>

            <div className="guest-profile">
              {selectedGuestPhoto ? (
                <img
                  src={selectedGuestPhoto}
                  alt={selectedGuestName}
                  className="guest-avatar"
                />
              ) : (
                <div className="guest-avatar">
                  {selectedGuestName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h3>{selectedGuestName}</h3>
                <span>{getGuestType(selectedGuest)}</span>
                <p>
                  {selectedGuest.email ||
                    selectedGuest.Email || "No email"}
                </p>
              </div>
            </div>

            <div className="guest-detail-list">

              <p>
                <strong>Guest ID:</strong>
                <span>{getGuestId(selectedGuest)}</span>
              </p>

              <p>
                <strong>Phone:</strong>
                <span>
                  {selectedGuest.phone ||
                    selectedGuest.Phone || "—"}
                </span>
              </p>

              <p>
                <strong>Address:</strong>
                <span>
                  {selectedGuest.address ||
                    selectedGuest.Address || "—"}
                </span>
              </p>

              <p>
                <strong>Nationality:</strong>
                <span>
                  {selectedGuest.nationality ||
                    selectedGuest.Nationality || "—"}
                </span>
              </p>

              <p>
                <strong>Date of Birth:</strong>
                <span>
                  {formatDate(
                    selectedGuest.dateOfBirth ||
                    selectedGuest.DateOfBirth
                  )}
                </span>
              </p>

              <p>
                <strong>Age:</strong>
                <span>{selectedGuestAge}</span>
              </p>

              <p>
                <strong>Gender:</strong>
                <span>
                  {selectedGuest.gender ||
                    selectedGuest.Gender || "—"}
                </span>
              </p>

              <p>
                <strong>Identification:</strong>
                <span>
                  {selectedGuest.identificationType ||
                    selectedGuest.IdentificationType || "—"}
                </span>
              </p>

              <p>
                <strong>ID Number:</strong>
                <span>
                  {selectedGuest.identificationNumber ||
                    selectedGuest.IdentificationNumber || "—"}
                </span>
              </p>

              <p>
                <strong>Total Stays:</strong>
                <span>
                  {selectedGuest.totalStays ||
                    selectedGuest.TotalStays || 0}
                </span>
              </p>

              <p>
                <strong>Last Stay:</strong>
                <span>
                  {formatDate(
                    selectedGuest.lastStay ||
                    selectedGuest.lastStayDate ||
                    selectedGuest.LastStay
                  )}
                </span>
              </p>

              <p>
                <strong>Status:</strong>
                <span>
                  {selectedGuest.status ||
                    selectedGuest.Status || "Active"}
                </span>
              </p>

            </div>

            <div className="guest-drawer-actions">

              <button
                className="guest-secondary-btn"
                onClick={() => {
                  closeGuestDetails();
                  editGuest(selectedGuest);
                }}
              >
                Edit Guest
              </button>

              <button
                className="guest-primary-btn"
                onClick={() => navigate("/bookings")}
              >
                New Booking
              </button>

              <button
                className="guest-secondary-btn"
                onClick={() => navigate("/check-in")}
              >
                Check-in
              </button>

              <button
                className="guest-secondary-btn"
                onClick={() => navigate("/billing")}
              >
                View Folio
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Guests;