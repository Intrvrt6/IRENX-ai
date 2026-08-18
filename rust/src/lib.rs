use serde::Serialize;
use worker::*;

#[derive(Serialize)]
struct Health<'a> {
    ok: bool,
    service: &'a str,
    version: &'a str,
    runtime: &'a str,
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    error: &'a str,
}

fn json<T: Serialize>(value: &T, status: u16) -> Result<Response> {
    let mut response = Response::from_json(value)?;
    response = response.with_status(status);
    response.headers_mut().set("cache-control", "no-store")?;
    response.headers_mut().set("x-irenx-runtime", "rust-wasm")?;
    Ok(response)
}

fn cors(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("access-control-allow-origin", "*")?;
    headers.set("access-control-allow-methods", "GET,POST,OPTIONS")?;
    headers.set("access-control-allow-headers", "Authorization,Content-Type,X-Request-Id")?;
    headers.set("x-content-type-options", "nosniff")?;
    headers.set("referrer-policy", "no-referrer")?;
    Ok(())
}

#[event(fetch)]
pub async fn main(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let url = req.url()?;

    if method == Method::Options {
        let mut response = Response::empty()?.with_status(204);
        cors(&mut response)?;
        return Ok(response);
    }

    if url.path() == "/api/health" || url.path() == "/health" {
        let mut response = json(&Health {
            ok: true,
            service: "irenx-rust-edge",
            version: "4.0.0",
            runtime: "cloudflare-workers-rust-wasm",
        }, 200)?;
        cors(&mut response)?;
        return Ok(response);
    }

    let body = ErrorBody { error: "Rust edge runtime is installed and healthy; traffic cutover is controlled by the IRENX gateway." };
    let mut response = json(&body, 404)?;
    cors(&mut response)?;
    Ok(response)
}
