import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Outlet
} from "react-router-dom";

import Layout from "./components/layout/Layout.jsx";

import Login from "./pages/Login/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Bookings from "./pages/Bookings/Bookings.jsx";
import Rooms from "./pages/Rooms/Rooms.jsx";
import RoomCalendar from "./pages/Calendar/RoomCalendar.jsx";
import Guests from "./pages/Guests/Guests.jsx";
import Maintenance from "./pages/Maintenance/Maintenance.jsx";
import CheckIn from "./pages/CheckIn/CheckIn.jsx";
import CheckOut from "./pages/CheckOut/CheckOut.jsx";
import Billing from "./pages/Billing/Billing.jsx";
import Payments from "./pages/Payments/Payments.jsx";
import Reports from "./pages/Reports/Reports.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import BookRoom from "./pages/BookRoom.jsx";
import Housekeeping from "./pages/Housekeeping/Housekeeping.jsx";
import Users from "./pages/Users/Users.jsx";
import RoleManagement from "./pages/RoleManagement/RoleManagement.jsx";


function ProtectedLayout() {
  const token =
    localStorage.getItem("hotelToken") ||
    sessionStorage.getItem("hotelToken");

  return token ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedLayout />}>

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
          

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/rooms" element={<Rooms />} />

          <Route path="/maintenance" element={<Maintenance />} />

          <Route path="/calendar" element={<RoomCalendar />} />

          <Route path="/bookings" element={<Bookings />} />

          <Route path="/guests" element={<Guests />} />

          <Route path="/checkin" element={<CheckIn />} />

          <Route path="/checkout" element={<CheckOut />} />

          <Route path="/billing" element={<Billing />} />

          <Route path="/payments" element={<Payments />} />

          <Route path="/reports" element={<Reports />} />

          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<RoleManagement />} />

          <Route path="/settings" element={<Settings />} />
          <Route path="/housekeeping" element={<Housekeeping />} />
        </Route>

        <Route
          path="/book-room"
          element={<BookRoom />}
        />
        
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}