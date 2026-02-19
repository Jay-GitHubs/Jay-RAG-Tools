use axum::extract::DefaultBodyLimit;
use axum::routing::{delete, get, post};
use axum::Router;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};

use crate::routes;
use crate::state::AppState;
use crate::ws;

/// Build the Axum application router.
pub fn create_app(state: Arc<AppState>) -> Router {
    let api_routes = Router::new()
        .route("/api/health", get(routes::health::health_check))
        .route("/api/upload", post(routes::upload::upload_pdf))
        .route("/api/jobs", get(routes::jobs::list_jobs))
        .route("/api/jobs/{id}", get(routes::jobs::get_job))
        .route("/api/jobs/{id}", delete(routes::jobs::delete_job))
        .route("/api/results/{job_id}", get(routes::results::get_results))
        .route("/api/results/{job_id}/export", get(routes::export::export_zip))
        .route("/api/config", get(routes::config::get_config));

    let ws_route = Router::new()
        .route("/ws/{job_id}", get(ws::ws_handler));

    // Serve images as static files
    let images_service = ServeDir::new(state.output_dir.join("images"));

    // Serve frontend SPA (if built)
    let frontend_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("frontend")
        .join("out");

    let spa_service = ServeDir::new(&frontend_dir)
        .not_found_service(ServeFile::new(frontend_dir.join("index.html")));

    Router::new()
        .merge(api_routes)
        .merge(ws_route)
        .nest_service("/images", images_service)
        .fallback_service(spa_service)
        .layer(CorsLayer::permissive())
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB
        .with_state(state)
}
