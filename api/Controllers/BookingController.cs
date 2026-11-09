using System;
using System.Linq;
using System.Threading.Tasks;
using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly AppDbContext _db;

        public BookingController(AppDbContext db)
        {
            _db = db;
        }
// PUT: api/Booking/{id}
[HttpPut("{id}")]
public async Task<IActionResult> UpdateBooking(
    int id,
    [FromBody] CreateBookingRequest request)
{
    var booking = await _db.Bookings
        .FirstOrDefaultAsync(b => b.Id == id);

    if (booking == null)
    {
        return NotFound(new
        {
            message = "Booking not found."
        });
    }

    if (booking.Status != "Pending" &&
        booking.Status != "Confirmed")
    {
        return BadRequest(new
        {
            message = "Only pending or confirmed bookings can be edited."
        });
    }

    var checkIn = request.CheckInDate.Date;
    var checkOut = request.CheckOutDate.Date;

    if (checkOut <= checkIn)
    {
        return BadRequest(new
        {
            message = "Check-out must be after check-in."
        });
    }

    if (request.GuestsCount < 1)
    {
        return BadRequest(new
        {
            message = "At least one guest is required."
        });
    }

    var guest = await _db.Guests
        .FirstOrDefaultAsync(g => g.Id == request.GuestId);

    if (guest == null)
    {
        return BadRequest(new
        {
            message = "Please select a valid guest."
        });
    }

    var room = await _db.Rooms
        .Include(r => r.RoomType)
        .FirstOrDefaultAsync(r => r.Id == request.RoomId);

    if (room == null ||
        !room.IsActive ||
        room.RoomType == null)
    {
        return BadRequest(new
        {
            message = "The selected room is not available."
        });
    }

    if (request.GuestsCount > room.RoomType.Capacity)
    {
        return BadRequest(new
        {
            message = "Guest count exceeds room capacity."
        });
    }

    var hasBooking = await _db.Bookings.AnyAsync(b =>
        b.Id != id &&
        b.RoomId == room.Id &&
        (b.Status == "Confirmed" ||
         b.Status == "CheckedIn") &&
        b.CheckInDate < checkOut &&
        b.CheckOutDate > checkIn);

    if (hasBooking)
    {
        return Conflict(new
        {
            message = "This room is already booked for those dates."
        });
    }

    var hasMaintenance = await _db.MaintenanceBlocks.AnyAsync(m =>
        m.RoomId == room.Id &&
        m.StartDate < checkOut &&
        m.EndDate > checkIn);

    if (hasMaintenance)
    {
        return Conflict(new
        {
            message = "This room has a maintenance block for those dates."
        });
    }

    var nights = (checkOut - checkIn).Days;
    var nightlyRate = room.RoomType.BaseRate;

    booking.GuestId = guest.Id;
    booking.RoomId = room.Id;
    booking.CheckInDate = checkIn;
    booking.CheckOutDate = checkOut;
    booking.GuestsCount = request.GuestsCount;
    booking.NightlyRate = nightlyRate;
    booking.TotalAmount = nightlyRate * nights;

    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Booking updated successfully.",
        bookingId = booking.Id,
        booking.NightlyRate,
        booking.TotalAmount
    });
}


// CONFIRM OR CANCEL PENDING BOOKING

[HttpPut("{id}/status")]
public async Task<IActionResult> UpdateBookingStatus(
    int id,
    [FromQuery] string status)
{
    var booking = await _db.Bookings
        .FirstOrDefaultAsync(b => b.Id == id);

    if (booking == null)
    {
        return NotFound(new
        {
            message = "Booking not found."
        });
    }

    if (booking.Status != "Pending")
    {
        return BadRequest(new
        {
            message = "Only pending bookings can be confirmed or cancelled."
        });
    }

    if (string.IsNullOrWhiteSpace(status))
    {
        return BadRequest(new
        {
            message = "Status is required."
        });
    }

    status = status.Trim();

    if (string.Equals(status, "confirmed",
        StringComparison.OrdinalIgnoreCase))
    {
        status = "Confirmed";
    }
    else if (string.Equals(status, "cancelled",
        StringComparison.OrdinalIgnoreCase))
    {
        status = "Cancelled";
    }
    else
    {
        return BadRequest(new
        {
            message = "Invalid status."
        });
    }

    // Check room booking overlap before confirming
    if (status == "Confirmed")
    {
        var hasBooking = await _db.Bookings.AnyAsync(b =>
            b.Id != id &&
            b.RoomId == booking.RoomId &&
            (b.Status == "Confirmed" || b.Status == "CheckedIn") &&
            b.CheckInDate < booking.CheckOutDate &&
            b.CheckOutDate > booking.CheckInDate);

        if (hasBooking)
        {
            return Conflict(new
            {
                message = "This room is already booked for those dates."
            });
        }

        var hasMaintenance = await _db.MaintenanceBlocks.AnyAsync(m =>
            m.RoomId == booking.RoomId &&
            m.StartDate < booking.CheckOutDate &&
            m.EndDate > booking.CheckInDate);

        if (hasMaintenance)
        {
            return Conflict(new
            {
                message = "This room has a maintenance block."
            });
        }
    }

    booking.Status = status;

await _db.SaveChangesAsync();

// GET GUEST AND ROOM DETAILS
var guest = await _db.Guests
    .FirstOrDefaultAsync(g => g.Id == booking.GuestId);

var room = await _db.Rooms
    .FirstOrDefaultAsync(r => r.Id == booking.RoomId);

// CREATE STATUS NOTIFICATION
var notification = new Notification
{
    Title = status == "Confirmed"
        ? "Booking Confirmed"
        : "Booking Cancelled",

    Message = status == "Confirmed"
        ? $"Booking for {guest?.FullName ?? "Guest"} in Room {room?.RoomNumber} has been confirmed."
        : $"Booking for {guest?.FullName ?? "Guest"} in Room {room?.RoomNumber} has been cancelled.",

    Type = status == "Confirmed" ? "Booking" : "Cancellation",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = booking.Id,
    Link = "/bookings"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

return Ok(new
    {
        message = $"Booking {status.ToLower()} successfully.",
        bookingId = booking.Id,
        status = booking.Status
    });
}
// GET: api/Booking
[HttpGet]
public async Task<IActionResult> GetBookings()
{
    var bookings = await _db.Bookings
        .AsNoTracking()
        .Include(b => b.Guest)
        .Include(b => b.Room)
            .ThenInclude(r => r!.RoomType)
        .Where(b => b.Guest != null && b.Room != null)
        .OrderByDescending(b => b.CreatedAt)
        .Select(b => new
        {
            b.Id,
            b.GuestId,
            GuestName = b.Guest!.FullName,

            b.RoomId,
            RoomNumber = b.Room!.RoomNumber,

            RoomType = b.Room!.RoomType!.Name,
            Capacity = b.Room.RoomType!.Capacity,

            b.CheckInDate,
            b.CheckOutDate,
            b.GuestsCount,
            b.NightlyRate,
            b.TotalAmount,
            b.Status
        })
        .ToListAsync();

    return Ok(bookings);
}

        // GET: api/Booking/guests
        [HttpGet("guests")]
        public async Task<IActionResult> GetGuests()
        {
            var guests = await _db.Guests
                .AsNoTracking()
                .OrderBy(g => g.FullName)
                .Select(g => new
                {
                    g.Id,
                    g.FullName,
                    g.Email
                })
                .ToListAsync();

            return Ok(guests);
        }

        // GET: api/Booking/rooms?from=2026-10-14&to=2026-10-15
        [HttpGet("rooms")]
        public async Task<IActionResult> GetAvailableRooms(
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (to.Date <= from.Date)
            {
                return BadRequest(new
                {
                    message = "Check-out must be after check-in."
                });
            }

            var start = from.Date;
            var end = to.Date;

            var rooms = await _db.Rooms
                .AsNoTracking()
                .Include(r => r.RoomType)
                .Where(r =>
                    r.IsActive &&
                    r.Status == "Available" &&
                    r.RoomType != null &&
                    !_db.Bookings.Any(b =>
                        b.RoomId == r.Id &&
                        (b.Status == "Confirmed" ||
                         b.Status == "CheckedIn") &&
                        b.CheckInDate < end &&
                        b.CheckOutDate > start) &&
                    !_db.MaintenanceBlocks.Any(m =>
                        m.RoomId == r.Id &&
                        m.StartDate < end &&
                        m.EndDate > start))
                .Select(r => new
                {
                    r.Id,
                    r.RoomNumber,
                    r.Status,
                    RoomType = r.RoomType!.Name,
                    Capacity = r.RoomType!.Capacity,
                    NightlyRate = r.RoomType!.BaseRate
                })
                .ToListAsync();

            return Ok(rooms);
        }

        // POST: api/Booking
        [HttpPost]
        public async Task<IActionResult> CreateBooking(
            [FromBody] CreateBookingRequest request)
        {
            Console.WriteLine("Received Booking Status: " + request.Status);
            var checkIn = request.CheckInDate.Date;
            var checkOut = request.CheckOutDate.Date;

            if (checkOut <= checkIn)
            {
                return BadRequest(new
                {
                    message = "Check-out must be after check-in."
                });
            }

            if (request.GuestsCount < 1)
            {
                return BadRequest(new
                {
                    message = "At least one guest is required."
                });
            }

            var guest = await _db.Guests
                .FirstOrDefaultAsync(g => g.Id == request.GuestId);

            if (guest == null)
            {
                return BadRequest(new
                {
                    message = "Please select a valid guest."
                });
            }

            var room = await _db.Rooms
                .Include(r => r.RoomType)
                .FirstOrDefaultAsync(r => r.Id == request.RoomId);

            if (room == null ||
                !room.IsActive ||
                room.Status != "Available" ||
                room.RoomType == null)
            {
                return BadRequest(new
                {
                    message = "The selected room is not available."
                });
            }

            if (request.GuestsCount > room.RoomType.Capacity)
            {
                return BadRequest(new
                {
                    message = "Guest count exceeds room capacity."
                });
            }

            var hasBooking = await _db.Bookings.AnyAsync(b =>
                b.RoomId == room.Id &&
                (b.Status == "Confirmed" ||
                 b.Status == "CheckedIn") &&
                b.CheckInDate < checkOut &&
                b.CheckOutDate > checkIn);

            if (hasBooking)
            {
                return Conflict(new
                {
                    message = "This room is already booked for those dates."
                });
            }

            var hasMaintenance = await _db.MaintenanceBlocks.AnyAsync(m =>
                m.RoomId == room.Id &&
                m.StartDate < checkOut &&
                m.EndDate > checkIn);

            if (hasMaintenance)
            {
                return Conflict(new
                {
                    message = "This room has a maintenance block for those dates."
                });
            }

            var nights = (checkOut - checkIn).Days;
            var nightlyRate = room.RoomType.BaseRate;

            var booking = new Booking
            {
                GuestId = guest.Id,
                RoomId = room.Id,
                CheckInDate = checkIn,
                CheckOutDate = checkOut,
                GuestsCount = request.GuestsCount,
                NightlyRate = nightlyRate,
                TotalAmount = nightlyRate * nights,
                Status = request.Status,
                CreatedAt = DateTime.UtcNow
            };

            _db.Bookings.Add(booking);
await _db.SaveChangesAsync();

// CREATE BOOKING NOTIFICATION
var notification = new Notification
{
    Title = "New Booking Received",
    Message = $"{guest.FullName} booked Room {room.RoomNumber}. Check-in: {checkIn:dd MMM yyyy}.",
    Type = "Booking",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = booking.Id,
    Link = "/bookings"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

return CreatedAtAction(
                nameof(GetBookings),
                new { id = booking.Id },
                new
                {
                    message = "Room booked successfully.",
                    receivedStatus = request.Status,
                    id = booking.Id,
                    bookingId = booking.Id,
                    booking.GuestId,
                    booking.RoomId,
                    booking.CheckInDate,
                    booking.CheckOutDate,
                    booking.GuestsCount,
                    booking.NightlyRate,
                    booking.TotalAmount,
                    booking.Status
                });
        }

        // DELETE: api/Booking/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteBooking(int id)
        {
            var booking = await _db.Bookings
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
            {
                return NotFound(new
                {
                    message = $"Booking with ID {id} was not found."
                });
            }

            if (booking.Status == "CheckedIn" ||
                booking.Status == "CheckedOut")
            {
                return Conflict(new
                {
                    message = "Cannot delete a booking for a stay that has started or finished. Use the appropriate checkout or cancellation process."
                });
            }

            try
            {
                _db.Bookings.Remove(booking);
                await _db.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Booking {id} deleted successfully.",
                    bookingId = id
                });
            }
            catch (DbUpdateException)
            {
                return Conflict(new
                {
                    message = "This booking is linked to other records, such as payments or check-in records. It cannot be deleted until those records are handled safely."
                });
            }
        }

       // GET: api/Booking/calendar?from=2026-10-01&to=2026-10-31
[HttpGet("calendar")]
public async Task<IActionResult> GetCalendar(
    [FromQuery] DateTime from,
    [FromQuery] DateTime to)
{
    if (to.Date <= from.Date)
    {
        return BadRequest(new
        {
            message = "The end date must be after the start date."
        });
    }

    if ((to.Date - from.Date).TotalDays > 93)
    {
        return BadRequest(new
        {
            message = "Request a calendar range of 93 days or less."
        });
    }

    // 1. Get all active rooms
    var rooms = await _db.Rooms
        .AsNoTracking()
        .Include(r => r.RoomType)
        .Where(r => r.IsActive)
        .Select(r => new
        {
            r.Id,
            r.RoomNumber,
            RoomType = r.RoomType != null
                ? r.RoomType.Name
                : "Unknown",
            Status = r.Status
        })
        .ToListAsync();

    // 2. Get bookings
    var bookings = await _db.Bookings
        .AsNoTracking()
        .Include(b => b.Guest)
        .Include(b => b.Room)
        .Where(b =>
            b.CheckInDate.Date < to.Date &&
            b.CheckOutDate.Date > from.Date &&
            (b.Status == "Confirmed" ||
             b.Status == "Pending" ||
             b.Status == "CheckedIn" ||
             b.Status == "CheckedOut" ||
             b.Status == "Cancelled"))
        .Select(b => new
{
    b.Id,
    b.RoomId,
    RoomNumber = b.Room!.RoomNumber,
    GuestName = b.Guest!.FullName,

    
    GuestsCount = b.GuestsCount,

    b.CheckInDate,
    b.CheckOutDate,
    b.Status
})
        .ToListAsync();

    var maintenance = await _db.MaintenanceBlocks
        .AsNoTracking()
        .Include(m => m.Room)
        .Where(m =>
            m.StartDate.Date < to.Date &&
            m.EndDate.Date > from.Date)
        .Select(m => new
        {
            m.Id,
            m.RoomId,
            RoomNumber = m.Room!.RoomNumber,
            m.StartDate,
            m.EndDate,
            m.Reason
        })
        .ToListAsync();

    return Ok(new
    {
        rooms,
        bookings,
        maintenance
    });
}
    public class CreateBookingRequest
    {
        public int GuestId { get; set; }
        public int RoomId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public int GuestsCount { get; set; } = 1;
        public string Status { get; set; } = "Pending";
    }
    }}