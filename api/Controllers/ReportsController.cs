

using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    private static DateTime Today => DateTime.Today;

    private static bool ValidRange(DateTime from, DateTime to)
    {
        return to.Date > from.Date &&
               (to.Date - from.Date).TotalDays <= 366;
    }

    private static decimal ChangePercent(decimal current, decimal previous)
    {
        if (previous == 0)
            return current == 0 ? 0 : 100;

        return Math.Round(
            (current - previous) / Math.Abs(previous) * 100m, 2);
    }

    private static decimal ChangePercent(int current, int previous)
    {
        return ChangePercent((decimal)current, (decimal)previous);
    }

    private IQueryable<Booking> FilterBookings(
        DateTime from,
        DateTime to,
        int? roomTypeId = null)
    {
        var query = _db.Bookings
            .AsNoTracking()
            .Where(b => b.CreatedAt >= from && b.CreatedAt < to);

        if (roomTypeId.HasValue)
        {
            query = query.Where(b =>
                b.Room != null &&
                b.Room.RoomTypeId == roomTypeId.Value);
        }

        return query;
    }

    // 1. BOOKING REPORT
    // GET /api/Reports/bookings?from=2026-10-01&to=2026-10-16
    [HttpGet("bookings")]
    public async Task<IActionResult> BookingReport(
        DateTime from,
        DateTime to)
    {
        if (!ValidRange(from, to))
        {
            return BadRequest(new
            {
                message = "Use a valid date range of up to one year."
            });
        }

        var rows = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.CreatedAt >= from && b.CreatedAt < to)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                Guest = b.Guest != null ? b.Guest.FullName : "Unknown",
                Room = b.Room != null ? b.Room.RoomNumber : "Unassigned",
                RoomType = b.Room != null && b.Room.RoomType != null
                    ? b.Room.RoomType.Name
                    : "Unknown",
                b.CheckInDate,
                b.CheckOutDate,
                b.Status,
                b.TotalAmount,
                b.CreatedAt
            })
            .ToListAsync();

        return Ok(rows);
    }

    // 2. BOOKING CSV EXPORT
    // GET /api/Reports/bookings/csv?from=2026-10-01&to=2026-10-16
    [HttpGet("bookings/csv")]
    public async Task<IActionResult> BookingCsv(
        DateTime from,
        DateTime to)
    {
        if (!ValidRange(from, to))
        {
            return BadRequest(new
            {
                message = "Enter a valid report date range."
            });
        }

        var rows = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.CreatedAt >= from && b.CreatedAt < to)
            .OrderBy(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                Guest = b.Guest != null ? b.Guest.FullName : "Unknown",
                Room = b.Room != null ? b.Room.RoomNumber : "Unassigned",
                b.CheckInDate,
                b.CheckOutDate,
                b.Status,
                b.TotalAmount
            })
            .ToListAsync();

        static string Escape(string? value)
        {
            value ??= "";

            if (value.Length > 0 && "=+-@".Contains(value[0]))
                value = "'" + value;

            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        var csv = new StringBuilder();
        csv.AppendLine(
            "Booking ID,Guest,Room,Check-in,Check-out,Status,Total");

        foreach (var row in rows)
        {
            csv.AppendLine(string.Join(",", new[]
            {
                row.Id.ToString(CultureInfo.InvariantCulture),
                Escape(row.Guest),
                Escape(row.Room),
                Escape(row.CheckInDate.ToString("yyyy-MM-dd")),
                Escape(row.CheckOutDate.ToString("yyyy-MM-dd")),
                Escape(row.Status),
                row.TotalAmount.ToString(CultureInfo.InvariantCulture)
            }));
        }

        var bytes = Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv.ToString()))
            .ToArray();

        return File(
            bytes,
            "text/csv; charset=utf-8",
            $"booking-report-{from:yyyyMMdd}-{to:yyyyMMdd}.csv");
    }

    // 3. ROOM TYPES
    // GET /api/Reports/room-types
    [HttpGet("room-types")]
    public async Task<IActionResult> RoomTypes()
    {
        var rows = await _db.RoomTypes
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                id = r.Id,
                name = r.Name
            })
            .ToListAsync();

        return Ok(rows);
    }

    // 4. OWNER SUMMARY
    // GET /api/Reports/owner-summary
    [HttpGet("owner-summary")]
    public async Task<IActionResult> OwnerSummary(
        DateTime? from = null,
        DateTime? to = null,
        int? roomTypeId = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? Today.AddDays(-29)).Date;

        if (!ValidRange(start, end))
        {
            return BadRequest(new { message = "Invalid report period." });
        }

        var previousLength = (end - start).Days;
        var previousStart = start.AddDays(-previousLength);

        var currentBookings = FilterBookings(start, end, roomTypeId);
        var previousBookings =
            FilterBookings(previousStart, start, roomTypeId);

        var bookingCount = await currentBookings.CountAsync();
        var previousBookingCount = await previousBookings.CountAsync();

        var revenue = await currentBookings.SumAsync(
            b => (decimal?)b.TotalAmount) ?? 0m;

        var previousRevenue = await previousBookings.SumAsync(
            b => (decimal?)b.TotalAmount) ?? 0m;

        var guestCount = await currentBookings
            .Select(b => b.GuestId)
            .Distinct()
            .CountAsync();

        var previousGuestCount = await previousBookings
            .Select(b => b.GuestId)
            .Distinct()
            .CountAsync();

        var receivedQuery = _db.Payments
            .AsNoTracking()
            .Where(p =>
                p.Status == "Recorded" &&
                p.PaidAt >= start &&
                p.PaidAt < end);

        var previousReceivedQuery = _db.Payments
            .AsNoTracking()
            .Where(p =>
                p.Status == "Recorded" &&
                p.PaidAt >= previousStart &&
                p.PaidAt < start);

        if (roomTypeId.HasValue)
        {
            receivedQuery = receivedQuery.Where(p =>
                p.Booking != null &&
                p.Booking.Room != null &&
                p.Booking.Room.RoomTypeId == roomTypeId.Value);

            previousReceivedQuery = previousReceivedQuery.Where(p =>
                p.Booking != null &&
                p.Booking.Room != null &&
                p.Booking.Room.RoomTypeId == roomTypeId.Value);
        }

        var received = await receivedQuery.SumAsync(
            p => (decimal?)p.Amount) ?? 0m;

        var previousReceived = await previousReceivedQuery.SumAsync(
            p => (decimal?)p.Amount) ?? 0m;

        var pendingBookingsQuery = _db.Bookings
            .AsNoTracking()
            .Where(b =>
                b.Status == "Confirmed" ||
                b.Status == "CheckedIn");

        if (roomTypeId.HasValue)
        {
            pendingBookingsQuery = pendingBookingsQuery.Where(b =>
                b.Room != null &&
                b.Room.RoomTypeId == roomTypeId.Value);
        }

        var pendingBookings = await pendingBookingsQuery
            .Select(b => new { b.Id, b.TotalAmount })
            .ToListAsync();

        var pendingIds = pendingBookings.Select(b => b.Id).ToList();

        var pendingPayments = await _db.Payments
            .AsNoTracking()
            .Where(p =>
                p.Status == "Recorded" &&
                pendingIds.Contains(p.BookingId))
            .GroupBy(p => p.BookingId)
            .Select(g => new
            {
                BookingId = g.Key,
                Paid = g.Sum(p => p.Amount)
            })
            .ToListAsync();

        var pendingPaidLookup = pendingPayments.ToDictionary(
            p => p.BookingId,
            p => p.Paid);

        var pending = pendingBookings.Sum(b =>
            Math.Max(
                0m,
                b.TotalAmount -
                pendingPaidLookup.GetValueOrDefault(b.Id, 0m)));

        var allRooms = _db.Rooms
            .AsNoTracking()
            .Where(r => r.IsActive);

        if (roomTypeId.HasValue)
        {
            allRooms = allRooms.Where(r =>
                r.RoomTypeId == roomTypeId.Value);
        }

        var roomCount = await allRooms.CountAsync();

        var occupied = await allRooms.CountAsync(
            r => r.Status == "Occupied");

        var roomStatus = new
        {
            available = await allRooms.CountAsync(
                r => r.Status == "Available"),
            occupied,
            reserved = await allRooms.CountAsync(
                r => r.Status == "Reserved"),
            cleaning = await allRooms.CountAsync(
                r => r.Status == "Cleaning"),
            maintenance = await allRooms.CountAsync(
                r => r.Status == "Maintenance"),
            outOfOrder = await allRooms.CountAsync(r =>
                r.Status == "Out of Order" ||
                r.Status == "OutOfOrder")
        };

        var occupancy = roomCount > 0
            ? occupied * 100m / roomCount
            : 0m;

        return Ok(new
        {
            period = new
            {
                from = start,
                to = end.AddDays(-1)
            },
            totalRevenue = revenue,
            previousTotalRevenue = previousRevenue,
            revenueChangePercent = ChangePercent(
                revenue, previousRevenue),
            totalBookings = bookingCount,
            previousTotalBookings = previousBookingCount,
            bookingChangePercent = ChangePercent(
                bookingCount, previousBookingCount),
            totalGuests = guestCount,
            previousTotalGuests = previousGuestCount,
            guestChangePercent = ChangePercent(
                guestCount, previousGuestCount),
            averageOccupancy = Math.Round(occupancy, 2),
            totalPaymentsReceived = received,
            previousPaymentsReceived = previousReceived,
            paymentChangePercent = ChangePercent(
                received, previousReceived),
            pendingPayments = pending,
            pendingPaymentChangePercent = 0m,
            roomCount,
            roomStatus
        });
    }

    // 5. REVENUE TREND
    // GET /api/Reports/revenue-trend
    [HttpGet("revenue-trend")]
    public async Task<IActionResult> RevenueTrend(
        DateTime? from = null,
        DateTime? to = null,
        int? roomTypeId = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
            return BadRequest(new { message = "Invalid date range." });

        var rows = await FilterBookings(start, end, roomTypeId)
            .GroupBy(b => b.CreatedAt.Date)
            .Select(g => new
            {
                date = g.Key,
                revenue = g.Sum(b => b.TotalAmount)
            })
            .ToListAsync();

        var result = Enumerable.Range(0, (end - start).Days)
            .Select(i =>
            {
                var date = start.AddDays(i);
                var row = rows.FirstOrDefault(x => x.date == date);

                return new
                {
                    date = date.ToString("yyyy-MM-dd"),
                    revenue = row?.revenue ?? 0m
                };
            });

        return Ok(result);
    }

    // 6. REVENUE BY ROOM TYPE
    // GET /api/Reports/room-type-revenue
    [HttpGet("room-type-revenue")]
    public async Task<IActionResult> RoomTypeRevenue(
        DateTime? from = null,
        DateTime? to = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
            return BadRequest(new { message = "Invalid date range." });

        var rows = await FilterBookings(start, end)
            .GroupBy(b =>
                b.Room != null && b.Room.RoomType != null
                    ? b.Room.RoomType.Name
                    : "Unknown")
            .Select(g => new
            {
                roomType = g.Key,
                revenue = g.Sum(b => b.TotalAmount)
            })
            .OrderByDescending(x => x.revenue)
            .ToListAsync();

        return Ok(rows);
    }

    // 7. CURRENT OCCUPANCY
    // GET /api/Reports/occupancy
    [HttpGet("occupancy")]
    public async Task<IActionResult> Occupancy()
    {
        var rooms = _db.Rooms
            .AsNoTracking()
            .Where(r => r.IsActive);

        var total = await rooms.CountAsync();
        var occupied = await rooms.CountAsync(
            r => r.Status == "Occupied");

        return Ok(new
        {
            totalRooms = total,
            occupiedRooms = occupied,
            occupancyPercent = total > 0
                ? Math.Round(occupied * 100m / total, 2)
                : 0m,
            roomStatus = new
            {
                available = await rooms.CountAsync(
                    r => r.Status == "Available"),
                occupied,
                reserved = await rooms.CountAsync(
                    r => r.Status == "Reserved"),
                cleaning = await rooms.CountAsync(
                    r => r.Status == "Cleaning"),
                maintenance = await rooms.CountAsync(
                    r => r.Status == "Maintenance"),
                outOfOrder = await rooms.CountAsync(r =>
                    r.Status == "Out of Order" ||
                    r.Status == "OutOfOrder")
            }
        });
    }

    // 8. TOP 10 GUESTS
    // GET /api/Reports/top-guests
    [HttpGet("top-guests")]
    public async Task<IActionResult> TopGuests(
        DateTime? from = null,
        DateTime? to = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
            return BadRequest(new { message = "Invalid date range." });

        var rows = await FilterBookings(start, end)
            .GroupBy(b => new
            {
                b.GuestId,
                GuestName = b.Guest != null
                    ? b.Guest.FullName
                    : "Unknown"
            })
            .Select(g => new
            {
                guestId = g.Key.GuestId,
                guest = g.Key.GuestName,
                bookings = g.Count(),
                revenue = g.Sum(b => b.TotalAmount)
            })
            .OrderByDescending(x => x.revenue)
            .Take(10)
            .ToListAsync();

        return Ok(rows);
    }

    // 9. GENERIC REPORT TABLES
    // GET /api/Reports/table?type=bookings
    // Supported: bookings, guests, rooms, payments, financial,
    // tax, housekeeping
    [HttpGet("table")]
    public async Task<IActionResult> ReportTable(
        string type = "bookings",
        DateTime? from = null,
        DateTime? to = null,
        int? roomTypeId = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
            return BadRequest(new { message = "Invalid date range." });

        var kind = type.Trim().ToLowerInvariant();

        if (kind == "guests")
        {
            var rows = await _db.Guests
                .AsNoTracking()
                .OrderBy(g => g.FullName)
                .Select(g => new
                {
                    g.Id,
                    guest = g.FullName,
                    g.Email,
                    g.Phone,
                    g.CreatedAt
                })
                .ToListAsync();

            return Ok(rows);
        }

        if (kind == "rooms")
        {
            var query = _db.Rooms
                .AsNoTracking()
                .Include(r => r.RoomType)
                .AsQueryable();

            if (roomTypeId.HasValue)
                query = query.Where(r =>
                    r.RoomTypeId == roomTypeId.Value);

            var rows = await query
                .OrderBy(r => r.RoomNumber)
                .Select(r => new
                {
                    r.Id,
                    room = r.RoomNumber,
                    roomType = r.RoomType != null
                        ? r.RoomType.Name
                        : "Unknown",
                    r.Status,
                    r.IsActive
                })
                .ToListAsync();

            return Ok(rows);
        }

        if (kind == "payments")
        {
            var rows = await _db.Payments
                .AsNoTracking()
                .Where(p => p.PaidAt >= start && p.PaidAt < end)
                .OrderByDescending(p => p.PaidAt)
                .Select(p => new
                {
                    p.Id,
                    p.BookingId,
                    p.Amount,
                    p.Method,
                    p.Status,
                    p.Reference,
                    p.PaidAt
                })
                .ToListAsync();

            return Ok(rows);
        }

        if (kind == "financial" || kind == "tax")
            return await TaxReport(start, end, roomTypeId);

       if (kind == "housekeeping")
{
    var rows = await _db.MaintenanceBlocks
        .AsNoTracking()
        .Include(m => m.Room)
        .ThenInclude(r => r!.RoomType)
        .OrderByDescending(m => m.StartDate)
        .Select(m => new
        {
            id = m.Id,
            roomId = m.RoomId,
            room = m.Room != null
                ? m.Room.RoomNumber
                : "Unknown",
            roomType = m.Room != null && m.Room.RoomType != null
                ? m.Room.RoomType.Name
                : "Unknown",
            status = m.Room != null
                ? m.Room.Status
                : "Unknown",
            startDate = m.StartDate,
            endDate = m.EndDate,
            reason = m.Reason
        })
        .ToListAsync();

    return Ok(rows);
}

        var bookingQuery = _db.Bookings
            .AsNoTracking()
            .Where(b => b.CreatedAt >= start && b.CreatedAt < end);

        if (roomTypeId.HasValue)
        {
            bookingQuery = bookingQuery.Where(b =>
                b.Room != null &&
                b.Room.RoomTypeId == roomTypeId.Value);
        }

        var bookingRows = await bookingQuery
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                guest = b.Guest != null
                    ? b.Guest.FullName
                    : "Unknown",
                room = b.Room != null
                    ? b.Room.RoomNumber
                    : "Unassigned",
                roomType = b.Room != null && b.Room.RoomType != null
                    ? b.Room.RoomType.Name
                    : "Unknown",
                b.CheckInDate,
                b.CheckOutDate,
                b.Status,
                b.TotalAmount,
                b.CreatedAt
            })
            .ToListAsync();

     return Ok(bookingRows);
    }

    // TAX REPORT
    // GET /api/Reports/tax-report
    [HttpGet("tax-report")]
    public async Task<IActionResult> TaxReport(
        DateTime? from = null,
        DateTime? to = null,
        int? roomTypeId = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
        {
            return BadRequest(new
            {
                message = "Enter a valid date range of up to one year."
            });
        }

        var settings = await _db.HotelSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == 1);

        var gstPercentage = settings?.Gst ?? 18m;

        var query = _db.Bookings
            .AsNoTracking()
            .Where(b => b.CreatedAt >= start && b.CreatedAt < end);

        if (roomTypeId.HasValue)
        {
            query = query.Where(b =>
                b.Room != null &&
                b.Room.RoomTypeId == roomTypeId.Value);
        }

        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                bookingId = b.Id,
                guest = b.Guest != null
                    ? b.Guest.FullName
                    : "Unknown",
                room = b.Room != null
                    ? b.Room.RoomNumber
                    : "Unassigned",
                b.Status,
                b.CreatedAt,
                totalAmount = b.TotalAmount
            })
            .ToListAsync();var rows = bookings.Select(b =>
        {
            var gst = gstPercentage >= 0
                ? decimal.Round(
                    b.totalAmount * gstPercentage /
                    (100m + gstPercentage),
                    2,
                    MidpointRounding.AwayFromZero)
                : 0m;

            return new
            {
                b.bookingId,
                b.guest,
                b.room,
                b.Status,
                b.CreatedAt,
                subtotalExcludingGst = b.totalAmount - gst,
                gstPercentage,
                gstAmount = gst,
                b.totalAmount
            };
        }).ToList();

        return Ok(rows);
    }

    // 11. FINANCIAL SUMMARY
    // GET /api/Reports/financial-summary
    [HttpGet("financial-summary")]
    public async Task<IActionResult> FinancialSummary(
        DateTime? from = null,
        DateTime? to = null,
        int? roomTypeId = null)
    {
        var end = (to ?? Today.AddDays(1)).Date;
        var start = (from ?? end.AddDays(-30)).Date;

        if (!ValidRange(start, end))
            return BadRequest(new { message = "Invalid date range." });

        var bookingsQuery = FilterBookings(start, end, roomTypeId);

        var bookingCount = await bookingsQuery.CountAsync();

        var bookingRevenue = await bookingsQuery.SumAsync(
            b => (decimal?)b.TotalAmount) ?? 0m;

        var paymentQuery = _db.Payments
            .AsNoTracking()
            .Where(p =>
                p.Status == "Recorded" &&
                p.PaidAt >= start &&
                p.PaidAt < end);

        if (roomTypeId.HasValue)
        {
            paymentQuery = paymentQuery.Where(p =>
                p.Booking != null &&
                p.Booking.Room != null &&
                p.Booking.Room.RoomTypeId == roomTypeId.Value);
        }

        var paymentsReceived = await paymentQuery.SumAsync(
            p => (decimal?)p.Amount) ?? 0m;

        var selectedBookingIds = await bookingsQuery
            .Select(b => b.Id)
            .ToListAsync();

        var paymentsByBooking = await _db.Payments
            .AsNoTracking()
            .Where(p =>p.Status == "Recorded" &&
                selectedBookingIds.Contains(p.BookingId))
            .GroupBy(p => p.BookingId)
            .Select(g => new
            {
                BookingId = g.Key,
                Paid = g.Sum(p => p.Amount)
            })
            .ToDictionaryAsync(p => p.BookingId, p => p.Paid);

        var bookingTotals = await bookingsQuery
            .Select(b => new { b.Id, b.TotalAmount })
            .ToListAsync();

        var outstandingBalance = bookingTotals.Sum(b =>
            Math.Max(
                0m,
                b.TotalAmount -
                paymentsByBooking.GetValueOrDefault(b.Id, 0m)));

        var averageBookingValue = bookingCount > 0
            ? bookingRevenue / bookingCount
            : 0m;

        return Ok(new
        {
            from = start,
            to = end.AddDays(-1),
            bookingCount,
            bookingRevenue,
            paymentsReceived,
            outstandingBalance,
            averageBookingValue
        });
    }
}

    