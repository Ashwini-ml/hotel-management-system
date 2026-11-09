using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Payment
{
    public int Id { get; set; }

    [Required]
    public int BookingId { get; set; }

    public Booking? Booking { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    [Required, MaxLength(30)]
    public string Method { get; set; } = "Cash";

    [Required, MaxLength(30)]
    public string Status { get; set; } = "Recorded";

    [MaxLength(100)]
    public string? Reference { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}