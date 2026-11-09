HOTEL MANAGEMENT SYSTEM

1. Introduction

The Hotel Management System is a web-based application developed to simplify and automate hotel operations. 
It helps hotel administrators and staff manage room availability, guest information, reservations, check-in, 
check-out, billing, payments, and reports through a centralized system.

The main objective of this project is to reduce manual work, improve accuracy, save time, and provide efficient hotel management.


2. Objectives of the Project

- To manage hotel rooms and room availability.
- To maintain guest information and records.
- To create and manage room bookings.
- To handle guest check-in and check-out.
- To calculate billing and additional charges.
- To manage payments and pending amounts.
- To provide reports for hotel management.
- To manage users, roles, and permissions.
- To display hotel statistics through a dashboard.


3. Technologies Used

Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios
- React Router
- Lucide React

Backend

- C#
- ASP.NET Core Web API
- Entity Framework Core
- Pomelo Entity Framework Core MySQL Provider
- JWT Authentication

Database

- MySQL
- MySQL Workbench

Development Tools

- Visual Studio Code
- Visual Studio / .NET SDK
- MySQL Workbench
- Git and GitHub
- Swagger

4. Modules of the Project

4.1 Dashboard

Displays important hotel information, including room statistics, booking details, occupancy, check-ins, check-outs, and revenue.

4.2 Room Management

- Add new rooms.
- Update room information.
- View room details.
- Manage room types.
- Track room availability and status.

4.3 Booking Management

- Create new bookings.
- Manage guest reservations.
- Select available rooms.
- Confirm or cancel bookings.
- View booking details.

4.4 Room Calendar

- View bookings using a calendar.
- Track room occupancy.
- View reservation dates.
- Monitor room availability.

4.5 Guest Management

- Register new guests.
- Update guest details.
- Store identification information.
- Upload guest photographs.
- Search and view guest records.

4.6 Check-in Management

- View confirmed reservations.
- Verify guest details.
- Complete guest check-in.
- Record advance payments and additional charges.

4.7 Check-out Management

- View in-house guests.
- Calculate room charges.
- Add additional services and charges.
- Calculate applicable GST.
- Record payments.
- Display pending amounts.
- Complete guest check-out.

4.8 Role Management

- Create and manage roles.
- Assign permissions.
- Control access to application modules.

4.9 Reports

- Booking reports.
- Room occupancy reports.
- Revenue reports.
- Room type reports.
- Guest reports.
- Financial and tax reports.

4.10 User Management

- Create users.
- Update user information.
- Manage user accounts.
- Control user access.

5. Project Architecture

The application follows a three-layer architecture:

1. Presentation Layer: React frontend for user interaction.
2. Application Layer: ASP.NET Core Web API for business logic and data processing.
3. Database Layer: MySQL for storing application information.

6. Database Information

- Database Management System: MySQL
- Database Name: hotelmanagement
- ORM: Entity Framework Core

The database stores information related to:

- Users
- Roles
- Permissions
- Rooms
- Room Types
- Guests
- Bookings
- Check-in Records
- Check-out Records
- Additional Charges
- Payments
- Hotel Settings
- Notifications

7. Authentication and Security

- JWT-based authentication.
- Protected application routes.
- Role-based access control.
- Permission-based authorization.
- Secure configuration of database credentials and JWT secrets.

8. Installation and Execution

Prerequisites

- Node.js and npm
- .NET SDK 9.0
- MySQL Server
- MySQL Workbench
- Visual Studio Code

Backend Setup

cd api
dotnet restore
dotnet build
dotnet run

Frontend Setup

Open another terminal:

cd ui
npm install
npm run dev

Application URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:5178
- API Documentation: http://localhost:5178/swagger

9. Expected Outcome

The expected outcome is a functional Hotel Management System that provides an organized way to manage hotel operations, 
improves efficiency, reduces manual errors, and provides accurate information for hotel administrators and staff.

10. Future Enhancements

- Advanced analytics and reporting.
- Customer feedback and review management.

11. Conclusion

The Hotel Management System provides an integrated solution for managing hotel activities. 
By using React, ASP.NET Core Web API, and MySQL, the application aims to provide a user-friendly, 
reliable, and efficient platform for hotel administration.


---

Project Name: Hotel Management System
Frontend: React.js
Backend: ASP.NET Core Web API
Database: MySQL
Project Status: Completed.

Login Credentails:

ADMIN:
 Email: admin@hotel.com
 Password: Admin@123

 MANAGER:
  Email: Manager@hotel.com
  Password : Manager@123