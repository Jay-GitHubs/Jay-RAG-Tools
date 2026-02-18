pub mod error;
pub mod local;
pub mod nfs;
pub mod s3;
pub mod traits;

pub use error::StorageError;
pub use local::LocalStorage;
pub use nfs::NfsStorage;
pub use s3::S3Storage;
pub use traits::StorageBackend;
