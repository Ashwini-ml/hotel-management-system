using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CheckOutController : ControllerBase
{
    private readonly AppDbContext _db;

    public CheckOutController(AppDbContext db)
    {
        _db = db;
    }

    // Get the GST percentage saved in Hotel Settings.
    private async Task<decimal> GetGstPercentageAsync()
    {
        var settings = await _db.HotelSettings
            .FirstOrDefaultAsync(s => s.Id == 1);

        return settings?.Gst ?? 18m;
    }

    // Calculate GST rounded to two decimal places.
    private static decimal CalculateGst(
        decimal subtotal,
        decimal gstPercentage)
    {
        return decimal.Round(
            subtotal * gstPercentage / 100m,
            2,
            MidpointRounding.AwayFromZero);
    }

    // Return booking, charges, payments and invoice totals.
    private async Task<object?> GetBillingData(int bookingId)
    {
        var booking = await _db.Bookings
            .Include(b => b.Guest)
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return null;

        var charges = await _db.AdditionalCharges
            .Where(c => c.BookingId == bookingId)
            .OrderBy(c => c.ChargeDate)
            .ToListAsync();

        var payments = await _db.Payments
            .Where(p => p.BookingId == bookingId)
            .OrderBy(p => p.PaidAt)
            .ToListAsync();

        int nights = Math.Max(
            0,
            (booking.CheckOutDate.Date -
             booking.CheckInDate.Date).Days
        );

        decimal roomTotal = nights * booking.NightlyRate;
        decimal additionalTotal = charges.Sum(c => c.Amount);

        decimal subtotal = roomTotal + additionalTotal;
        decimal gstPercentage = await GetGstPercentageAsync();
        decimal gstAmount = CalculateGst(subtotal, gstPercentage);
        decimal total = subtotal + gstAmount;

        decimal received = payments
            .Where(p => p.Status == "Recorded")
            .Sum(p => p.Amount);

        return new
        {
            booking,
            nights,
            roomCharges = roomTotal,
            additionalCharges = charges,
            additionalTotal,
            payments,
            subtotal,
            gstPercentage,
            gstAmount,
            totalAmount = total,
            amountReceived = received,
            pendingAmount = Math.Max(0m, total - received)
        };
    }

    // List checked-in and checked-out bookings.
    [HttpGet]
    public async Task<IActionResult> GetCheckedInBookings(
        [FromQuery] string? q)
    {
        var query = _db.Bookings
            .Include(b => b.Guest)
            .Include(b => b.Room)
            .AsQueryable();

        query = query.Where(b =>
            b.Status == "CheckedIn" ||
            b.Status == "CheckedOut");

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(b =>
                (b.Guest != null &&
                 b.Guest.FullName.Contains(q)) ||
                (b.Room != null &&
                 b.Room.RoomNumber.Contains(q)) ||
                b.Id.ToString() == q);
        }

        var bookings = await query
            .OrderByDescending(b => b.Status == "CheckedIn")
            .ThenBy(b => b.CheckOutDate)
            .ToListAsync();

        return Ok(bookings);
    }

    // GET /api/CheckOut/{bookingId}
    [HttpGet("{bookingId:int}")]
    public async Task<IActionResult> GetBilling(int bookingId)
    {
        var data = await GetBillingData(bookingId);

        if (data == null)
        {
            return NotFound(new
            {
                message = "Booking not found."
            });
        }

        return Ok(data);
    }

    // Add an additional charge.
    [HttpPost("{bookingId:int}/charges")]
    public async Task<IActionResult> AddCharge(
        int bookingId,
        [FromBody] CheckoutChargeRequest request)
    {
        var booking = await _db.Bookings
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            return NotFound(new
            {
                message = "Booking not found."
            });
        }

        if (booking.Status != "CheckedIn")
        {
            return Conflict(new
            {
                message = "Charges can only be changed before checkout."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Description) ||
            request.Quantity <= 0 ||
            request.UnitAmount < 0)
        {
            return BadRequest(new
            {
                message = "Enter a description, positive quantity, and valid unit amount."
            });
        }

        var charge = new AdditionalCharge
        {
            BookingId = bookingId,
            Description = request.Description.Trim(),
            Quantity = request.Quantity,
            UnitAmount = request.UnitAmount,
            Amount = decimal.Round(
                request.Quantity * request.UnitAmount,
                2,
                MidpointRounding.AwayFromZero),
            ChargeDate = request.ChargeDate ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.AdditionalCharges.Add(charge);
        await _db.SaveChangesAsync();

        return Ok(charge);
    }

    // Edit an additional charge.
    [HttpPut("charges/{chargeId:int}")]
    public async Task<IActionResult> UpdateCharge(
        int chargeId,
        [FromBody] CheckoutChargeRequest request)
    {
        var charge = await _db.AdditionalCharges
            .Include(c => c.Booking)
            .FirstOrDefaultAsync(c => c.Id == chargeId);

        if (charge == null)
        {
            return NotFound(new
            {
                message = "Charge not found."
            });
        }

        if (charge.Booking?.Status != "CheckedIn")
        {
            return Conflict(new
            {
                message = "Charges can only be edited before checkout."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Description) ||
            request.Quantity <= 0 ||
            request.UnitAmount < 0)
        {
            return BadRequest(new
            {
                message = "Enter a description, positive quantity, and valid unit amount."
            });
        }

        charge.Description = request.Description.Trim();
        charge.Quantity = request.Quantity;
        charge.UnitAmount = request.UnitAmount;

        charge.Amount = decimal.Round(
            request.Quantity * request.UnitAmount,
            2,
            MidpointRounding.AwayFromZero);

        charge.ChargeDate = request.ChargeDate ?? charge.ChargeDate;

        await _db.SaveChangesAsync();

        return Ok(charge);
    }

    // Delete an additional charge.
    [HttpDelete("charges/{chargeId:int}")]
    public async Task<IActionResult> DeleteCharge(int chargeId)
    {
        var charge = await _db.AdditionalCharges
            .Include(c => c.Booking)
            .FirstOrDefaultAsync(c => c.Id == chargeId);

        if (charge == null)
        {
            return NotFound(new
            {
                message = "Charge not found."
            });
        }

        if (charge.Booking?.Status != "CheckedIn")
        {
            return Conflict(new
            {
                message = "Charges can only be deleted before checkout."
            });
        }

        _db.AdditionalCharges.Remove(charge);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Charge deleted."
        });
    }

    // Record a payment.
    [HttpPost("{bookingId:int}/payments")]
    public async Task<IActionResult> AddPayment(
        int bookingId,
        [FromBody] CheckoutPaymentRequest request)
    {
        var booking = await _db.Bookings
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            return NotFound(new
            {
                message = "Booking not found."
            });
        }

        if (booking.Status != "CheckedIn")
        {
            return Conflict(new
            {
                message = "Payments can only be added before checkout."
            });
        }

        if (request.Amount <= 0)
        {
            return BadRequest(new
            {
                message = "Payment amount must be greater than zero."
            });
        }

        var allowedMethods = new[] { "Cash", "UPI", "Card" };

        if (!allowedMethods.Contains(
            request.Method,
            StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Payment method must be Cash, UPI, or Card."
            });
        }

       var payment = new Payment
{
    BookingId = bookingId,
    Amount = request.Amount,
    Method = request.Method,
    Status = "Recorded",
    Reference = request.Reference,
    Remarks = request.Remarks,
    PaidAt = request.PaidAt ?? DateTime.UtcNow
};

_db.Payments.Add(payment);
await _db.SaveChangesAsync();

// CREATE PAYMENT NOTIFICATION
var notification = new Notification
{
    Title = "Payment Received",
    Message = $"A payment of ₹{payment.Amount:N2} has been received.",
    Type = "Payment",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = payment.BookingId,
    Link = "/payments"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

return Ok(payment);
}

    // Complete checkout only after the full amount is paid.
    [HttpPost("{bookingId:int}")]
    public async Task<IActionResult> CheckOut(int bookingId)
    {
        await using var transaction =
            await _db.Database.BeginTransactionAsync();

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

        if (booking.Status != "CheckedIn")
        {
            return Conflict(new
            {
                message = "Only checked-in bookings can check out."
            });
        }

        bool alreadyCheckedOut = await _db.CheckOutRecords
            .AnyAsync(c => c.BookingId == bookingId);

        if (alreadyCheckedOut)
        {
            return Conflict(new
            {
                message = "This booking has already checked out."
            });
        }

        var charges = await _db.AdditionalCharges
            .Where(c => c.BookingId == bookingId)
            .ToListAsync();

        var payments = await _db.Payments
            .Where(p =>
                p.BookingId == bookingId &&
                p.Status == "Recorded")
            .ToListAsync();

        int nights = Math.Max(
            0,
            (booking.CheckOutDate.Date -
             booking.CheckInDate.Date).Days
        );

        decimal roomTotal = nights * booking.NightlyRate;
        decimal additionalTotal = charges.Sum(c => c.Amount);
        decimal subtotal = roomTotal + additionalTotal;

        decimal gstPercentage = await GetGstPercentageAsync();
        decimal gstAmount = CalculateGst(subtotal, gstPercentage);
        decimal total = subtotal + gstAmount;

        decimal received = payments.Sum(p => p.Amount);
        decimal pending = total - received;

        if (pending > 0.01m)
        {
            return Conflict(new
            {
                message = "Outstanding balance must be paid before checkout.",
                subtotal,
                gstPercentage,
                gstAmount,
                totalAmount = total,
                amountReceived = received,
                pendingAmount = Math.Max(0m, pending)
            });
        }

        booking.TotalAmount = total;
        booking.Status = "CheckedOut";

        var checkedOutAt = DateTime.UtcNow;

        _db.CheckOutRecords.Add(new CheckOutRecord
        {
            BookingId = bookingId,
            CheckedOutAt = checkedOutAt
        });

      if (booking.Room != null)
{
    bool hasMaintenance = await _db.MaintenanceBlocks
        .AnyAsync(m =>
            m.RoomId == booking.RoomId &&
            !m.IsCompleted &&
            m.StartDate <= checkedOutAt &&
            m.EndDate > checkedOutAt);

    // Every checkout makes the room dirty.
    booking.Room.CleaningStatus = "Dirty";

    if (hasMaintenance)
    {
        booking.Room.Status = "Maintenance";
    }
    else
    {
        booking.Room.Status = "Cleaning";
    }
}

      

// CREATE CHECK-OUT NOTIFICATION
var notification = new Notification
{
    Title = "Guest Checked Out",
    Message = $"{booking.Guest?.FullName ?? "Guest"} has checked out from Room {booking.Room?.RoomNumber}.",
    Type = "CheckOut",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = booking.Id,
    Link = "/checkout"
};

_db.Notifications.Add(notification);

await _db.SaveChangesAsync();
await transaction.CommitAsync();

return Ok(new  
        {
            message = "Checkout completed. Room sent to housekeeping.",
            bookingId,
            checkedOutAt,
            subtotal,
            gstPercentage,
            gstAmount,
            totalAmount = total,
            amountReceived = received,
            pendingAmount = Math.Max(0m, pending),
            roomStatus = booking.Room?.Status
        });
    }
}

public class CheckoutChargeRequest
{
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitAmount { get; set; }
    public DateTime? ChargeDate { get; set; }
}

public class CheckoutPaymentRequest
{
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";
    public string? Reference { get; set; }
    public string? Remarks { get; set; }
    public DateTime? PaidAt { get; set; }
}