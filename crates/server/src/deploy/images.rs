use std::path::Path;
use tracing::info;

use crate::routes::deploy::ImageTarget;

/// Deploy images to the chosen target. Returns a summary string.
pub async fn deploy_images(target: &ImageTarget, images_dir: &Path) -> Result<String, String> {
    match target {
        ImageTarget::LocalFolder { path } => deploy_to_local(images_dir, path).await,
        ImageTarget::S3 {
            bucket,
            prefix,
            region,
        } => deploy_to_s3(images_dir, bucket, prefix, region.as_deref()).await,
        ImageTarget::Scp {
            host,
            port,
            username,
            remote_path,
            ..
        } => deploy_to_scp(images_dir, host, *port, username, remote_path).await,
    }
}

async fn deploy_to_local(images_dir: &Path, dest_path: &str) -> Result<String, String> {
    let dest = Path::new(dest_path);
    tokio::fs::create_dir_all(dest)
        .await
        .map_err(|e| format!("Failed to create destination directory: {e}"))?;

    let mut entries = tokio::fs::read_dir(images_dir)
        .await
        .map_err(|e| format!("Failed to read images directory: {e}"))?;

    let mut count = 0u32;
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read dir entry: {e}"))?
    {
        let path = entry.path();
        if path.is_file() {
            let file_name = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("image.png");
            let dest_file = dest.join(file_name);
            tokio::fs::copy(&path, &dest_file)
                .await
                .map_err(|e| format!("Failed to copy {file_name}: {e}"))?;
            count += 1;
        }
    }

    info!("Deployed {count} images to local folder: {dest_path}");
    Ok(format!("{count} images copied to {dest_path}"))
}

async fn deploy_to_s3(
    images_dir: &Path,
    bucket: &str,
    prefix: &str,
    _region: Option<&str>,
) -> Result<String, String> {
    use jay_rag_storage::{S3Storage, StorageBackend};

    // S3Storage uses AWS SDK default config (env vars / ~/.aws/credentials)
    let storage = S3Storage::new(
        bucket.to_string(),
        prefix.to_string(),
        String::new(), // public_base_url not needed for deploy
    )
    .await
    .map_err(|e| format!("Failed to initialize S3 storage: {e}"))?;

    let mut entries = tokio::fs::read_dir(images_dir)
        .await
        .map_err(|e| format!("Failed to read images directory: {e}"))?;

    let mut count = 0u32;
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read dir entry: {e}"))?
    {
        let path = entry.path();
        if path.is_file() {
            let file_name = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("image.png");
            let bytes = tokio::fs::read(&path)
                .await
                .map_err(|e| format!("Failed to read {file_name}: {e}"))?;

            storage
                .write_bytes(file_name, &bytes)
                .await
                .map_err(|e| format!("Failed to upload {file_name} to S3: {e}"))?;
            count += 1;
        }
    }

    info!("Deployed {count} images to S3 s3://{bucket}/{prefix}");
    Ok(format!("{count} images uploaded to s3://{bucket}/{prefix}"))
}

async fn deploy_to_scp(
    _images_dir: &Path,
    host: &str,
    port: Option<u16>,
    username: &str,
    remote_path: &str,
) -> Result<String, String> {
    let _port = port.unwrap_or(22);
    Err(format!(
        "SCP/SFTP deployment to {username}@{host}:{remote_path} is not yet implemented (Stage 3)"
    ))
}
