use serde::Serialize;
use worker::*;

#[derive(Serialize)]
struct Health<'a> {
    ok: bool,
    service: &'a str,
    version: &'a str,
    runtime: &'a str,
    readiness: &'a str,
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    error: &'a str,
}

fn json<T: Serialize>(value: &T, status: u16) -> Result<Response> {
    let mut response = Response::from_json(value)?;
    response = response.with_status(status);
    security_headers(&mut response)?;
    Ok(response)
}

fn security_headers(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("cache-control", "no-store")?;
    headers.set("x-irenx-runtime", "rust-wasm")?;
    headers.set("x-content-type-options", "nosniff")?;
    headers.set("x-frame-options", "DENY")?;
    headers.set("referrer-policy", "no-referrer")?;
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()")?;
    headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'")?;
    Ok(())
}

fn cors(response: &mut Response, env: &Env) -> Result<()> {
    let origin = env.var("IRENX_PUBLIC_ORIGIN").map(|v| v.to_string()).unwrap_or_else(|_| "https://ai.irenx.com".to_string());
    let headers = response.headers_mut();
    headers.set("access-control-allow-origin", &origin)?;
    headers.set("access-control-allow-methods", "GET,OPTIONS")?;
    headers.set("access-control-allow-headers", "Content-Type,X-Request-Id")?;
    headers.set("vary", "Origin")?;
    security_headers(response)?;
    Ok(())
}

fn request_id(req: &Request) -> String {
    req.headers()
        .get("X-Request-Id")
        .ok()
        .flatten()
        .filter(|value| !value.is_empty() && value.len() <= 128)
        .unwrap_or_else(|| format!("irenx-{}", Date::now().to_string()))
}

fn with_request_id(response: &mut Response, id: &str) -> Result<()> {
    response.headers_mut().set("x-request-id", id)?;
    Ok(())
}

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let url = req.url()?;
    let id = request_id(&req);

    if method == Method::Options {
        let mut response = Response::empty()?.with_status(204);
        cors(&mut response, &env)?;
        with_request_id(&mut response, &id)?;
        return Ok(response);
    }

    if method != Method::Get {
        let mut response = json(&ErrorBody { error: "method not allowed" }, 405)?;
        response.headers_mut().set("allow", "GET, OPTIONS")?;
        cors(&mut response, &env)?;
        with_request_id(&mut response, &id)?;
        return Ok(response);
    }

    if url.path() == "/api/health" || url.path() == "/health" {
        let mut response = json(
            &Health {
                ok: true,
                service: "irenx-rust-edge",
                version: "4.1.0",
                runtime: "cloudflare-workers-rust-wasm",
                readiness: "canary",
            },
            200,
        )?;
        cors(&mut response, &env)?;
        with_request_id(&mut response, &id)?;
        return Ok(response);
    }

    if url.path() == "/api/ready" || url.path() == "/ready" {
        let mut response = json(
            &Health {
                ok: true,
                service: "irenx-rust-edge",
                version: "4.1.0",
                runtime: "cloudflare-workers-rust-wasm",
                readiness: "canary",
            },
            200,
        )?;
        cors(&mut response, &env)?;
        with_request_id(&mut response, &id)?;
        return Ok(response);
    }

    let mut response = json(
        &ErrorBody {
            error: "Rust edge runtime is healthy; production traffic remains controlled by the IRENX gateway.",
        },
        404,
    )?;
    cors(&mut response, &env)?;
    with_request_id(&mut response, &id)?;
    Ok(response)
}
