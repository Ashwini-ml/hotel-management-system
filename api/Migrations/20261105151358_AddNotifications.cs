using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddNotifications : Migration
    {
        /// <inheritdoc />
       protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.CreateTable(
        name: "Notifications",
        columns: table => new
        {
            Id = table.Column<int>(type: "int", nullable: false)
                .Annotation("MySql:ValueGenerationStrategy",
                    MySqlValueGenerationStrategy.IdentityColumn),

            Title = table.Column<string>(
                type: "varchar(150)",
                maxLength: 150,
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4"),

            Message = table.Column<string>(
                type: "varchar(500)",
                maxLength: 500,
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4"),

            Type = table.Column<string>(
                type: "varchar(50)",
                maxLength: 50,
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4"),

            IsRead = table.Column<bool>(
                type: "tinyint(1)",
                nullable: false),

            CreatedAt = table.Column<DateTime>(
                type: "datetime(6)",
                nullable: false),

            RelatedEntityId = table.Column<int>(
                type: "int",
                nullable: true),

            Link = table.Column<string>(
                type: "varchar(250)",
                maxLength: 250,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
        },
        constraints: table =>
        {
            table.PrimaryKey("PK_Notifications", x => x.Id);
        })
        .Annotation("MySql:CharSet", "utf8mb4");
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "GuestType",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Guests");
        }
    }
}
