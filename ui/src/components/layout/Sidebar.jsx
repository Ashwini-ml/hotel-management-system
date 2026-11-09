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

import "./Sidebar.css";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Room Management", "/rooms", BedDouble],
  ["Booking Management", "/bookings", BookOpen],
  ["Room Calendar", "/calendar", CalendarDays],
  ["Guest Management", "/guests", Users],
  ["Check In", "/checkin", LogIn],
  ["Check Out", "/checkout", LogOut],
  ["Billing Management", "/billing", Receipt],
  ["Payments", "/payments", CreditCard],
  ["Role Management", "/roles", ShieldCheck],
  ["Reports", "/reports", ChartNoAxesCombined],
  ["Users", "/users", UserCog]
];

export default function Sidebar() {
  const navigate = useNavigate();

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
          {links.map(([label, path, Icon]) => (
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