using api.Data;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class BookingAvailabilityService
{
    private readonly AppDbContext _db;

    public BookingAvailabilityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsAvailable(
        int roomId,
        DateTime checkIn,
        DateTime checkOut,
        int? excludeBookingId = null)
    {
        if (checkOut.Date <= checkIn.Date)
            return false;

        var roomExists = await _db.Rooms.AnyAsync(r =>
            r.Id == roomId && r.IsActive);

        if (!roomExists)
            return false;

        var unavailableBookingStatuses = new[]
        {
            "Confirmed", "CheckedIn"
        };

        bool hasBooking = await _db.Bookings.AnyAsync(b =>
            b.RoomId == roomId &&
            (!excludeBookingId.HasValue ||
             b.Id != excludeBookingId.Value) &&
            unavailableBookingStatuses.Contains(b.Status) &&
            b.CheckInDate.Date < checkOut.Date &&
            b.CheckOutDate.Date > checkIn.Date);

        if (hasBooking)
            return false;

        return !await _db.MaintenanceBlocks.AnyAsync(m =>
            m.RoomId == roomId &&
            m.StartDate.Date < checkOut.Date &&
            m.EndDate.Date > checkIn.Date);
    }
}