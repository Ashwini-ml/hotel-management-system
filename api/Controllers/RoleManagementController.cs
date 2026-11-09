using api.Authorization;
using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoleManagementController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoleManagementController(AppDbContext db)
    {
        _db = db;
    }

    public record RoleRequest(
        string Name,
        List<int> PermissionIds
    );

    // Get all roles with assigned permissions
    [HttpGet]
    [PermissionAuthorize("Roles", "View")]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles
            .Select(r => new
            {
                r.Id,
                r.Name,
                Permissions = _db.RolePermissions
                    .Where(rp => rp.RoleId == r.Id)
                    .Select(rp => rp.PermissionId)
                    .ToList()
            })
            .ToListAsync();

        return Ok(roles);
    }

    // Create a new role
    [HttpPost]
    [PermissionAuthorize("Roles", "Create")]
    public async Task<IActionResult> Create(RoleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Role name is required." });

        var name = request.Name.Trim();

        if (await _db.Roles.AnyAsync(r => r.Name == name))
            return BadRequest(new { message = "This role already exists." });

        var validIds = await _db.Permissions
            .Where(p => request.PermissionIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        if (validIds.Count != request.PermissionIds.Distinct().Count())
            return BadRequest(new { message = "One or more permissions are invalid." });

        var role = new Role
        {
            Name = name
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync();

        foreach (var permissionId in validIds.Distinct())
        {
            _db.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permissionId
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Role created successfully.", roleId = role.Id });
    }

    // Update role name and permissions
    [HttpPut("{id}")]
    [PermissionAuthorize("Roles", "Edit")]
    public async Task<IActionResult> Update(int id, RoleRequest request)
    {
        var role = await _db.Roles.FindAsync(id);

        if (role == null)
            return NotFound(new { message = "Role not found." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Role name is required." });

        var name = request.Name.Trim();

        if (await _db.Roles.AnyAsync(r => r.Name == name && r.Id != id))
            return BadRequest(new { message = "This role name already exists." });

        var validIds = await _db.Permissions
            .Where(p => request.PermissionIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        if (validIds.Count != request.PermissionIds.Distinct().Count())
            return BadRequest(new { message = "One or more permissions are invalid." });

        role.Name = name;

        var oldPermissions = _db.RolePermissions
            .Where(rp => rp.RoleId == id);

        _db.RolePermissions.RemoveRange(oldPermissions);

        foreach (var permissionId in validIds.Distinct())
        {
            _db.RolePermissions.Add(new RolePermission
            {
                RoleId = id,
                PermissionId = permissionId
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Role updated successfully." });
    }

    // Delete a role that is not assigned to any users
    [HttpDelete("{id}")]
    [PermissionAuthorize("Roles", "Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _db.Roles.FindAsync(id);

        if (role == null)
            return NotFound(new { message = "Role not found." });

        var hasUsers = await _db.Users
            .AnyAsync(u => u.RoleId == id);

        if (hasUsers)
            return BadRequest(new
            {
                message = "This role is assigned to users and cannot be deleted."
            });

        var permissions = _db.RolePermissions
            .Where(rp => rp.RoleId == id);

        _db.RolePermissions.RemoveRange(permissions);
        _db.Roles.Remove(role);

        await _db.SaveChangesAsync();

        return Ok(new { message = "Role deleted successfully." });
    }
}