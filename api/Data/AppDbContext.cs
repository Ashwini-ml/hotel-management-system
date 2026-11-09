using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Guest> Guests => Set<Guest>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<MaintenanceBlock> MaintenanceBlocks { get; set; }
    public DbSet<CheckInRecord> CheckInRecords => Set<CheckInRecord>();
    public DbSet<AdditionalCharge> AdditionalCharges => Set<AdditionalCharge>();
    public DbSet<HotelSetting> HotelSettings { get; set; }
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<CheckOutRecord> CheckOutRecords => Set<CheckOutRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Role>()
            .HasIndex(r => r.Name)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany()
            .HasForeignKey(u => u.RoleId);

        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany()
            .HasForeignKey(rp => rp.RoleId);

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany()
            .HasForeignKey(rp => rp.PermissionId);

        modelBuilder.Entity<Permission>()
            .HasIndex(p => new { p.Module, p.Name })
            .IsUnique();

        modelBuilder.Entity<RoomType>()
            .Property(r => r.BaseRate)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Booking>()
            .Property(b => b.NightlyRate)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Booking>()
            .Property(b => b.TotalAmount)
            .HasPrecision(12, 2);

        modelBuilder.Entity<AdditionalCharge>()
            .Property(c => c.Quantity)
            .HasPrecision(12, 2);

        modelBuilder.Entity<AdditionalCharge>()
            .Property(c => c.Amount)
            .HasPrecision(12, 2);

        modelBuilder.Entity<AdditionalCharge>()
            .Property(c => c.UnitAmount)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasPrecision(12, 2);
    }
}