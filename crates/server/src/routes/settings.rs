use axum::extract::State;
use axum::Json;
use std::sync::Arc;

use crate::jobs::models::NotificationSettings;
use crate::state::AppState;

/// GET /api/settings/notifications
pub async fn get_notification_settings(
    State(state): State<Arc<AppState>>,
) -> Json<NotificationSettings> {
    Json(state.job_queue.get_notification_settings())
}

/// PUT /api/settings/notifications
pub async fn update_notification_settings(
    State(state): State<Arc<AppState>>,
    Json(settings): Json<NotificationSettings>,
) -> Json<NotificationSettings> {
    state.job_queue.update_notification_settings(&settings);
    Json(state.job_queue.get_notification_settings())
}

/// POST /api/settings/notifications/test
pub async fn test_notification(
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let settings = state.job_queue.get_notification_settings();

    if !settings.enabled {
        return Json(serde_json::json!({
            "success": false,
            "error": "Notifications are disabled"
        }));
    }

    let mut results = Vec::new();

    if settings.line_enabled && !settings.line_token.is_empty() {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://notify-api.line.me/api/notify")
            .header("Authorization", format!("Bearer {}", settings.line_token))
            .form(&[("message", "[JAY-RAG] Test notification - settings are working!")])
            .send()
            .await;
        match resp {
            Ok(r) if r.status().is_success() => results.push("LINE: OK".to_string()),
            Ok(r) => results.push(format!("LINE: Failed ({})", r.status())),
            Err(e) => results.push(format!("LINE: Error ({e})")),
        }
    }

    if settings.email_enabled && !settings.email_to.is_empty() {
        use lettre::message::header::ContentType;
        use lettre::transport::smtp::authentication::Credentials;
        use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

        let email_result: Result<(), String> = (|| async {
            let email = Message::builder()
                .from(settings.email_from.parse().map_err(|e| format!("{e}"))?)
                .to(settings.email_to.parse().map_err(|e| format!("{e}"))?)
                .subject("[JAY-RAG] Test notification")
                .header(ContentType::TEXT_PLAIN)
                .body("Test notification from JAY-RAG-TOOLS - settings are working!".to_string())
                .map_err(|e| format!("{e}"))?;

            let creds = Credentials::new(
                settings.smtp_username.clone(),
                settings.smtp_password.clone(),
            );

            let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&settings.smtp_host)
                .map_err(|e| format!("{e}"))?
                .port(settings.smtp_port)
                .credentials(creds)
                .build();

            mailer.send(email).await.map_err(|e| format!("{e}"))?;
            Ok(())
        })()
        .await;

        match email_result {
            Ok(()) => results.push("Email: OK".to_string()),
            Err(e) => results.push(format!("Email: Error ({e})")),
        }
    }

    if results.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "No notification channels are configured"
        }));
    }

    let all_ok = results.iter().all(|r| r.contains("OK"));
    Json(serde_json::json!({
        "success": all_ok,
        "results": results
    }))
}
