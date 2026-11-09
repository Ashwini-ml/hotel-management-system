using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class HotelSetting
{
    [Key]
    public int Id { get; set; } = 1;

    [Required, MaxLength(150)]
    public string HotelName { get; set; } = "Grand Horizon Hotel";

    [MaxLength(150), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [Required, MaxLength(10)]
    public string CheckIn { get; set; } = "14:00";

    [Required, MaxLength(10)]
    public string CheckOut { get; set; } = "11:00";

    [Required, MaxLength(30)]
    public string BookingStatus { get; set; } = "Confirmed";

    [Range(1, 20)]
    public int MaxGuests { get; set; } = 4;

    [Required, MaxLength(10)]
    public string Currency { get; set; } = "INR";

    [Column(TypeName = "decimal(5,2)")]
    [Range(typeof(decimal), "0", "100")]
    public decimal Gst { get; set; } = 18;

    [MaxLength(8)]
    public string InvoicePrefix { get; set; } = "GH";

    public bool BookingAlerts { get; set; } = true;

    public bool PaymentAlerts { get; set; } = true;

    public bool CheckoutAlerts { get; set; } = true;
}