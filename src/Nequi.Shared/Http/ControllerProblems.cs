using Microsoft.AspNetCore.Mvc;

namespace Nequi.Shared.Http;

/// <summary>Lets MVC controllers return the same RFC 9457 responses as minimal APIs (<see cref="Problems.Problem"/>).</summary>
public static class ControllerProblems
{
    public static IActionResult ProblemJson(this ControllerBase c, int status, string title, string? detail = null, string? code = null) =>
        new ResultAdapter(Problems.Problem(c.HttpContext, status, title, detail, code));

    private sealed class ResultAdapter(Microsoft.AspNetCore.Http.IResult result) : IActionResult
    {
        public Task ExecuteResultAsync(ActionContext context) => result.ExecuteAsync(context.HttpContext);
    }
}
