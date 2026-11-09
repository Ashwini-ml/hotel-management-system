using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CheckInController : ControllerBase
{
    private readonly AppDbContext _db;

    public CheckInController(AppDbContext db)
    {
        _db = db;
    }

    
    [HttpGet]
    public async Task<IActionResult> GetEligibleBookings()
    {
        var today = DateTime.Today;

        var bookings = await _db.Bookings
            .Include(b => b.Guest)
            .Include(b => b.Room)
            .Where(b =>
                b.Status == "Confirmed" &&
                b.CheckOutDate.Date > today
            )
            .OrderBy(b => b.CheckInDate)
            .ToListAsync();

        return Ok(bookings);
    }

    
    [HttpPost("{bookingId:int}")]
    public async Task<IActionResult> CheckIn(
        int bookingId,
        [FromBody] CheckInRequest request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "Invalid check-in request."
            });
        }

        if (request.Extras < 0 || request.AdvanceAmount < 0)
        {
            return BadRequest(new
            {
                message = "Extra charges and advance amount cannot be negative."
            });
        }

        if (request.Extras > 0 &&
            string.IsNullOrWhiteSpace(request.ExtrasDescription))
        {
            return BadRequest(new
            {
                message = "Please enter a description for extra charges."
            });
        }

        var allowedMethods = new[]
        {
            "Cash",
            "UPI",
            "Card",
            "Bank Transfer"
        };

        if (request.AdvanceAmount > 0 &&
            !allowedMethods.Contains(
                request.PaymentMode,
                StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Payment method must be Cash, UPI, Card, or Bank Transfer."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        try
        {
            var booking = await _db.Bookings
                .Include(b => b.Room)
                .Include(b => b.Guest)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null)
            {
                return NotFound(new
                {
                    message = "Booking not found."
                });
            }

            if (booking.Status != "Confirmed")
            {
                return Conflict(new
                {
                    message = "Only confirmed bookings can check in."
                });
            }

            // Use the server's local date consistently.
            var today = DateTime.Today;

            if (booking.CheckInDate.Date > today)
            {
                return Conflict(new
                {
                    message = "This booking is for a future date."
                });
            }

            if (booking.CheckOutDate.Date <= today)
            {
                return Conflict(new
                {
                    message = "This booking has already ended."
                });
            }

            var existing = await _db.CheckInRecords
                .AnyAsync(c => c.BookingId == bookingId);

            if (existing)
            {
                return Conflict(new
                {
                    message = "This booking has already checked in."
                });
            }

            if (booking.Room == null)
            {
                return BadRequest(new
                {
                    message = "The booking does not have an assigned room."
                });
            }

            // Create check-in record.
            var record = new CheckInRecord
            {
                BookingId = bookingId,
                CheckedInAt = DateTime.Now,
                Notes = request.Notes
            };

            _db.CheckInRecords.Add(record);

            // Save additional charges.
            if (request.Extras > 0)
            {
                _db.AdditionalCharges.Add(new AdditionalCharge
                {
                    BookingId = bookingId,
                    Description = request.ExtrasDescription!.Trim(),
                    Quantity = 1,
                    UnitAmount = request.Extras,
                    Amount = request.Extras,
                    ChargeDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                });
            }

           
            if (request.AdvanceAmount > 0)
            {
                _db.Payments.Add(new Payment
                {
                    BookingId = bookingId,
                    Amount = request.AdvanceAmount,
                    Method = request.PaymentMode,
                    Status = "Recorded",
                    Reference = request.PaymentReference,
                    Remarks = "Advance payment received during check-in.",
                    PaidAt = DateTime.Now
                });
            }

            booking.Status = "CheckedIn";
            booking.Room.Status = "Occupied";

            
            var notification = new Notification
            {
                Title = "Guest Checked In",
                Message =
                    $"{booking.Guest?.FullName ?? "Guest"} has checked in to Room {booking.Room.RoomNumber}.",
                Type = "CheckIn",
                IsRead = false,
                CreatedAt = DateTime.Now,
                RelatedEntityId = booking.Id,
                Link = "/checkin"
            };

            _db.Notifications.Add(notification);

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Check-in completed. Charges and advance payment saved.",
                bookingId,
                record.CheckedInAt,
                extraChargesSaved = request.Extras,
                advancePaymentSaved = request.AdvanceAmount
            });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();

            return StatusCode(500, new
            {
                message = "An error occurred while completing check-in."
            });
        }
    }
}


public class CheckInRequest
{
    public string? Notes { get; set; }

    public decimal Extras { get; set; }

    public string? ExtrasDescription { get; set; }

    public decimal AdvanceAmount { get; set; }

    public string PaymentMode { get; set; } = "Cash";

    public string? PaymentReference { get; set; }
}