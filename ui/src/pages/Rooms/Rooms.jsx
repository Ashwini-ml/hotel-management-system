import React, { useEffect, useState } from "react";
import api from "../../api";
import "./Rooms.css";

const emptyRoom = {
  roomNumber: "",
  roomTypeId: "",
  status: "Available",
};

const emptyRoomType = {
  name: "",
  capacity: 2,
  baseRate: "",
  description: "",
};

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  const [form, setForm] = useState(emptyRoom);
  const [editingId, setEditingId] = useState(null);

  const [typeForm, setTypeForm] = useState(emptyRoomType);
  const [editingTypeId, setEditingTypeId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
 
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

  
  const loadData = async () => {
    try {
      setError("");

      const [roomsResponse, typesResponse] = await Promise.all([
        api.get("/Rooms"),
        api.get("/RoomTypes"),
      ]);

      setRooms(
        Array.isArray(roomsResponse.data)
          ? roomsResponse.data
          : []
      );

      setRoomTypes(
        Array.isArray(typesResponse.data)
          ? typesResponse.data
          : []
      );
    } catch (err) {
      console.error("Error loading rooms:", err);

      setError(
        err.response?.data?.message ||
        "Could not load rooms. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleTypeChange = (event) => {
    const { name, value } = event.target;

    setTypeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyRoom);
    setEditingId(null);
    setError("");
    setMessage("");
  };

  
  const resetTypeForm = () => {
    setTypeForm(emptyRoomType);
    setEditingTypeId(null);
    setError("");
    setMessage("");
  };

  
  const handleEdit = (room) => {
    setEditingId(room.id);

    setForm({
      roomNumber: room.roomNumber ?? "",
      roomTypeId: String(room.roomTypeId ?? ""),
      status: room.status ?? "Available",
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.roomNumber.trim()) {
      setError("Please enter a room number.");
      return;
    }

    if (!form.roomTypeId) {
      setError("Please select a room type.");
      return;
    }

    const payload = {
      roomNumber: form.roomNumber.trim(),
      roomTypeId: Number(form.roomTypeId),
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/Rooms/${editingId}`, payload);
        setMessage("Room updated successfully.");
      } else {
        await api.post("/Rooms", payload);
        setMessage("Room added successfully.");
      }

      setForm(emptyRoom);
      setEditingId(null);

      await loadData();
    } catch (err) {
      console.error("Error saving room:", err);

      setError(
        err.response?.data?.message ||
        "Could not save the room."
      );
    } finally {
      setSaving(false);
    }
  };

  // Add or update a room type.
  const handleTypeSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!typeForm.name.trim()) {
      setError("Please enter a room type name.");
      return;
    }

    const capacity = Number(typeForm.capacity);
    const baseRate = Number(typeForm.baseRate);

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
      setError("Capacity must be between 1 and 20.");
      return;
    }

    if (!Number.isFinite(baseRate) || baseRate < 0 || baseRate > 10000000) {
      setError("Please enter a valid base rate.");
      return;
    }

    const payload = {
      name: typeForm.name.trim(),
      capacity,
      baseRate,
      description: typeForm.description.trim() || null,
    };

    setSavingType(true);

    try {
      if (editingTypeId !== null) {
        await api.put(`/RoomTypes/${editingTypeId}`, payload);
        setMessage("Room type updated successfully.");
      } else {
        await api.post("/RoomTypes", payload);
        setMessage("Room type created successfully.");
      }

      setTypeForm(emptyRoomType);
      setEditingTypeId(null);

      await loadData();
    } catch (err) {
      console.error("Error saving room type:", err);

      setError(
        err.response?.data?.message ||
        "Could not save room type. Please check the details."
      );
    } finally {
      setSavingType(false);
    }
  };

  // Edit a room type.
  const handleEditType = (type) => {
    setEditingTypeId(type.id);

    setTypeForm({
      name: type.name ?? "",
      capacity: type.capacity ?? 2,
      baseRate: type.baseRate ?? "",
      description: type.description ?? "",
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Delete a room type.
  const handleDeleteType = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room type?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/RoomTypes/${id}`);

      if (editingTypeId === id) {
        setTypeForm(emptyRoomType);
        setEditingTypeId(null);
      }

      await loadData();

      setMessage("Room type deleted successfully.");
    } catch (err) {
      console.error("Error deleting room type:", err);

      setError(
        err.response?.data?.message ||
        "Could not delete this room type."
      );
    }
  };

  // Activate an inactive room.
  const activateRoom = async (id) => {
    setError("");
    setMessage("");

    try {
      await api.put(`/Rooms/${id}/activate`);
      await loadData();

      setMessage("Room activated successfully.");
    } catch (err) {
      console.error("Error activating room:", err);

      setError(
        err.response?.data?.message ||
        "Could not activate the room."
      );
    }
  };
  // Mark a cleaned room as available.
const markRoomAvailable = async (id) => {
  const confirmed = window.confirm(
    "Has this room been cleaned and inspected? Mark it as Available?"
  );

  if (!confirmed) return;

  setError("");
  setMessage("");

  try {
    await api.put(`/Rooms/${id}/mark-available`);

    await loadData();

    setMessage("Room marked as Available successfully.");
  } catch (err) {
    console.error("Error marking room available:", err);

    setError(
      err.response?.data?.message ||
      "Could not mark the room as Available."
    );
  }
};

  // Deactivate a room.
  const deactivateRoom = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this room?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/Rooms/${id}`);
      await loadData();

      if (editingId === id) {
        resetForm();
      }

      setMessage("Room deactivated successfully.");
    } catch (err) {
      console.error("Error deactivating room:", err);

      setError(
        err.response?.data?.message ||
        "Could not deactivate the room."
      );
    }
  };

  // Search rooms.
  const filteredRooms = rooms.filter((room) => {
    const roomNumber = String(room.roomNumber ?? "").toLowerCase();

    const roomType = String(
      room.roomType?.name ??
      roomTypes.find(
        (type) => Number(type.id) === Number(room.roomTypeId)
      )?.name ??
      ""
    ).toLowerCase();

    const query = search.toLowerCase().trim();

    return roomNumber.includes(query) || roomType.includes(query);
  });
  // Room pagination calculations
const totalPages = Math.max(
  1,
  Math.ceil(filteredRooms.length / pageSize)
);

const startIndex = (currentPage - 1) * pageSize;

const paginatedRooms = filteredRooms.slice(
  startIndex,
  startIndex + pageSize
);

const firstRecord =
  filteredRooms.length === 0 ? 0 : startIndex + 1;

const lastRecord = Math.min(
  startIndex + pageSize,
  filteredRooms.length
);
// Keep current page valid when room count changes
useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [currentPage, totalPages]);

  // Get room type name.
  const getRoomTypeName = (room) => {
    return (
      room.roomType?.name ??
      roomTypes.find(
        (type) => Number(type.id) === Number(room.roomTypeId)
      )?.name ??
      "Unknown"
    );
  };

  // Get room rate.
 const getRoomRate = (room) => {
  const type =
    roomTypes.find(
      (item) => Number(item.id) === Number(room.roomTypeId)
    ) ?? room.roomType;

  return type?.baseRate;
};return (
    <div className="rooms-page">

      {/* PAGE HEADER */}
      <div className="rooms-page-header">
        <div>
          <p className="rooms-eyebrow">HOTEL OPERATIONS</p>
          <h1>Room Management</h1>
          <p className="rooms-subtitle">
            Manage rooms, room types, availability and pricing.
          </p>
        </div>

        <div className="rooms-summary">
          <span className="rooms-summary-label">Total Rooms</span>
          <span className="rooms-summary-value">{rooms.length}</span>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="rooms-alert rooms-alert-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="rooms-alert rooms-alert-success" role="status">
          {message}
        </div>
      )}

      {/* ROOM TYPE MANAGEMENT */}
      <section className="rooms-form-card room-types-card">

        <div className="rooms-section-heading">
          <div>
            <h2>
              {editingTypeId !== null
                ? "Edit Room Type"
                : "Room Type Management"}
            </h2>
            <p>
              Create and manage room categories, capacity and pricing.
            </p>
          </div>
        </div>

        <form onSubmit={handleTypeSubmit} className="rooms-form">

          <div className="rooms-field">
            <label htmlFor="typeName">Room Type Name</label>
            <input
              id="typeName"
              name="name"
              type="text"
              placeholder="e.g. Deluxe, Suite, Duplex"
              value={typeForm.name}
              onChange={handleTypeChange}
              maxLength={100}
              required
            />
          </div>

          <div className="rooms-field">
            <label htmlFor="typeCapacity">Maximum Capacity</label>
            <input
              id="typeCapacity"
              name="capacity"
              type="number"
              min="1"
              max="20"
              value={typeForm.capacity}
              onChange={handleTypeChange}
              required
            />
          </div>

          <div className="rooms-field">
            <label htmlFor="typeBaseRate">Base Rate / Night (₹)</label>
            <input
              id="typeBaseRate"
              name="baseRate"
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              placeholder="e.g. 2500"
              value={typeForm.baseRate}
              onChange={handleTypeChange}
              required
            />
          </div>

          <div className="rooms-field room-type-description">
            <label htmlFor="typeDescription">Description</label>
            <textarea
              id="typeDescription"
              name="description"
              placeholder="Describe this room type..."
              value={typeForm.description}
              onChange={handleTypeChange}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="rooms-form-actions">
            <button
              type="submit"
              className="rooms-btn rooms-btn-primary"
              disabled={savingType}
            >
              {savingType
                ? "Saving..."
                : editingTypeId !== null
                  ? "Update Room Type"
                  : "Add Room Type"}
            </button>

            {editingTypeId !== null && (
              <button
                type="button"
                className="rooms-btn rooms-btn-secondary"
                onClick={resetTypeForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* EXISTING ROOM TYPES */}
        <div className="room-types-list">
          <div className="room-types-list-heading">
            <div>
              <h3>Available Room Types</h3>
              <p>{roomTypes.length} room types registered</p>
            </div>
          </div>

          {roomTypes.length === 0 ? (
            <div className="rooms-empty">
              No room types available. Add your first room type above.
            </div>
          ) : (
            <div className="room-types-grid">
              {roomTypes.map((type) => (
                <div className="room-type-item" key={type.id}>

                  <div className="room-type-item-top">
                    <div className="room-type-icon">
                      <span>⌂</span>
                    </div>

                    <div className="room-type-item-actions">
                      <button
                        type="button"
                        className="rooms-btn rooms-btn-edit"
                        onClick={() => handleEditType(type)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="rooms-btn rooms-btn-deactivate"
                        onClick={() => handleDeleteType(type.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <h3>{type.name}</h3>

                  <div className="room-type-details">
                    <span>
                      Capacity: <strong>{type.capacity} guests</strong>
                    </span>

                    <span>
                      Base Rate:{" "}
                      <strong>
                        ₹{Number(type.baseRate || 0).toLocaleString("en-IN")}
                      </strong>
                    </span>
                  </div>

                  {type.description && (
                    <p className="room-type-description-text">
                      {type.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ADD OR EDIT ROOM */}
      <section className="rooms-form-card">
        <div className="rooms-section-heading">
          <div>
            <h2>
              {editingId !== null ? "Edit Room" : "Add New Room"}
            </h2>
            <p>
              {editingId !== null
                ? `Updating room ID ${editingId}`
                : "Enter the details to register a hotel room."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rooms-form">

          <div className="rooms-field">
            <label htmlFor="roomNumber">Room Number</label>
            <input
              id="roomNumber"
              name="roomNumber"
              type="text"
              placeholder="e.g. 101"
              value={form.roomNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rooms-field">
            <label htmlFor="roomTypeId">Room Type</label>
            <select
              id="roomTypeId"
              name="roomTypeId"
              value={form.roomTypeId}
              onChange={handleChange}
              required
            >
              <option value="">Select room type</option>

              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {editingId !== null && (
            <div className="rooms-field">
              <label htmlFor="status">Room Status</label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          )}

          <div className="rooms-form-actions">
            <button
              type="submit"
              className="rooms-btn rooms-btn-primary"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Add Room"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="rooms-btn rooms-btn-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ALL ROOMS TABLE */}
      <section className="rooms-table-card">

        <div className="rooms-section-heading rooms-list-heading">
          <div>
            <h2>All Rooms</h2>
            <p>View and manage registered rooms.</p>
          </div>

          <input
            className="rooms-search"
            type="search"
            placeholder="Search room or type..."
            value={search}
            onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
            }}
            aria-label="Search rooms"
          />
        </div>

       {loading ? (
  <div className="rooms-empty">Loading rooms...</div>
) : filteredRooms.length === 0 ? (
  <div className="rooms-empty">No rooms found.</div>
) : (
  <>
    <div className="rooms-table-wrapper">
      <table className="rooms-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Room Type</th>
            <th>Rate / Night</th>
            <th>Room Status</th>
            <th>Account Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedRooms.map((room) => {
            const isActive = room.isActive !== false;
            const status = room.status || "Available";
            const rate = getRoomRate(room);

            return (
              <tr key={room.id}>
                <td>
                  <div className="rooms-number">
                    {room.roomNumber}
                  </div>

                  <span className="rooms-id">
                    ID: {room.id}
                  </span>
                </td>

                <td>{getRoomTypeName(room)}</td>

                <td>
                  {rate != null
                    ? `₹${Number(rate).toLocaleString("en-IN")}`
                    : "—"}
                </td>

                <td>
                  {isActive ? (
                    <span
                      className={`rooms-status rooms-status-${status.toLowerCase()}`}
                    >
                      {status}
                    </span>
                  ) : (
                    <span className="rooms-status rooms-status-inactive">
                      Inactive
                    </span>
                  )}
                </td>

                <td>
                  <span
                    className={`rooms-active-badge ${
                      isActive ? "is-active" : "is-inactive"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                <td>
                  <div className="rooms-actions">
                    {isActive && status === "Cleaning" && (
  <button
    type="button"
    className="rooms-btn rooms-btn-activate"
    onClick={() => markRoomAvailable(room.id)}
  >
    Mark Available
  </button>
)}
                    <button
                      type="button"
                      className="rooms-icon-button rooms-edit-icon"
                      title="Edit Room"
                      aria-label="Edit Room"
                      onClick={() => handleEdit(room)}
                    >
                      ✎
                    </button>

                    {isActive ? (
                      <button
                        type="button"
                        className="rooms-icon-button rooms-deactivate-icon"
                        title="Deactivate Room"
                        aria-label="Deactivate Room"
                        onClick={() => deactivateRoom(room.id)}
                      >
                        ⊖
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rooms-btn rooms-btn-activate"
                        onClick={() => activateRoom(room.id)}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* ROOM PAGINATION */}
    <div className="rooms-pagination">

      <div className="rooms-page-info">
        Showing <strong>{firstRecord}–{lastRecord}</strong> of{" "}
        <strong>{filteredRooms.length}</strong> rooms
      </div>

      <div className="rooms-pagination-controls">

        <select
          className="rooms-page-size"
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
          className="rooms-page-button"
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
            className={`rooms-page-button ${
              currentPage === page ? "active" : ""
            }`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="rooms-page-button"
          disabled={currentPage === totalPages}
          onClick={() =>
            setCurrentPage((page) => page + 1)
          }
        >
          Next
        </button>

      </div>
    </div>
  </>
)}
      </section>
    </div>
  );
}

export default Rooms;