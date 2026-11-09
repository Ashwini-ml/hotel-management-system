using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Notifications
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notifications = await _context.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications);
    }

    // GET: api/Notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _context.Notifications
            .CountAsync(n => !n.IsRead);

        return Ok(new { count });
    }

    // POST: api/Notifications
    [HttpPost]
    public async Task<IActionResult> Create(Notification notification)
    {
        notification.Id = 0;
        notification.CreatedAt = DateTime.UtcNow;
        notification.IsRead = false;

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = notification.Id }, notification);
    }

    // PUT: api/Notifications/{id}/read
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var notification = await _context.Notifications.FindAsync(id);

        if (notification == null)
            return NotFound(new { message = "Notification not found." });

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read." });
    }

    // PUT: api/Notifications/mark-all-read
    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var notifications = await _context.Notifications
            .Where(n => !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
            notification.IsRead = true;

        await _context.SaveChangesAsync();

        return Ok(new { message = "All notifications marked as read." });
    }

    // DELETE: api/Notifications/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var notification = await _context.Notifications.FindAsync(id);

        if (notification == null)
            return NotFound(new { message = "Notification not found." });

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Notification deleted." });
    }
}