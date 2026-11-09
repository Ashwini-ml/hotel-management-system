using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _db;

    public BillingController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{bookingId:int}")]
    public async Task<IActionResult> GetBill(int bookingId)
    {
        var booking = await _db.Bookings
            .Include(b => b.Guest)
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return NotFound();

        var charges = await _db.AdditionalCharges
            .Where(c => c.BookingId == bookingId)
            .ToListAsync();

        var payments = await _db.Payments
            .Where(p => p.BookingId == bookingId &&
                        p.Status == "Recorded")
            .ToListAsync();

        var extraTotal = charges.Sum(c => c.Amount);
        var paidTotal = payments.Sum(p => p.Amount);
        var total = booking.TotalAmount + extraTotal;

        return Ok(new {
            booking.Id,
            GuestName = booking.Guest?.FullName,
            RoomNumber = booking.Room?.RoomNumber,
            booking.TotalAmount,
            AdditionalCharges = charges,
            Payments = payments,
            ExtraTotal = extraTotal,
            PaidTotal = paidTotal,
            GrandTotal = total,
            Balance = total - paidTotal
        });
    }

    [HttpPost("{bookingId:int}/charges")]
    public async Task<IActionResult> AddCharge(
        int bookingId, [FromBody] ChargeRequest request)
    {
        if (request.Amount <= 0 ||
            string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(new {
                message = "Enter a description and positive amount."
            });

        var booking = await _db.Bookings.FindAsync(bookingId);

        if (booking == null)
            return NotFound(new { message = "Booking not found." });

        if (booking.Status == "Cancelled")
            return Conflict(new {
                message = "Cannot bill a cancelled booking."
            });

        var charge = new AdditionalCharge
        {
            BookingId = bookingId,
            Description = request.Description.Trim(),
            Amount = request.Amount
        };

        _db.AdditionalCharges.Add(charge);
        await _db.SaveChangesAsync();

        return Ok(charge);
    }

    [HttpPost("{bookingId:int}/payments")]
    public async Task<IActionResult> AddPayment(
        int bookingId, [FromBody] PaymentRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest(new {
                message = "Payment amount must be positive."
            });

        var allowedMethods = new[] {
            "Cash", "Card", "UPI", "BankTransfer"
        };

        if (!allowedMethods.Contains(request.Method))
            return BadRequest(new {
                message = "Unsupported payment method."
            });

        var booking = await _db.Bookings.FindAsync(bookingId);

        if (booking == null)
            return NotFound();

        if (booking.Status == "Cancelled")
            return Conflict(new {
                message = "Cannot accept payment for a cancelled booking."
            });

        var payment = new Payment
        {
            BookingId = bookingId,
            Amount = request.Amount,
            Method = request.Method,
            Status = "Recorded",
            Reference = request.Reference,
            PaidAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(payment);
    }
}

public class ChargeRequest
{
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class PaymentRequest
{
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";
    public string? Reference { get; set; }
}