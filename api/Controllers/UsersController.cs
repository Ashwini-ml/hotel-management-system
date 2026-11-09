using api.Authorization;
using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    public class CreateUserRequest
    {
        [Required]
        public string Name { get; set; } = "";

        [Required, EmailAddress]
        public string Email { get; set; } = "";

        [Required, MinLength(8)]
        public string Password { get; set; } = "";

        [Required]
        public string RoleName { get; set; } = "";
    }

    public class UpdateUserRequest
    {
        [Required]
        public string Name { get; set; } = "";

        [Required, EmailAddress]
        public string Email { get; set; } = "";

        [Required]
        public string RoleName { get; set; } = "";
    }

    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    // GET: api/Users
    [HttpGet]
    [PermissionAuthorize("Users", "View")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .Include(u => u.Role)
            .OrderBy(u => u.Name)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.RoleId,
                Role = u.Role != null ? u.Role.Name : "Unknown",
                u.IsActive
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/Users/roles
    [HttpGet("roles")]
    [PermissionAuthorize("Users", "View")]
    public async Task<IActionResult> GetRoles()
    {
        var rolesQuery = _db.Roles.AsQueryable();

        // Managers cannot assign the Admin role.
        if (User.IsInRole("Manager"))
        {
            rolesQuery = rolesQuery.Where(r => r.Name != "Admin");
        }

        var roles = await rolesQuery
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name
            })
            .ToListAsync();

        return Ok(roles);
    }

    // POST: api/Users
    [HttpPost]
    [PermissionAuthorize("Users", "Create")]
    public async Task<IActionResult> CreateUser(
        CreateUserRequest request)
    {
        var email = request.Email.Trim();

        if (await _db.Users.AnyAsync(u => u.Email == email))
        {
            return BadRequest(new
            {
                message = "This email is already registered."
            });
        }

        var role = await _db.Roles.FirstOrDefaultAsync(
            r => r.Name == request.RoleName.Trim());

        if (role == null)
        {
            return BadRequest(new
            {
                message = "Selected role was not found."
            });
        }

        if (User.IsInRole("Manager") && role.Name == "Admin")
        {
            return Forbid();
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                request.Password),
            RoleId = role.Id,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "User created successfully.",
            user.Id,
            user.Name,
            user.Email,
            Role = role.Name,
            user.IsActive
        });
    }

    // PUT: api/Users/5
    [HttpPut("{id}")]
    [PermissionAuthorize("Users", "Edit")]
    public async Task<IActionResult> UpdateUser(
        int id,
        UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        var email = request.Email.Trim();

        if (await _db.Users.AnyAsync(
            u => u.Email == email && u.Id != id))
        {
            return BadRequest(new
            {
                message = "This email is already used by another user."
            });
        }

        var role = await _db.Roles.FirstOrDefaultAsync(
            r => r.Name == request.RoleName.Trim());

        if (role == null)
        {
            return BadRequest(new
            {
                message = "Selected role was not found."
            });
        }

        if (User.IsInRole("Manager") && role.Name == "Admin")
        {
            return Forbid();
        }

        user.Name = request.Name.Trim();
        user.Email = email;
        user.RoleId = role.Id;

        await _db.SaveChangesAsync();

        return Ok(new { message = "User updated successfully." });
    }

    // PATCH: api/Users/5/status
    [HttpPatch("{id}/status")]
    [PermissionAuthorize("Users", "Edit")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateUserStatusRequest request)
    {
        var user = await _db.Users.FindAsync(id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        user.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = request.IsActive
                ? "User activated successfully."
                : "User deactivated successfully.",
            user.Id,
            user.IsActive
        });
    }
}