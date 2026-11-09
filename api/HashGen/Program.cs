using BCrypt.Net;

string password = "Admin@123";
string hash = BCrypt.Net.BCrypt.HashPassword(password);

Console.WriteLine("Email: admin@hotel.com");
Console.WriteLine("Password: " + password);
Console.WriteLine("Password Hash:");
Console.WriteLine(hash);