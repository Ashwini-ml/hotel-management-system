import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  UserCircle,
  X,
  CheckCheck,
  ClipboardList,
  Users,
  BedDouble,
  CreditCard,
  LogIn,
  LogOut,
  Trash2,
  Check,
} from "lucide-react";

import api from "../../services/Services.jsx";
import "./Topbar.css";

const managementPages = [
  { name: "Dashboard", path: "/", keywords: "home overview" },
  { name: "Room Management", path: "/rooms", keywords: "rooms beds availability" },
  { name: "Guest Management", path: "/guests", keywords: "guests customers" },
  { name: "Booking Management", path: "/bookings", keywords: "booking reservation" },
  { name: "Check-In Management", path: "/checkin", keywords: "checkin arrival" },
  { name: "Check-Out Management", path: "/checkout", keywords: "checkout departure" },
  { name: "Payments Management", path: "/payments", keywords: "payments transactions" },
  { name: "Reports Management", path: "/reports", keywords: "reports revenue" },
];

const getArray = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const getField = (item, lower, upper) =>
  item?.[lower] ?? item?.[upper];

const getNotificationIcon = (type) => {
  switch (String(type || "").toLowerCase()) {
    case "booking":
      return ClipboardList;
    case "guest":
      return Users;
    case "checkin":
      return LogIn;
    case "checkout":
      return LogOut;
    case "payment":
      return CreditCard;
    case "room":
    case "maintenance":
      return BedDouble;
    default:
      return Bell;
  }
};

const formatTime = (date) => {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Recently";

  const difference = Math.max(0, Date.now() - parsed.getTime());
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return parsed.toLocaleDateString("en-IN");
};

export default function Topbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  
  useEffect(() => {
    try {
      const rawUser =
        localStorage.getItem("hotelUser") ||
        sessionStorage.getItem("hotelUser");

      setUser(rawUser ? JSON.parse(rawUser) : null);
    } catch {
      setUser(null);
    }
  }, []);

  
  useEffect(() => {
    let active = true;

    const loadSearchData = async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const [guestResponse, bookingResponse] = await Promise.all([
          api.get("/Guests"),
          api.get("/Booking"),
        ]);

        if (!active) return;

        setGuests(getArray(guestResponse));
        setBookings(getArray(bookingResponse));
      } catch (error) {
        if (!active) return;

        console.error("Global search loading error:", error);
        setSearchError("Could not load hotel records. Please check your API.");
      } finally {
        if (active) setSearchLoading(false);
      }
    };

    loadSearchData();

    return () => {
      active = false;
    };
  }, []);

  
  useEffect(() => {
    let active = true;

    const loadNotifications = async (showLoader = false) => {
      if (showLoader && active) {
        setNotificationLoading(true);
      }

      try {
        const response = await api.get("/Notifications");

        if (!active) return;

        setNotifications(getArray(response));
        setNotificationError("");
      } catch (error) {
        if (!active) return;

        console.error("Notification loading error:", error);
        setNotificationError("Could not load notifications.");
      } finally {
        if (active && showLoader) {
          setNotificationLoading(false);
        }
      }
    };

    loadNotifications(true);

    
    const interval = setInterval(() => {
      loadNotifications(false);
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    const results = [];

    managementPages.forEach((page) => {
      const searchable = `${page.name} ${page.keywords}`.toLowerCase();

      if (searchable.includes(query)) {
        results.push({
          key: `page-${page.path}`,
          type: "Management",
          title: page.name,
          detail: "Open management page",
          icon: ClipboardList,
          path: page.path,
        });
      }
    });

    guests.forEach((guest) => {
      const id = guest.id ?? guest.Id ?? guest.guestId ?? guest.GuestId;
      const name =
        guest.fullName ?? guest.FullName ?? guest.name ?? guest.Name ?? "";

      const phone = guest.phone ?? guest.Phone ?? "";
      const email = guest.email ?? guest.Email ?? "";

      const searchable = `${name} ${id ?? ""} ${phone} ${email}`.toLowerCase();

      if (searchable.includes(query)) {
        results.push({
          key: `guest-${id}`,
          type: "Guest",
          title: name || `Guest ${id}`,
          detail: `Guest ID: ${id ?? "—"} • Phone: ${phone || "—"}`,
          icon: Users,
          path: "/guests",
          state: { searchTerm: String(id ?? name) },
        });
      }
    });

    bookings.forEach((booking) => {
      const id =
        booking.id ?? booking.Id ?? booking.bookingId ?? booking.BookingId;

      const guestId =
        booking.guestId ??
        booking.GuestId ??
        booking.guest?.id ??
        booking.guest?.Id ??
        "";

      const guestName =
        booking.guestName ??
        booking.GuestName ??
        booking.guest?.fullName ??
        booking.guest?.FullName ??
        "";

      const roomNumber =
        booking.roomNumber ??
        booking.RoomNumber ??
        booking.room?.roomNumber ??
        booking.room?.RoomNumber ??
        "";

      const searchable =
        `${guestName} ${guestId} ${roomNumber} ${id ?? ""}`.toLowerCase();

      if (searchable.includes(query)) {
        results.push({
          key: `booking-${id}`,
          type: "Booking",
          title: guestName || `Booking ${id}`,
          detail: `Guest ID: ${guestId || "—"} • Room: ${roomNumber || "—"}`,
          icon: BedDouble,
          path: "/bookings",
          state: {
            searchTerm: String(roomNumber || guestId || guestName),
          },
        });
      }
    });

    return results.slice(0, 15);
  }, [search, guests, bookings]);

  const unreadCount = notifications.filter(
    (item) => !getField(item, "isRead", "IsRead")
  ).length;

  const openResult = (result) => {
    navigate(result.path, {
      state: result.state || {},
    });

    setSearch("");
    setShowResults(false);
  };


  const markAsRead = async (id) => {
    try {
      await api.put(`/Notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          Number(getField(item, "id", "Id")) === Number(id)
            ? { ...item, isRead: true, IsRead: true }
            : item
        )
      );
    } catch (error) {
      console.error("Mark notification as read error:", error);
      alert("Could not mark notification as read.");
    }
  };

  
  const markAllRead = async () => {
    try {
      await api.put("/Notifications/mark-all-read");

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          IsRead: true,
        }))
      );
    } catch (error) {
      console.error("Mark all notifications error:", error);
      alert("Could not mark all notifications as read.");
    }
  };

  
  const deleteNotification = async (id) => {
    try {
      await api.delete(`/Notifications/${id}`);

      setNotifications((previous) =>
        previous.filter(
          (item) =>
            Number(getField(item, "id", "Id")) !== Number(id)
        )
      );
    } catch (error) {
      console.error("Delete notification error:", error);
      alert("Could not delete notification.");
    }
  };
  const closePanels = () => {
  setShowResults(false);
  setShowNotifications(false);
  setShowUserMenu(false);
};

  const handleLogout = () => {
  localStorage.removeItem("hotelToken");
  localStorage.removeItem("hotelUser");
  sessionStorage.removeItem("hotelToken");
  sessionStorage.removeItem("hotelUser");

  navigate("/login");
};

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <strong>The Grand Retreat</strong>
        <span className="topbar-subtitle">Hotel Management</span>
      </div>

      <div className="topbar-actions">

        {/* GLOBAL SEARCH */}
        <div className="global-search-wrapper">
          <label className="global-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search guest, ID, room or page..."
              aria-label="Global hotel search"
              value={search}
              onFocus={() => {
                setShowNotifications(false);
                setShowResults(true);
              }}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") closePanels();

                if (e.key === "Enter" && searchResults.length > 0) {
                  openResult(searchResults[0]);
                }
              }}
            />

            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          {showResults && search.trim() && (
            <div className="topbar-search-results">
              <div className="dropdown-heading">SEARCH RESULTS</div>

              {searchLoading ? (
                <div className="search-no-results">
                  Loading hotel records...
                </div>
              ) : searchError ? (
                <div className="search-no-results">{searchError}</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => {
                  const Icon = result.icon;

                  return (
                    <button
                      type="button"
                      className="search-result-item"
                      key={result.key}
                      onClick={() => openResult(result)}
                    >
                      <span className="search-result-icon">
                        <Icon size={17} />
                      </span>

                      <span className="search-result-text">
                        <strong>{result.title}</strong>
                        <small>{result.detail}</small>
                      </span>

                      <span className="search-result-type">
                        {result.type}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="search-no-results">
                  No matching guest, booking, room or page found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* NOTIFICATION BELL */}
        <div className="notification-wrapper">
          <button
            type="button"
            className={`notification-bell ${
              showNotifications ? "active" : ""
            }`}
            aria-label="Notifications"
            onClick={() => {
              setShowResults(false);
              setShowNotifications((previous) => !previous);
            }}
          >
            <Bell size={21} strokeWidth={1.8} />

            {unreadCount > 0 && (
              <span className="notification-count">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-panel">

              <div className="notification-header">
                <div>
                  <strong>Notifications</strong>
                  <small>
                    {unreadCount} unread notification
                    {unreadCount === 1 ? "" : "s"}
                  </small>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="mark-read-button"
                    onClick={markAllRead}
                  >
                    <CheckCheck size={15} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notification-list">

                {notificationLoading ? (
                  <div className="empty-notifications">
                    <Bell size={25} />
                    <strong>Loading notifications...</strong>
                  </div>
                ) : notificationError ? (
                  <div className="search-no-results">
                    {notificationError}
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((item) => {
                    const id = getField(item, "id", "Id");
                    const title = getField(item, "title", "Title");
                    const message = getField(item, "message", "Message");
                    const type = getField(item, "type", "Type");
                    const isRead = getField(item, "isRead", "IsRead");
                    const createdAt = getField(
                      item,
                      "createdAt",
                      "CreatedAt"
                    );

                    const Icon = getNotificationIcon(type);

                    return (
                      <div
                        className={`notification-item ${
                          isRead ? "read" : "unread"
                        }`}
                        key={id}
                      >
                        <div className="notification-icon">
                          <Icon size={18} />
                        </div>

                        <div className="notification-content">
                          <strong>{title}</strong>
                          <p>{message}</p>
                          <small>{formatTime(createdAt)}</small>

                          <div className="notification-item-actions">
                            {!isRead && (
                              <button
                                type="button"
                                onClick={() => markAsRead(id)}
                              >
                                <Check size={13} />
                                Mark read
                              </button>
                            )}

                            <button
                              type="button"
                              className="notification-delete"
                              onClick={() => deleteNotification(id)}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-notifications">
                    <Bell size={27} />
                    <strong>No notifications</strong>
                    <span>You're all caught up.</span>
                  </div>
                )}

              </div>

              <div className="notification-footer">
                <span>Showing latest notifications</span>
              </div>

            </div>
          )}
        </div>

        {/* USER ACCOUNT */}
<div className="user-account-wrapper">
  <button
    type="button"
    className="user-info"
    onClick={() => setShowUserMenu((previous) => !previous)}
    aria-expanded={showUserMenu}
    aria-label="Open user account"
  >
    <UserCircle size={25} />

    <span>
      <strong>
        {user?.name || user?.Name || "Hotel User"}
      </strong>
      <small>
        {user?.role || user?.Role || user?.roleName || "User"}
      </small>
    </span>
  </button>

  {showUserMenu && (
    <div className="user-account-dropdown">
      <div className="user-dropdown-heading">
        <UserCircle size={32} />
        <div>
          <strong>{user?.name || user?.Name || "Hotel User"}</strong>
          <small>
            {user?.role || user?.Role || user?.roleName || "User"}
          </small>
        </div>
      </div>

      <div className="user-dropdown-divider" />

      <button
        type="button"
        className="user-logout-button"
        onClick={handleLogout}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  )}
</div>

      </div>

      {showResults && (
        <button
          type="button"
          className="topbar-outside-click"
          aria-label="Close search results"
          onClick={closePanels}
        />
      )}
    </header>
  );
  
}