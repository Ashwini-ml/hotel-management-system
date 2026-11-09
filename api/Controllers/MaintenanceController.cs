
using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly AppDbContext _db;

    public MaintenanceController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _db.MaintenanceBlocks
            .Include(m => m.Room)
            .OrderBy(m => m.StartDate)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create(MaintenanceBlock block)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (block.EndDate <= block.StartDate)
            return BadRequest(new {
                message = "End date must be after start date."
            });

        bool roomExists = await _db.Rooms
            .AnyAsync(r => r.Id == block.RoomId && r.IsActive);

        if (!roomExists)
            return BadRequest(new { message = "Active room not found." });

        bool overlaps = await _db.MaintenanceBlocks.AnyAsync(m =>
            m.RoomId == block.RoomId &&
            m.StartDate < block.EndDate &&
            m.EndDate > block.StartDate);

        if (overlaps)
            return Conflict(new {
                message = "This room already has an overlapping maintenance block."
            });

       block.Id = 0;
_db.MaintenanceBlocks.Add(block);
await _db.SaveChangesAsync();

// CREATE MAINTENANCE NOTIFICATION
var room = await _db.Rooms
    .FirstOrDefaultAsync(r => r.Id == block.RoomId);

var notification = new Notification
{
    Title = "Room Maintenance Scheduled",
    Message = $"Maintenance has been scheduled for Room {room?.RoomNumber ?? "Unknown"} from {block.StartDate:dd MMM yyyy} to {block.EndDate:dd MMM yyyy}.",
    Type = "Maintenance",
    IsRead = false,
    CreatedAt = DateTime.UtcNow,
    RelatedEntityId = block.RoomId,
    Link = "/maintenance"
};

_db.Notifications.Add(notification);
await _db.SaveChangesAsync();

return Ok(block);
    }
    [HttpPut("{id}/complete")]
public async Task<IActionResult> CompleteMaintenance(int id)
{
    var block = await _db.MaintenanceBlocks
        .Include(m => m.Room)
        .FirstOrDefaultAsync(m => m.Id == id);

    if (block == null)
    {
        return NotFound(new
        {
            message = "Maintenance record not found."
        });
    }

    if (block.IsCompleted)
    {
        return BadRequest(new
        {
            message = "This maintenance is already completed."
        });
    }

    block.IsCompleted = true;
    block.CompletedAt = DateTime.UtcNow;

    if (block.Room != null)
    {
        bool otherActiveMaintenance =
            await _db.MaintenanceBlocks.AnyAsync(m =>
                m.RoomId == block.RoomId &&
                m.Id != block.Id &&
                !m.IsCompleted &&
                m.StartDate <= DateTime.UtcNow &&
                m.EndDate > DateTime.UtcNow);

        if (otherActiveMaintenance)
        {
            block.Room.Status = "Maintenance";
        }
        else
        {
            block.Room.Status = "Cleaning";
            block.Room.CleaningStatus = "Dirty";
        }
    }

    var notification = new Notification
    {
        Title = "Maintenance Completed",
        Message = $"Maintenance for Room {block.Room?.RoomNumber ?? "N/A"} has been completed.",
        Type = "Maintenance",
        IsRead = false,
        CreatedAt = DateTime.UtcNow,
        RelatedEntityId = block.Id,
        Link = "/maintenance"
    };

    _db.Notifications.Add(notification);

    await _db.SaveChangesAsync();

    return Ok(new
    {
        message = "Maintenance marked as completed successfully.",
        block.Id,
        block.IsCompleted,
        block.CompletedAt
    });
}
}