using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HousekeepingController : ControllerBase
{
    private readonly AppDbContext _db;

    public HousekeepingController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/Housekeeping
    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .Include(r => r.RoomType)
            .Where(r => r.IsActive)
            .OrderBy(r => r.RoomNumber)
            .Select(r => new
            {
                id = r.Id,
                roomNumber = r.RoomNumber,
                roomStatus = r.Status,
                cleaningStatus = r.CleaningStatus,
                roomType = r.RoomType != null
                    ? r.RoomType.Name
                    : "—"
            })
            .ToListAsync();

        return Ok(rooms);
    }

    // PUT: api/Housekeeping/{roomId}/status
    [HttpPut("{roomId:int}/status")]
    public async Task<IActionResult> UpdateCleaningStatus(
        int roomId,
        [FromBody] HousekeepingStatusUpdateRequest request)
    {
        var room = await _db.Rooms
            .FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);

        if (room == null)
        {
            return NotFound(new
            {
                message = "Room not found."
            });
        }

        var newStatus = request.CleaningStatus?.Trim();

        if (newStatus != "Cleaning" && newStatus != "Clean")
        {
            return BadRequest(new
            {
                message = "Cleaning status must be Cleaning or Clean."
            });
        }

        if (room.Status == "Occupied" || room.Status == "Booked")
        {
            return Conflict(new
            {
                message = "An occupied or booked room cannot be cleaned."
            });
        }

        if (room.Status == "Maintenance")
        {
            return Conflict(new
            {
                message = "This room is under maintenance."
            });
        }

        room.CleaningStatus = newStatus;

        if (newStatus == "Cleaning")
        {
            room.Status = "Cleaning";
        }
        else if (newStatus == "Clean")
        {
            bool hasMaintenance = await _db.MaintenanceBlocks
    .AnyAsync(m =>
        m.RoomId == roomId &&
        !m.IsCompleted &&
        m.StartDate < DateTime.UtcNow &&
        m.EndDate > DateTime.UtcNow);

            room.Status = hasMaintenance
                ? "Maintenance"
                : "Available";
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Room {room.RoomNumber} housekeeping status updated to {newStatus}.",
            id = room.Id,
            roomNumber = room.RoomNumber,
            roomStatus = room.Status,
            cleaningStatus = room.CleaningStatus
        });
    }
}

public class HousekeepingStatusUpdateRequest
{
    public string CleaningStatus { get; set; } = string.Empty;
}