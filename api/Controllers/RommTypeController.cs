using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomTypesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomTypesController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/RoomTypes
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.RoomTypes
            .OrderBy(t => t.Name)
            .ToListAsync();

        return Ok(types);
    }

    // POST: api/RoomTypes
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomType type)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        type.Name = type.Name.Trim();

        if (string.IsNullOrWhiteSpace(type.Name))
            return BadRequest(new { message = "Room type name is required." });

        var exists = await _db.RoomTypes
            .AnyAsync(t => t.Name == type.Name);

        if (exists)
            return Conflict(new { message = "This room type already exists." });

        var newType = new RoomType
        {
            Name = type.Name,
            Capacity = type.Capacity,
            BaseRate = type.BaseRate,
            Description = type.Description?.Trim()
        };

        _db.RoomTypes.Add(newType);
        await _db.SaveChangesAsync();

        return Ok(newType);
    }

    // PUT: api/RoomTypes/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomType type)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingType = await _db.RoomTypes.FindAsync(id);

        if (existingType == null)
            return NotFound(new { message = "Room type not found." });

        var name = type.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Room type name is required." });

        var duplicate = await _db.RoomTypes
            .AnyAsync(t => t.Id != id && t.Name == name);

        if (duplicate)
            return Conflict(new { message = "This room type already exists." });

        existingType.Name = name;
        existingType.Capacity = type.Capacity;
        existingType.BaseRate = type.BaseRate;
        existingType.Description = type.Description?.Trim();

        await _db.SaveChangesAsync();

        return Ok(existingType);
    }

    // DELETE: api/RoomTypes/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var type = await _db.RoomTypes
            .Include(t => t.Rooms)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (type == null)
            return NotFound(new { message = "Room type not found." });

        if (type.Rooms.Any())
        {
            return Conflict(new
            {
                message = "This room type is assigned to existing rooms. Reassign those rooms before deleting it."
            });
        }

        _db.RoomTypes.Remove(type);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Room type deleted successfully." });
    }
}