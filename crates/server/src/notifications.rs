use crate::jobs::models::{Job, JobStatus, NotificationSettings};

/// Send notifications after a job finishes, if enabled.
pub async fn notify_job_finished(job: &Job, settings: &NotificationSettings) {
    if !settings.enabled || !job.config.notify {
        return;
    }

    let should_notify = match job.status {
        JobStatus::Completed => settings.notify_on_complete,
        JobStatus::Failed => settings.notify_on_failure,
        _ => false,
    };

    if !should_notify {
        return;
    }

    let message = build_message(job);

    if settings.line_enabled && !settings.line_channel_token.is_empty() && !settings.line_user_id.is_empty() {
        if let Err(e) = send_line_message(&settings.line_channel_token, &settings.line_user_id, &message).await {
            tracing::warn!("LINE Messaging API failed: {e}");
        }
    }

    if settings.email_enabled && !settings.email_to.is_empty() {
        if let Err(e) = send_email(settings, &message, job).await {
            tracing::warn!("Email notification failed: {e}");
        }
    }
}

/// Format a notification message for the given job.
fn build_message(job: &Job) -> String {
    let status_icon = match job.status {
        JobStatus::Completed => "Completed",
        JobStatus::Failed => "Failed",
        _ => "Updated",
    };

    let duration_str = job
        .duration_seconds
        .map(|d| {
            if d < 60.0 {
                format!("{:.0}s", d)
            } else {
                format!("{}m {}s", (d / 60.0) as u32, (d % 60.0) as u32)
            }
        })
        .unwrap_or_else(|| "-".to_string());

    let mut msg = format!(
        "[JAY-RAG] Job {status_icon}\nFile: {}\nDuration: {duration_str}",
        job.filename
    );

    if let Some(ref error) = job.error {
        msg.push_str(&format!("\nError: {error}"));
    }

    if let Some(ref result) = job.result {
        msg.push_str(&format!("\nImages: {}", result.image_count));
    }

    msg
}

/// Send a push message via LINE Messaging API.
async fn send_line_message(channel_token: &str, user_id: &str, message: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "to": user_id,
        "messages": [
            {
                "type": "text",
                "text": message
            }
        ]
    });
    let resp = client
        .post("https://api.line.me/v2/bot/message/push")
        .header("Authorization", format!("Bearer {channel_token}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("LINE Messaging API returned {status}: {body}"));
    }
    tracing::info!("LINE message sent to {user_id}");
    Ok(())
}

/// Send an email notification via SMTP.
async fn send_email(settings: &NotificationSettings, message: &str, job: &Job) -> Result<(), String> {
    use lettre::message::header::ContentType;
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

    let subject = format!(
        "[JAY-RAG] {} - {}",
        match job.status {
            JobStatus::Completed => "Job Completed",
            JobStatus::Failed => "Job Failed",
            _ => "Job Update",
        },
        job.filename
    );

    let email = Message::builder()
        .from(
            settings
                .email_from
                .parse()
                .map_err(|e| format!("Invalid from address: {e}"))?,
        )
        .to(settings
            .email_to
            .parse()
            .map_err(|e| format!("Invalid to address: {e}"))?)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(message.to_string())
        .map_err(|e| format!("Failed to build email: {e}"))?;

    let creds = Credentials::new(
        settings.smtp_username.clone(),
        settings.smtp_password.clone(),
    );

    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&settings.smtp_host)
        .map_err(|e| format!("SMTP relay error: {e}"))?
        .port(settings.smtp_port)
        .credentials(creds)
        .build();

    mailer
        .send(email)
        .await
        .map_err(|e| format!("SMTP send error: {e}"))?;

    tracing::info!("Email notification sent to {}", settings.email_to);
    Ok(())
}
