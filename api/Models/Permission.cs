using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Permission
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = "";

    [Required]
    [MaxLength(100)]
    public string Module { get; set; } = "";

    [MaxLength(250)]
    public string? Description { get; set; }
}