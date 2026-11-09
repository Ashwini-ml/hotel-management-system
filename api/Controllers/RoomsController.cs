using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomsController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/Rooms
    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync();

        return Ok(rooms);
    }

    // GET: api/Rooms/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetRoom(int id)
    {
        var room = await _db.Rooms
            .Include(r => r.RoomType)
            .FirstOrDefaultAsync(r => r.Id == id);

        return room == null ? NotFound() : Ok(room);
    }



    // POST: api/Rooms
    [HttpPost]
    public async Task<IActionResult> CreateRoom(Room room)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(room.RoomNumber))
            return BadRequest(new { message = "Room number is required." });

        room.RoomNumber = room.RoomNumber.Trim();

        bool duplicate = await _db.Rooms.AnyAsync(
            r => r.RoomNumber == room.RoomNumber);

        if (duplicate)
            return Conflict(new { message = "Room number already exists." });

        bool typeExists = await _db.RoomTypes
            .AnyAsync(t => t.Id == room.RoomTypeId);

        if (!typeExists)
            return BadRequest(new { message = "Invalid room type." });

        room.Id = 0;
        room.Status = "Available";
        room.IsActive = true;

       _db.Rooms.Add(room);
await _db.SaveChangesAsync();

var notification = new Notification
{
    Title = "New Room Added",
    Message = $"Room {room.RoomNumber} has been added successfully.",
    Type = "Room",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = room.Id,
    Link = "/rooms"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetRoom),
            new { id = room.Id },
            room);
    }

    // PUT: api/Rooms/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRoom(
        int id,
        UpdateRoomRequest input)
    {
        var room = await _db.Rooms.FindAsync(id);
       

        if (room == null)
            return NotFound(new { message = "Room not found." });
            string previousStatus = room.Status;

        if (string.IsNullOrWhiteSpace(input.RoomNumber))
            return BadRequest(new { message = "Room number is required." });

        string roomNumber = input.RoomNumber.Trim();

        bool duplicate = await _db.Rooms.AnyAsync(
            r => r.Id != id && r.RoomNumber == roomNumber);

        if (duplicate)
            return Conflict(new { message = "Room number already exists." });

        bool typeExists = await _db.RoomTypes
            .AnyAsync(t => t.Id == input.RoomTypeId);

        if (!typeExists)
            return BadRequest(new { message = "Invalid room type." });

        var allowedStatuses = new[]
{
    "Available",
    "Booked",
    "Occupied",
    "Under Maintenance",
    "Cleaning",
    "Maintenance"
};

if (input.Status != null &&
    !allowedStatuses.Contains(input.Status))
{
    return BadRequest(new { message = "Invalid room status." });
}

        room.RoomNumber = roomNumber;
        room.RoomTypeId = input.RoomTypeId;

        if (input.Status != null)
            room.Status = input.Status;

        await _db.SaveChangesAsync();

var notification = new Notification
{
    Title = previousStatus != room.Status
        ? "Room Status Updated"
        : "Room Details Updated",

    Message = previousStatus != room.Status
        ? $"Room {room.RoomNumber} status changed from {previousStatus} to {room.Status}."
        : $"Details of Room {room.RoomNumber} have been updated.",

    Type = "Room",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = room.Id,
    Link = "/rooms"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

return Ok(new
{
    message = "Room updated successfully.",
    room.Id,
    room.RoomNumber,
    room.RoomTypeId,
    room.Status,
    room.IsActive
});
    }

    // PUT: api/Rooms/5/activate
    [HttpPut("{id:int}/activate")]
    public async Task<IActionResult> ActivateRoom(int id)
    {
        var room = await _db.Rooms.FindAsync(id);

        if (room == null)
            return NotFound(new { message = "Room not found." });

        if (room.IsActive)
            return Ok(new { message = "Room is already active." });

       room.IsActive = true;

await _db.SaveChangesAsync();

var notification = new Notification
{
    Title = "Room Activated",
    Message = $"Room {room.RoomNumber} has been activated.",
    Type = "Room",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = room.Id,
    Link = "/rooms"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Room activated successfully.",
            room.Id,
            room.RoomNumber,
            room.Status,
            room.IsActive
        });
    }
    // PUT: api/Rooms/5/mark-available
[HttpPut("{id:int}/mark-available")]
public async Task<IActionResult> MarkRoomAvailable(int id)
{
    var room = await _db.Rooms.FindAsync(id);

    if (room == null)
        return NotFound(new { message = "Room not found." });

    if (!room.IsActive)
        return BadRequest(new { message = "Inactive rooms cannot be marked available." });

    if (room.Status != "Cleaning")
        return BadRequest(new
        {
            message = "Only rooms with Cleaning status can be marked available."
        });

    room.Status = "Available";

    await _db.SaveChangesAsync();

    var notification = new Notification
    {
        Title = "Room Ready",
        Message = $"Room {room.RoomNumber} has been cleaned and marked as Available.",
        Type = "Room",
        IsRead = false,
        CreatedAt = DateTime.UtcNow,
        RelatedEntityId = room.Id,
        Link = "/rooms"
    };

    _db.Notifications.Add(notification);
    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Room marked as Available successfully.",
        room.Id,
        room.RoomNumber,
        room.Status
    });
}

    // DELETE: api/Rooms/5
// Soft-deactivates a room.
[HttpDelete("{id:int}")]
public async Task<IActionResult> DeactivateRoom(int id)
{
    var room = await _db.Rooms.FindAsync(id);

    if (room == null)
        return NotFound(new { message = "Room not found." });

    if (!room.IsActive)
        return Ok(new { message = "Room is already inactive." });

    room.IsActive = false;

    await _db.SaveChangesAsync();

    var notification = new Notification
    {
        Title = "Room Deactivated",
        Message = $"Room {room.RoomNumber} has been deactivated.",
        Type = "Room",
        IsRead = false,
        CreatedAt = DateTime.UtcNow,
        RelatedEntityId = room.Id,
        Link = "/rooms"
    };

    _db.Notifications.Add(notification);
    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Room deactivated successfully.",
        room.Id,
        room.RoomNumber,
        room.IsActive
    });
    
}
// PUT: api/Rooms/5/cleaning-status
[HttpPut("{id:int}/cleaning-status")]
public async Task<IActionResult> UpdateCleaningStatus(
    int id,
    UpdateCleaningStatusRequest input)
{
    var room = await _db.Rooms.FindAsync(id);

    if (room == null)
        return NotFound(new { message = "Room not found." });

    var allowedStatuses = new[]
    {
        "Clean",
        "Dirty",
        "Cleaning"
    };

    if (string.IsNullOrWhiteSpace(input.CleaningStatus) ||
        !allowedStatuses.Contains(input.CleaningStatus))
    {
        return BadRequest(new
        {
            message = "Invalid cleaning status."
        });
    }

    room.CleaningStatus = input.CleaningStatus;

    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Cleaning status updated successfully.",
        room.Id,
        room.RoomNumber,
        room.CleaningStatus
    });
}

// Request model
public class UpdateCleaningStatusRequest
{
    public string CleaningStatus { get; set; } = "";
}
}

// Request model for editing a room.
public class UpdateRoomRequest
{
    public class UpdateCleaningStatusRequest
{
    public string CleaningStatus { get; set; } = "";
}
    public string? RoomNumber { get; set; }

    public int RoomTypeId { get; set; }

    public string? Status { get; set; }
    
}