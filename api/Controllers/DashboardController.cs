using api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromQuery] string period = "week")
    {
        // Use UTC consistently with the existing backend.
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var start = period.ToLowerInvariant() switch
        {
            "month" => new DateTime(today.Year, today.Month, 1),
            "year" => new DateTime(today.Year, 1, 1),
            _ => StartOfWeek(today)
        };

        var end = period.ToLowerInvariant() switch
        {
            "month" => start.AddMonths(1),
            "year" => start.AddYears(1),
            _ => start.AddDays(7)
        };

        var rooms = _db.Rooms.Where(r => r.IsActive);

        var totalRooms = await rooms.CountAsync();

        var availableRooms = await rooms.CountAsync(
            r => r.Status == "Available");

        var occupiedRooms = await rooms.CountAsync(
            r => r.Status == "Occupied");

        var reservedRooms = await rooms.CountAsync(
            r => r.Status == "Reserved");

        var cleaningRooms = await rooms.CountAsync(
            r => r.Status == "Cleaning");

        var maintenanceRooms = await rooms.CountAsync(
            r => r.Status == "Maintenance");

        var outOfOrderRooms = await rooms.CountAsync(
            r => r.Status == "Out of Order" ||
                 r.Status == "OutOfOrder");

        var arrivals = await _db.Bookings
    .Where(b => b.CheckInDate >= today &&
                b.CheckInDate < tomorrow &&
                (b.Status == "Confirmed" ||
                 b.Status == "CheckedIn"))
    .CountAsync();

        var departures = await _db.Bookings
            .Where(b => b.CheckOutDate >= today &&
                        b.CheckOutDate < tomorrow &&
                        b.Status == "CheckedIn")
            .CountAsync();

        var upcomingBookings = await _db.Bookings
            .CountAsync(b =>
                b.CheckInDate >= tomorrow &&
                b.Status == "Confirmed");

        var activeBookings = await _db.Bookings
            .CountAsync(b =>
                b.Status == "Confirmed" ||
                b.Status == "CheckedIn");

        var revenueToday = await _db.Payments
    .Where(p => (p.Status == "Recorded" || p.Status == "Paid") &&
                p.PaidAt >= today &&
                p.PaidAt < tomorrow)
    .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var occupancyRate = totalRooms > 0
            ? Math.Round(occupiedRooms * 100m / totalRooms, 2)
            : 0m;

       var arrivalList = await _db.Bookings
    .AsNoTracking()
    .Where(b => b.CheckInDate >= today &&
                b.CheckInDate < tomorrow &&
                (b.Status == "Confirmed" ||
                 b.Status == "CheckedIn"))
    .OrderBy(b => b.CheckInDate)
    .Select(b => new
    {
        id = b.Id,
        guest = b.Guest != null
            ? b.Guest.FullName : "Guest",
        roomNumber = b.Room != null
            ? b.Room.RoomNumber : "",
        roomType = b.Room != null &&
                   b.Room.RoomType != null
            ? b.Room.RoomType.Name : "Unassigned",
        time = b.CheckInDate,
        status = b.Status
    })
    .ToListAsync();

        var departureList = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.CheckOutDate >= today &&
                        b.CheckOutDate < tomorrow &&
                        b.Status == "CheckedIn")
            .OrderBy(b => b.CheckOutDate)
            .Select(b => new
            {
                id = b.Id,
                guest = b.Guest != null
                    ? b.Guest.FullName : "Guest",
                roomNumber = b.Room != null
                    ? b.Room.RoomNumber : "",
                roomType = b.Room != null &&
                           b.Room.RoomType != null
                    ? b.Room.RoomType.Name : "Unassigned",
                time = b.CheckOutDate,
                status = b.Status
            })
            .ToListAsync();

        var recentBookings = await _db.Bookings
            .AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Take(5)
            .Select(b => new
            {
                id = b.Id,
                guest = b.Guest != null
                    ? b.Guest.FullName : "Guest",
                roomNumber = b.Room != null
                    ? b.Room.RoomNumber : "",
                roomType = b.Room != null &&
                           b.Room.RoomType != null
                    ? b.Room.RoomType.Name : "Unassigned",
                checkInDate = b.CheckInDate,
                checkOutDate = b.CheckOutDate,
                totalAmount = b.TotalAmount,
                status = b.Status
            })
            .ToListAsync();

        // Group actual recorded payments by day.
        var paymentRows = await _db.Payments
            .AsNoTracking()
            .Where(p => (p.Status == "Recorded" ||
                        p.Status == "Paid") &&
                        p.PaidAt >= start &&
                        p.PaidAt < end)
            .GroupBy(p => p.PaidAt.Date)
            .Select(g => new
            {
                date = g.Key,
                total = g.Sum(p => p.Amount)
            })
            .ToListAsync();

        var revenueOverview = Enumerable
            .Range(0, Math.Max(0, (end - start).Days))
            .Select(offset =>
            {
                var date = start.AddDays(offset);
                var row = paymentRows.FirstOrDefault(
                    p => p.date == date);

                return new
                {
                    date = date.ToString("yyyy-MM-dd"),
                    collectedRevenue = row?.total ?? 0m
                };
            })
            .ToList();

        return Ok(new
        {
            totalRooms,
            availableRooms,
            occupiedRooms,
            reservedRooms,
            cleaningRooms,
            maintenanceRooms,
            outOfOrderRooms,
            activeBookings,
            arrivals,
            departures,
            upcomingBookings,
            revenueToday,
            occupancyRate,
            roomStatus = new
            {
                available = availableRooms,
                occupied = occupiedRooms,
                reserved = reservedRooms,
                cleaning = cleaningRooms,
                maintenance = maintenanceRooms,
                outOfOrder = outOfOrderRooms
            },
            todayArrivals = arrivalList,
            todayDepartures = departureList,
            recentBookings,
            revenueOverview,
            revenuePeriod = period
        });
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var daysSinceMonday =
            ((int)date.DayOfWeek + 6) % 7;

        return date.AddDays(-daysSinceMonday);
    }
}