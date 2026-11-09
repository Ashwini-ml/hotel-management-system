namespace api.Models;

public class CheckInRecord
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public DateTime CheckedInAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
}