using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    private const long MaxPhotoSize = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

    public GuestsController(
        AppDbContext db,
        IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

   [HttpGet]
public async Task<IActionResult> Search([FromQuery] string? q)
{
    var query = _db.Guests.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim();

        query = query.Where(g =>
            g.FullName.Contains(term) ||
            g.Email.Contains(term) ||
            (g.Phone != null && g.Phone.Contains(term)));
    }

    var guests = await query
        .OrderBy(g => g.FullName)
        .Select(g => new
        {
            g.Id,
            g.FullName,
            g.Email,
            g.Phone,
            g.Address,
            g.Nationality,
            g.DateOfBirth,
            g.Gender,
            g.IdentificationType,
            g.IdentificationNumber,
            g.PhotoUrl,
            g.GuestType,
            g.Rating,
            g.CreatedAt,
            

            // Count completed stays
            TotalStays = _db.Bookings.Count(b =>
                b.GuestId == g.Id &&
                b.Status == "CheckedOut"),

            // Most recent checkout date
            LastStay = _db.Bookings
                .Where(b =>
                    b.GuestId == g.Id &&
                    b.Status == "CheckedOut")
                .Select(b => (DateTime?)b.CheckOutDate)
                .Max()
        })
        .ToListAsync();

    return Ok(guests);
}

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var guest = await _db.Guests.FindAsync(id);
        return guest == null ? NotFound() : Ok(guest);
    }

    [HttpPost]
    [HttpPost]
public async Task<IActionResult> Create(Guest guest)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    guest.Id = 0;
    guest.FullName = guest.FullName.Trim();
    guest.Email = guest.Email.Trim();

    _db.Guests.Add(guest);
    await _db.SaveChangesAsync();

    // CREATE NEW GUEST NOTIFICATION
    var notification = new Notification
    {
        Title = "New Guest Registered",
        Message = $"{guest.FullName} has been registered as a new guest.",
        Type = "Guest",
        IsRead = false,
        CreatedAt = DateTime.UtcNow,
        RelatedEntityId = guest.Id,
        Link = "/guests"
    };

    _db.Notifications.Add(notification);
    await _db.SaveChangesAsync();

    return CreatedAtAction(
        nameof(GetById),
        new { id = guest.Id },
        guest);
}

    [HttpPut("{id:int}")]
public async Task<IActionResult> Update(int id, Guest input)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    var guest = await _db.Guests.FindAsync(id);

    if (guest == null)
        return NotFound();

    guest.FullName = input.FullName.Trim();
    guest.Email = input.Email.Trim();
    guest.Phone = input.Phone;
    guest.Address = input.Address;

    // Additional guest details
    guest.Nationality = input.Nationality;
    guest.DateOfBirth = input.DateOfBirth;
    guest.Gender = input.Gender;

    // Identification details
guest.IdentificationType = input.IdentificationType;
guest.IdentificationNumber = input.IdentificationNumber;

// Guest category
guest.GuestType = string.IsNullOrWhiteSpace(input.GuestType)
    ? "Regular"
    : input.GuestType.Trim();
// Guest rating
guest.Rating=input.Rating;

// Preserve the existing photo..

    await _db.SaveChangesAsync();

    return Ok(guest);
}

[HttpDelete("{id:int}")]
public async Task<IActionResult> Delete(int id)
{
    var guest = await _db.Guests
        .FirstOrDefaultAsync(g => g.Id == id);

    if (guest == null)
    {
        return NotFound(new
        {
            message = "Guest not found."
        });
    }

    // Preserve guest records that have booking history.
    bool hasBookings = await _db.Bookings
        .AnyAsync(b => b.GuestId == id);

    if (hasBookings)
    {
        return Conflict(new
        {
            message = "This guest has booking history and cannot be deleted."
        });
    }

    _db.Guests.Remove(guest);
    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Guest deleted successfully."
    });
}

    [HttpPost("{id:int}/photo")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPhotoSize + 1024 * 1024)]
    public async Task<IActionResult> UploadPhoto(
        int id,
        IFormFile? photo)
    {
        var guest = await _db.Guests.FindAsync(id);

        if (guest == null)
            return NotFound(new { message = "Guest not found." });

        if (photo == null || photo.Length == 0)
            return BadRequest(new { message = "Please select a photo." });

        if (photo.Length > MaxPhotoSize)
            return BadRequest(new { message = "Photo must be 5 MB or smaller." });

        var extension = Path.GetExtension(photo.FileName);

        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new
            {
                message = "Use a JPG, JPEG, PNG, or WEBP image."
            });
        }

        var allowedMimeTypes = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        if (!allowedMimeTypes.Contains(photo.ContentType))
        {
            return BadRequest(new
            {
                message = "The uploaded file must be a supported image."
            });
        }

        var uploadsFolder = Path.Combine(
            _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads",
            "guests");

        Directory.CreateDirectory(uploadsFolder);

        // Generate our own filename; never use the supplied filename on disk.
        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.CreateNew))
        {
            await photo.CopyToAsync(stream);
        }

        var oldPhotoUrl = guest.PhotoUrl;
        guest.PhotoUrl = $"/uploads/guests/{fileName}";

        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);

            throw;
        }

        // Remove the previous uploaded photo after the database update succeeds.
        if (!string.IsNullOrWhiteSpace(oldPhotoUrl))
        {
            var oldFileName = Path.GetFileName(oldPhotoUrl);

            if (oldFileName == oldPhotoUrl.TrimStart('/').Split('/').Last()
                && oldPhotoUrl.StartsWith(
                    "/uploads/guests/",
                    StringComparison.OrdinalIgnoreCase))
            {
                var oldPath = Path.Combine(uploadsFolder, oldFileName);

                if (System.IO.File.Exists(oldPath))
                    System.IO.File.Delete(oldPath);
            }
        }

        return Ok(new
        {
            message = "Guest photo uploaded successfully.",
            photoUrl = guest.PhotoUrl,
            guestId = guest.Id
        });
    }
}