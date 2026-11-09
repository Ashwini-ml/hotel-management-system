using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Booking
{
    public int Id { get; set; }

    public int GuestId { get; set; }
    public Guest? Guest { get; set; }

    public int RoomId { get; set; }
    public Room? Room { get; set; }

    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }

    public int GuestsCount { get; set; } = 1;

    public decimal NightlyRate { get; set; }
    public decimal TotalAmount { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Confirmed";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}