using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Room
{
    public int Id { get; set; }

    [Required, MaxLength(20)]
    public string RoomNumber { get; set; } = string.Empty;

    public int RoomTypeId { get; set; }

    public RoomType? RoomType { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Available";

    // Separate housekeeping status
    [MaxLength(20)]
    public string CleaningStatus { get; set; } = "Dirty";

    public bool IsActive { get; set; } = true;

    public ICollection<MaintenanceBlock> MaintenanceBlocks { get; set; }
        = new List<MaintenanceBlock>();
}