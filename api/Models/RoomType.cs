using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class RoomType
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(1, 20)]
    public int Capacity { get; set; } = 2;

    [Range(0, 10000000)]
    public decimal BaseRate { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}