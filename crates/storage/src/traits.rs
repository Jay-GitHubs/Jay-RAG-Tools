use crate::error::StorageError;

/// Abstract storage backend for writing processing outputs.
#[async_trait::async_trait]
pub trait StorageBackend: Send + Sync {
    /// Write raw bytes to a path.
    async fn write_bytes(&self, path: &str, data: &[u8]) -> Result<(), StorageError>;

    /// Write text content to a path.
    async fn write_text(&self, path: &str, text: &str) -> Result<(), StorageError>;

    /// Read raw bytes from a path.
    async fn read_bytes(&self, path: &str) -> Result<Vec<u8>, StorageError>;

    /// Check if a path exists.
    async fn exists(&self, path: &str) -> Result<bool, StorageError>;

    /// Create a directory (and parents).
    async fn create_dir(&self, path: &str) -> Result<(), StorageError>;

    /// Get the public URL for a stored file (for image serving).
    fn public_url(&self, path: &str) -> String;

    /// Storage backend name.
    fn backend_name(&self) -> &str;
}
