import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
Hotel,
LayoutDashboard,
BedDouble,
CalendarDays,
BookOpen,
Users,
LogIn,
LogOut,
ChartNoAxesCombined,
UserCog,
ShieldCheck,
Receipt,
CreditCard
} from "lucide-react";

import api from "../../services/Services.jsx";
import "./Sidebar.css";

const links = [
["Dashboard", "/dashboard", LayoutDashboard, null, null],
["Room Management", "/rooms", BedDouble, "Rooms", "View"],
["Booking Management", "/bookings", BookOpen, "Bookings", "View"],
["Room Calendar", "/calendar", CalendarDays, "Bookings", "View"],
["Guest Management", "/guests", Users, "Guests", "View"],
["Check In", "/checkin", LogIn, "CheckIn", "View"],
["Check Out", "/checkout", LogOut, "CheckOut", "View"],
["Billing Management", "/billing", Receipt, "Billing", "View"],
["Payments", "/payments", CreditCard, "Payments", "View"],
["Role Management", "/roles", ShieldCheck, "Roles", "View"],
["Reports", "/reports", ChartNoAxesCombined, "Reports", "View"],
["Users", "/users", UserCog, null, null]
];

export default function Sidebar() {
const navigate = useNavigate();

const [permissions, setPermissions] = useState([]);
const [role, setRole] = useState("");
const [loadingPermissions, setLoadingPermissions] = useState(true);

useEffect(() => {
try {
const savedUser =
localStorage.getItem("hotelUser") ||
sessionStorage.getItem("hotelUser") ||
"{}";

  const user = JSON.parse(savedUser);

  setRole(
    String(
      user.roleName ||
      user.role ||
      user.RoleName ||
      user.Role ||
      ""
    ).toLowerCase()
  );
} catch {
  setRole("");
}

async function loadPermissions() {
  try {
    const response = await api.get("/Permissions/my");
    setPermissions(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    console.error("Unable to load user permissions:", error);
    setPermissions([]);
  } finally {
    setLoadingPermissions(false);
  }
}

loadPermissions();

}, []);

const visibleLinks = links.filter(
([label, path, Icon, requiredModule, requiredPermission]) => {

  // Dashboard and Users are visible to all logged-in users.
  if (!requiredModule) return true;

  // Admin has full sidebar access.
  if (role === "admin") return true;

  // Other roles see only modules with the required permission.
  return permissions.some(
    permission =>
      String(permission.module || "").toLowerCase() ===
        requiredModule.toLowerCase() &&
      String(permission.name || "").toLowerCase() ===
        requiredPermission.toLowerCase()
  );
}

);

function logout() {
localStorage.removeItem("hotelToken");
localStorage.removeItem("hotelUser");
sessionStorage.removeItem("hotelToken");
sessionStorage.removeItem("hotelUser");
navigate("/login");
}

return (
<aside className="sidebar">
<div className="sidebar-content">
<div className="sidebar-brand">
<div className="hotel-brand-icon">
<Hotel size={42} />
</div>

      <h2>The Grand Retreat</h2>
      <span>HOTEL MANAGEMENT</span>
    </div>

    <div className="sidebar-divider" />

    <nav className="sidebar-nav">
      {!loadingPermissions &&
        visibleLinks.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
    </nav>

    <div className="sidebar-bottom">
      <button className="sidebar-logout" onClick={logout}>
        <LogOut size={21} />
        <span>Logout</span>
      </button>
    </div>
  </div>
</aside>

);
}