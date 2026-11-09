namespace api.Models;

public class CheckOutRecord
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public DateTime CheckedOutAt { get; set; } = DateTime.UtcNow;
}