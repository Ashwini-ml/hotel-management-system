using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Guest
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? Nationality { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(50)]
    public string? IdentificationType { get; set; }

    [MaxLength(100)]
    public string? IdentificationNumber { get; set; }

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [MaxLength(20)]
public string GuestType { get; set; } = "Regular";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public decimal? Rating { get; set; }
}