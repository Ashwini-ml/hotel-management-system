using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Notification
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = "General";

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? RelatedEntityId { get; set; }


    [MaxLength(250)]
    public string? Link { get; set; }
}