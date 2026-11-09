using api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PermissionsController(AppDbContext db)
    {
        _db = db;
    }

    // Get all available permissions
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var permissions = await _db.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Module,
                p.Description
            })
            .ToListAsync();

        return Ok(permissions);
    }

    // Get permissions assigned to a particular role
    [HttpGet("role/{roleId}")]
    public async Task<IActionResult> GetByRole(int roleId)
    {
        var roleExists = await _db.Roles
            .AnyAsync(r => r.Id == roleId);

        if (!roleExists)
        {
            return NotFound(new { message = "Role not found." });
        }

        var permissions = await _db.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => new
            {
                rp.Permission.Id,
                rp.Permission.Name,
                rp.Permission.Module,
                rp.Permission.Description
            })
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Id)
            .ToListAsync();

        return Ok(permissions);
    }

    // Get permissions for the currently logged-in user
    [HttpGet("my")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var roleName = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrWhiteSpace(roleName))
        {
            return Unauthorized(new
            {
                message = "User role could not be identified."
            });
        }

        var role = await _db.Roles
            .FirstOrDefaultAsync(r => r.Name == roleName);

        if (role == null)
        {
            return NotFound(new
            {
                message = "User role not found."
            });
        }

        // Admin receives all available permissions
        if (role.Name.Equals(
            "Admin",
            StringComparison.OrdinalIgnoreCase))
        {
            var allPermissions = await _db.Permissions
                .OrderBy(p => p.Module)
                .ThenBy(p => p.Id)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Module,
                    p.Description
                })
                .ToListAsync();

            return Ok(allPermissions);
        }

        // Other roles receive only assigned permissions
        var myPermissions = await _db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Select(rp => new
            {
                rp.Permission.Id,
                rp.Permission.Name,
                rp.Permission.Module,
                rp.Permission.Description
            })
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Id)
            .ToListAsync();

        return Ok(myPermissions);
    }
}