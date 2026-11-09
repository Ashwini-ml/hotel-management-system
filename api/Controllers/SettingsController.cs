using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/Settings
    [HttpGet]
    public async Task<ActionResult<HotelSetting>> GetSettings()
    {
        var settings = await _context.HotelSettings
            .FirstOrDefaultAsync(s => s.Id == 1);

        if (settings == null)
        {
            settings = new HotelSetting();
            _context.HotelSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return Ok(settings);
    }

    // PUT /api/Settings
    [HttpPut]
    public async Task<ActionResult<HotelSetting>> UpdateSettings(
        [FromBody] HotelSetting request)
    {
        var settings = await _context.HotelSettings
            .FirstOrDefaultAsync(s => s.Id == 1);

        if (settings == null)
        {
            settings = new HotelSetting { Id = 1 };
            _context.HotelSettings.Add(settings);
        }

        settings.HotelName = request.HotelName;
        settings.Email = request.Email;
        settings.Phone = request.Phone;
        settings.Address = request.Address;
        settings.CheckIn = request.CheckIn;
        settings.CheckOut = request.CheckOut;
        settings.BookingStatus = request.BookingStatus;
        settings.MaxGuests = request.MaxGuests;
        settings.Currency = request.Currency;
        settings.Gst = request.Gst;
        settings.InvoicePrefix = request.InvoicePrefix;
        settings.BookingAlerts = request.BookingAlerts;
        settings.PaymentAlerts = request.PaymentAlerts;
        settings.CheckoutAlerts = request.CheckoutAlerts;

        await _context.SaveChangesAsync();

        return Ok(settings);
    }
}