use axum::{
    extract::{Path, State, WebSocketUpgrade},
    response::Response,
};
use axum::extract::ws::{Message, WebSocket};
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;

/// WebSocket handler for real-time job progress.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, job_id, state))
}

async fn handle_socket(mut socket: WebSocket, job_id: Uuid, state: Arc<AppState>) {
    let rx = state.job_queue.subscribe_progress(&job_id).await;
    let Some(mut rx) = rx else {
        let _ = socket
            .send(Message::Text(
                serde_json::json!({"error": "Job not found"}).to_string().into(),
            ))
            .await;
        return;
    };

    // Send current job state first
    if let Some(job) = state.job_queue.get_job(&job_id).await {
        let msg = serde_json::to_string(&job).unwrap_or_default();
        if socket.send(Message::Text(msg.into())).await.is_err() {
            return;
        }
    }

    // Stream progress updates
    loop {
        match rx.recv().await {
            Ok(progress) => {
                let msg = serde_json::to_string(&progress).unwrap_or_default();
                if socket.send(Message::Text(msg.into())).await.is_err() {
                    break;
                }
                if progress.phase == "complete" || progress.phase == "error" {
                    break;
                }
            }
            Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
        }
    }
}
