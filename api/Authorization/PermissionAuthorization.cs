using System.Security.Claims;
using api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace api.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class PermissionAuthorizeAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _module;
    private readonly string _permission;

    public PermissionAuthorizeAttribute(string module, string permission)
    {
        _module = module;
        _permission = permission;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var roleName = context.HttpContext.User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrWhiteSpace(roleName))
        {
            context.Result = new ForbidResult();
            return;
        }

        var db = context.HttpContext.RequestServices
            .GetRequiredService<AppDbContext>();

        var hasPermission = await db.RolePermissions
            .AnyAsync(rp =>
                rp.Role.Name == roleName &&
                rp.Permission.Module == _module &&
                rp.Permission.Name == _permission);

        if (!hasPermission)
        {
            context.Result = new ForbidResult();
        }
    }
}