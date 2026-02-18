use crate::error::StorageError;
use crate::traits::StorageBackend;
use aws_sdk_s3::Client;

/// AWS S3 storage backend.
pub struct S3Storage {
    client: Client,
    bucket: String,
    prefix: String,
    public_base_url: String,
}

impl S3Storage {
    /// Create a new S3 storage backend.
    ///
    /// `public_base_url` is the base URL for public access (e.g., CloudFront URL or S3 bucket URL).
    pub async fn new(
        bucket: String,
        prefix: String,
        public_base_url: String,
    ) -> Result<Self, StorageError> {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let client = Client::new(&config);
        Ok(Self {
            client,
            bucket,
            prefix,
            public_base_url,
        })
    }

    fn s3_key(&self, path: &str) -> String {
        if self.prefix.is_empty() {
            path.to_string()
        } else {
            format!("{}/{}", self.prefix.trim_end_matches('/'), path)
        }
    }

    fn content_type(path: &str) -> &'static str {
        if path.ends_with(".png") {
            "image/png"
        } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
            "image/jpeg"
        } else if path.ends_with(".md") {
            "text/markdown; charset=utf-8"
        } else if path.ends_with(".json") {
            "application/json; charset=utf-8"
        } else {
            "application/octet-stream"
        }
    }
}

#[async_trait::async_trait]
impl StorageBackend for S3Storage {
    async fn write_bytes(&self, path: &str, data: &[u8]) -> Result<(), StorageError> {
        let key = self.s3_key(path);
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .content_type(Self::content_type(path))
            .body(data.to_vec().into())
            .send()
            .await
            .map_err(|e| StorageError::S3(format!("Failed to upload {key}: {e}")))?;
        Ok(())
    }

    async fn write_text(&self, path: &str, text: &str) -> Result<(), StorageError> {
        self.write_bytes(path, text.as_bytes()).await
    }

    async fn read_bytes(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        let key = self.s3_key(path);
        let output = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
            .map_err(|e| StorageError::S3(format!("Failed to read {key}: {e}")))?;

        let data = output
            .body
            .collect()
            .await
            .map_err(|e| StorageError::S3(format!("Failed to read body for {key}: {e}")))?
            .into_bytes()
            .to_vec();
        Ok(data)
    }

    async fn exists(&self, path: &str) -> Result<bool, StorageError> {
        let key = self.s3_key(path);
        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await
        {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    async fn create_dir(&self, _path: &str) -> Result<(), StorageError> {
        // S3 doesn't have directories — no-op
        Ok(())
    }

    fn public_url(&self, path: &str) -> String {
        let key = self.s3_key(path);
        format!("{}/{}", self.public_base_url.trim_end_matches('/'), key)
    }

    fn backend_name(&self) -> &str {
        "s3"
    }
}
