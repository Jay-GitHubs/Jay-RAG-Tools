use crate::error::StorageError;
use crate::local::LocalStorage;
use crate::traits::StorageBackend;
use std::path::PathBuf;

/// NFS/SMB storage backend.
///
/// Delegates to [`LocalStorage`] operating on a mounted network share.
/// Validates that the mount point exists on construction.
pub struct NfsStorage {
    inner: LocalStorage,
    mount_point: PathBuf,
}

impl NfsStorage {
    /// Create a new NFS storage backend.
    ///
    /// `mount_point` must be an existing mounted directory.
    /// `base_url` is the public URL for serving files from the share.
    pub fn new(mount_point: PathBuf, base_url: String) -> Result<Self, StorageError> {
        if !mount_point.exists() || !mount_point.is_dir() {
            return Err(StorageError::Config(format!(
                "NFS mount point does not exist or is not a directory: {}",
                mount_point.display()
            )));
        }
        let inner = LocalStorage::new(mount_point.clone(), base_url);
        Ok(Self { inner, mount_point })
    }

    /// Get the mount point path.
    pub fn mount_point(&self) -> &PathBuf {
        &self.mount_point
    }
}

#[async_trait::async_trait]
impl StorageBackend for NfsStorage {
    async fn write_bytes(&self, path: &str, data: &[u8]) -> Result<(), StorageError> {
        self.inner.write_bytes(path, data).await
    }

    async fn write_text(&self, path: &str, text: &str) -> Result<(), StorageError> {
        self.inner.write_text(path, text).await
    }

    async fn read_bytes(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        self.inner.read_bytes(path).await
    }

    async fn exists(&self, path: &str) -> Result<bool, StorageError> {
        self.inner.exists(path).await
    }

    async fn create_dir(&self, path: &str) -> Result<(), StorageError> {
        self.inner.create_dir(path).await
    }

    fn public_url(&self, path: &str) -> String {
        self.inner.public_url(path)
    }

    fn backend_name(&self) -> &str {
        "nfs"
    }
}
