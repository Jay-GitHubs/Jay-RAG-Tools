use crate::error::StorageError;
use crate::traits::StorageBackend;
use std::path::PathBuf;

/// Local filesystem storage backend.
pub struct LocalStorage {
    /// Root directory for all stored files.
    root: PathBuf,
    /// Base URL for serving files (e.g., "http://localhost:8899").
    base_url: String,
}

impl LocalStorage {
    pub fn new(root: PathBuf, base_url: String) -> Self {
        Self { root, base_url }
    }

    fn full_path(&self, path: &str) -> PathBuf {
        self.root.join(path)
    }
}

#[async_trait::async_trait]
impl StorageBackend for LocalStorage {
    async fn write_bytes(&self, path: &str, data: &[u8]) -> Result<(), StorageError> {
        let full = self.full_path(path);
        if let Some(parent) = full.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&full, data).await?;
        Ok(())
    }

    async fn write_text(&self, path: &str, text: &str) -> Result<(), StorageError> {
        let full = self.full_path(path);
        if let Some(parent) = full.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&full, text.as_bytes()).await?;
        Ok(())
    }

    async fn read_bytes(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        let full = self.full_path(path);
        let data = tokio::fs::read(&full).await?;
        Ok(data)
    }

    async fn exists(&self, path: &str) -> Result<bool, StorageError> {
        let full = self.full_path(path);
        Ok(tokio::fs::try_exists(&full).await.unwrap_or(false))
    }

    async fn create_dir(&self, path: &str) -> Result<(), StorageError> {
        let full = self.full_path(path);
        tokio::fs::create_dir_all(&full).await?;
        Ok(())
    }

    fn public_url(&self, path: &str) -> String {
        format!("{}/{}", self.base_url.trim_end_matches('/'), path)
    }

    fn backend_name(&self) -> &str {
        "local"
    }
}
