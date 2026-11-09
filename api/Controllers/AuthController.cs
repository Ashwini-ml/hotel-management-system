using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public record LoginRequest(string Email, string Password);

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !user.IsActive ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var key = _config["Jwt:Key"];
        var loginFingerprint =
    Convert.ToHexString(
        System.Security.Cryptography.SHA256.HashData(
            Encoding.UTF8.GetBytes(key)));

Console.WriteLine("LOGIN FINGERPRINT: " + loginFingerprint);

        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
        {
            return StatusCode(500, new { message = "JWT key is not configured correctly." });
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "Front Desk")
        };

        var credentials = new SigningCredentials(
            new
         SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var expiry = DateTime.UtcNow.AddMinutes(
            _config.GetValue<int?>("Jwt:ExpiryMinutes") ?? 60);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: credentials);
            Console.WriteLine("LOGIN JWT Issuer: " + _config["Jwt:Issuer"]);
            Console.WriteLine("LOGIN JWT Audience: " + _config["Jwt:Audience"]);
            Console.WriteLine("LOGIN JWT Key Length: " +
            Encoding.UTF8.GetByteCount(key));

        return Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            name = user.Name,
            role = user.Role?.Name ?? "Front Desk",
            expiresAt = expiry
        });
    }
}