import { useEffect, useMemo, useState } from "react";
import api from "../../services/Services.jsx";
import "./Housekeeping.css";

function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRooms = async () => {
    try {
      setError("");
      const response = await api.get("/Housekeeping");
      setRooms(response.data);
    } catch (err) {
      console.error("Housekeeping loading error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load rooms. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const updateStatus = async (roomId, cleaningStatus) => {
    try {
      setUpdatingId(roomId);
      setError("");
      setMessage("");

      const response = await api.put(
        `/Housekeeping/${roomId}/status`,
        { cleaningStatus }
      );

      setRooms((previousRooms) =>
        previousRooms.map((room) =>
          room.id === roomId
            ? {
                ...room,
                roomStatus: response.data.roomStatus,
                cleaningStatus: response.data.cleaningStatus
              }
            : room
        )
      );

      setMessage(response.data.message);
    } catch (err) {
      console.error("Housekeeping update error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to update housekeeping status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: rooms.length,
    dirty: rooms.filter(r => r.cleaningStatus === "Dirty").length,
    cleaning: rooms.filter(r => r.cleaningStatus === "Cleaning").length,
    clean: rooms.filter(r => r.cleaningStatus === "Clean").length
  }), [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.roomNumber?.toLowerCase().includes(search.toLowerCase()) ||
        room.roomType?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || room.cleaningStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [rooms, search, filter]);

  return (
    <div className="housekeeping-page">
      <div className="housekeeping-header">
        <div>
          <p className="housekeeping-eyebrow">ROOM OPERATIONS</p>
          <h1>Housekeeping</h1>
          <p className="housekeeping-subtitle">
            Manage room cleaning and housekeeping activities.
          </p>
        </div>

        <button
          className="housekeeping-refresh"
          onClick={() => {
            setLoading(true);
            loadRooms();
          }}
          disabled={loading}
        >
          ↻ Refresh Rooms
        </button>
      </div>

      {error && (
        <div className="housekeeping-alert error">
          {error}
        </div>
      )}

      {message && (
        <div className="housekeeping-alert success">
          {message}
        </div>
      )}

      <div className="housekeeping-stats">
        <div className="housekeeping-stat">
          <div className="stat-icon">▦</div>
          <div>
            <p>Total Rooms</p>
            <h2>{stats.total}</h2>
            <small>Active rooms</small>
          </div>
        </div>

        <div className="housekeeping-stat stat-dirty">
          <div className="stat-icon">!</div>
          <div>
            <p>Dirty Rooms</p>
            <h2>{stats.dirty}</h2>
            <small>Waiting for cleaning</small>
          </div>
        </div>

        <div className="housekeeping-stat stat-cleaning">
          <div className="stat-icon">◷</div>
          <div>
            <p>Cleaning</p>
            <h2>{stats.cleaning}</h2>
            <small>Currently being cleaned</small>
          </div>
        </div>

        <div className="housekeeping-stat stat-clean">
          <div className="stat-icon">✓</div>
          <div>
            <p>Clean Rooms</p>
            <h2>{stats.clean}</h2>
            <small>Ready for guests</small>
          </div>
        </div>
      </div>

      <div className="housekeeping-table-panel">
        <div className="housekeeping-panel-header">
          <div>
            <h2>Room Cleaning Status</h2>
            <p>Live housekeeping information from your rooms database.</p>
          </div>

          <span className="housekeeping-result-count">
            {filteredRooms.length} Rooms
          </span>
        </div>

        <div className="housekeeping-filters">
          <input
            type="text"
            placeholder="Search room number or room type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Cleaning Status</option>
            <option value="Dirty">Dirty</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Clean">Clean</option>
          </select>
        </div>

        <div className="housekeeping-table-scroll">
          <table className="housekeeping-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Room Type</th>
                <th>Room Status</th>
                <th>Cleaning Status</th>
                <th>Update</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="housekeeping-empty">
                    Loading rooms...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="housekeeping-empty">
                    No rooms found.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <span className="housekeeping-room-icon">▣</span>
                      <strong>{room.roomNumber}</strong>
                    </td>

                    <td>{room.roomType || "—"}</td>

                    <td>{room.roomStatus}</td>

                    <td>
                      <span
                        className={`housekeeping-status ${
                          room.cleaningStatus?.toLowerCase()
                        }`}
                      >
                        <span className="status-dot"></span>
                        {room.cleaningStatus}
                      </span>
                    </td>

                    <td>
                      <div className="housekeeping-actions">
                        {room.cleaningStatus === "Dirty" && (
                          <button
                            className="action-cleaning"
                            disabled={updatingId === room.id}
                            onClick={() =>
                              updateStatus(room.id, "Cleaning")
                            }
                          >
                            {updatingId === room.id
                              ? "Updating..."
                              : "Start Cleaning"}
                          </button>
                        )}

                        {room.cleaningStatus === "Cleaning" && (
                          <button
                            className="action-clean"
                            disabled={updatingId === room.id}
                            onClick={() =>
                              updateStatus(room.id, "Clean")
                            }
                          >
                            {updatingId === room.id
                              ? "Updating..."
                              : "Mark Clean"}
                          </button>
                        )}

                        {room.cleaningStatus === "Clean" && (
                          <span className="housekeeping-ready">
                            ✓ Ready
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="housekeeping-footer">
          <span>Showing {filteredRooms.length} of {rooms.length} active rooms</span>
          <span className="housekeeping-footer-note">
            Changes are saved to the database.
          </span>
        </div>
      </div>
    </div>
  );
}

export default Housekeeping;