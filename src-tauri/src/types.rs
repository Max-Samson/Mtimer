//! Shared types and validation functions for the Tauri application.

use regex::Regex;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::LazyLock;

/// Default shortcut for the quick pane
pub const DEFAULT_QUICK_PANE_SHORTCUT: &str = "CommandOrControl+Shift+.";

/// Maximum size for recovery data files (10MB)
pub const MAX_RECOVERY_DATA_BYTES: u32 = 10_485_760;

/// Pre-compiled regex pattern for filename validation.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub static FILENAME_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$")
        .expect("Failed to compile filename regex pattern")
});

// ============================================================================
// Preferences
// ============================================================================

/// Application preferences that persist to disk.
/// Only contains settings that should be saved between sessions.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppPreferences {
    pub theme: String,
    /// Global shortcut for quick pane (e.g., "CommandOrControl+Shift+.")
    /// If None, uses the default shortcut
    pub quick_pane_shortcut: Option<String>,
    /// User's preferred language (e.g., "en", "es", "de")
    /// If None, uses system locale detection
    pub language: Option<String>,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            quick_pane_shortcut: None, // None means use default
            language: None,            // None means use system locale
        }
    }
}

// ============================================================================
// Recovery Errors
// ============================================================================

/// Error types for recovery operations (typed for frontend matching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum RecoveryError {
    /// File does not exist (expected case, not a failure)
    FileNotFound,
    /// Filename validation failed
    ValidationError { message: String },
    /// Data exceeds size limit
    DataTooLarge { max_bytes: u32 },
    /// File system read/write error
    IoError { message: String },
    /// JSON serialization/deserialization error
    ParseError { message: String },
}

impl std::fmt::Display for RecoveryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecoveryError::FileNotFound => write!(f, "File not found"),
            RecoveryError::ValidationError { message } => write!(f, "Validation error: {message}"),
            RecoveryError::DataTooLarge { max_bytes } => {
                write!(f, "Data too large (max {max_bytes} bytes)")
            }
            RecoveryError::IoError { message } => write!(f, "IO error: {message}"),
            RecoveryError::ParseError { message } => write!(f, "Parse error: {message}"),
        }
    }
}

// ============================================================================
// Validation Functions
// ============================================================================

/// Validates a filename for safe file system operations.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    if filename.chars().count() > 100 {
        return Err("Filename too long (max 100 characters)".to_string());
    }

    if !FILENAME_PATTERN.is_match(filename) {
        return Err(
            "Invalid filename: only alphanumeric characters, dashes, underscores, and dots allowed"
                .to_string(),
        );
    }

    Ok(())
}

/// Validates string input length (by character count, not bytes).
pub fn validate_string_input(input: &str, max_len: usize, field_name: &str) -> Result<(), String> {
    let char_count = input.chars().count();
    if char_count > max_len {
        return Err(format!("{field_name} too long (max {max_len} characters)"));
    }
    Ok(())
}

/// Validates theme value.
pub fn validate_theme(theme: &str) -> Result<(), String> {
    match theme {
        "light" | "dark" | "system" => Ok(()),
        _ => Err("Invalid theme: must be 'light', 'dark', or 'system'".to_string()),
    }
}

// 纯类型与输入边界测试：不接触真实 app-data、窗口或系统权限。
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_preferences_are_safe_and_optional_fields_are_backward_compatible() {
        let defaults = AppPreferences::default();
        assert_eq!(defaults.theme, "system");
        assert!(defaults.language.is_none());
        assert!(defaults.quick_pane_shortcut.is_none());
        let old: AppPreferences = serde_json::from_str(r#"{"theme":"dark"}"#).unwrap();
        assert_eq!(old.theme, "dark");
        assert!(old.language.is_none());
    }

    #[test]
    fn preferences_round_trip_without_losing_fields() {
        let preferences = AppPreferences {
            theme: "dark".to_string(),
            language: Some("fr".to_string()),
            quick_pane_shortcut: Some(DEFAULT_QUICK_PANE_SHORTCUT.to_string()),
        };
        let serialized = serde_json::to_string(&preferences).unwrap();
        let restored: AppPreferences = serde_json::from_str(&serialized).unwrap();
        assert_eq!(restored.theme, preferences.theme);
        assert_eq!(restored.language, preferences.language);
        assert_eq!(restored.quick_pane_shortcut, preferences.quick_pane_shortcut);
    }

    #[test]
    fn filename_validation_rejects_traversal_and_path_separators() {
        for filename in [
            "",
            "..",
            "../draft",
            "draft/name",
            "draft\\name",
            "a.b.c",
            ".hidden",
            "a b",
            "恢复",
        ] {
            assert!(validate_filename(filename).is_err(), "accepted {filename}");
        }
    }

    #[test]
    fn filename_validation_accepts_safe_names_and_checks_length_boundary() {
        for filename in ["draft", "draft_1", "draft-backup.json"] {
            assert!(validate_filename(filename).is_ok(), "rejected {filename}");
        }
        assert!(validate_filename(&"a".repeat(100)).is_ok());
        assert!(validate_filename(&"a".repeat(101)).is_err());
    }

    #[test]
    fn string_validation_counts_characters_not_utf8_bytes() {
        assert!(validate_string_input("你好", 2, "Name").is_ok());
        assert!(validate_string_input("你好啊", 2, "Name").is_err());
        assert!(validate_string_input("", 0, "Name").is_ok());
    }

    #[test]
    fn themes_are_an_explicit_allowlist() {
        for theme in ["light", "dark", "system"] {
            assert!(validate_theme(theme).is_ok());
        }
        for theme in ["", "Dark", "custom"] {
            assert!(validate_theme(theme).is_err());
        }
    }

    #[test]
    fn recovery_errors_keep_the_frontend_discriminated_union() {
        let error = RecoveryError::DataTooLarge {
            max_bytes: MAX_RECOVERY_DATA_BYTES,
        };
        let value = serde_json::to_value(&error).unwrap();
        assert_eq!(value["type"], "DataTooLarge");
        assert_eq!(value["max_bytes"], MAX_RECOVERY_DATA_BYTES);
        let decoded: RecoveryError = serde_json::from_value(value).unwrap();
        assert_eq!(
            decoded.to_string(),
            format!("Data too large (max {MAX_RECOVERY_DATA_BYTES} bytes)")
        );
        assert_eq!(
            serde_json::to_value(RecoveryError::FileNotFound).unwrap()["type"],
            "FileNotFound"
        );
    }
}
