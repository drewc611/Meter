// Operator OS desktop cockpit -- a thin, read-only shell over an EXISTING
// Operator OS business folder (created via `pip install operator-os` /
// `operator-os new <folder>`, or the original `git clone` + install.sh).
// This app does not bundle the tool itself and does not create new
// businesses; it opens a folder you already set up and runs the same `./os`
// commands a terminal would, in a native window.
//
// Deliberately read-only in this release: only reporting commands are
// allowlisted below (no `set`, `add`, `pull --apply`, `undo`, etc.). That
// matches the product's own stated posture ("never sends anything, every
// draft waits for you") and keeps the desktop app's first release from
// needing its own confirmation/undo UI for money-moving actions -- those
// still go through the terminal, on purpose, until this app earns that
// trust with real usage.
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
struct FolderCheck {
    valid: bool,
    reason: Option<String>,
    business_name: Option<String>,
}

#[derive(Serialize)]
struct CommandResult {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
}

// Every entry here is a real, already-shipped, read-only Operator OS
// command (see operator-os/README.md's own command table) -- nothing here
// writes to data/. Keep this list in sync by hand rather than accepting
// arbitrary args from the frontend: a hardcoded allowlist is the point.
const ALLOWED_COMMANDS: &[&[&str]] = &[
    &["doctor"],
    &["brief"],
    &["cash", "90"],
    &["sim"],
    &["whatfirst"],
    &["aging"],
    &["margin"],
    &["anomalies"],
    &["validate"],
    &["drift"],
    &["imports"],
    &["books", "check"],
    &["books", "pnl"],
    &["books", "balance"],
];

fn find_python() -> Option<String> {
    for candidate in ["python3", "python"] {
        let version_check = Command::new(candidate)
            .args([
                "-c",
                "import sys; print(sys.version_info[0], sys.version_info[1])",
            ])
            .output();
        if let Ok(out) = version_check {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                let mut parts = text.split_whitespace();
                let major: i32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
                let minor: i32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
                if major >= 3 && minor >= 9 {
                    return Some(candidate.to_string());
                }
            }
        }
    }
    None
}

#[tauri::command]
fn check_folder(path: String) -> FolderCheck {
    let base = PathBuf::from(&path);
    let os_script = base.join("os");
    let scripts_entry = base.join("scripts").join("os.py");
    let brand_file = base.join("brand.json");

    if !os_script.exists() || !scripts_entry.exists() {
        return FolderCheck {
            valid: false,
            reason: Some("This folder doesn't look like an Operator OS business folder (no ./os launcher found).".into()),
            business_name: None,
        };
    }

    let business_name = std::fs::read_to_string(base.join("data").join("business.yml"))
        .ok()
        .and_then(|contents| {
            contents.lines().find_map(|line| {
                let line = line.trim();
                line.strip_prefix("business_name:")
                    .map(|v| v.trim().trim_matches('"').to_string())
            })
        })
        .filter(|name| !name.is_empty() && name != "My Business");

    let _ = brand_file; // presence isn't required, just a nice-to-have signal
    FolderCheck {
        valid: true,
        reason: None,
        business_name,
    }
}

#[tauri::command]
fn run_report(folder: String, command: Vec<String>) -> Result<CommandResult, String> {
    if !ALLOWED_COMMANDS
        .iter()
        .any(|allowed| allowed == &command.as_slice())
    {
        return Err(format!(
            "'{}' isn't a report command this app runs.",
            command.join(" ")
        ));
    }

    let python = find_python().ok_or_else(|| {
        "Python 3.9+ isn't on this machine's PATH. Install it, then reopen this folder.".to_string()
    })?;

    let base = Path::new(&folder);
    let script = base.join("scripts").join("os.py");
    if !script.exists() {
        return Err(
            "This folder's scripts/os.py is missing -- is this still a valid Operator OS folder?"
                .to_string(),
        );
    }

    let output = Command::new(python)
        .arg(&script)
        .args(&command)
        .current_dir(base)
        .output()
        .map_err(|e| format!("Couldn't run './os {}': {}", command.join(" "), e))?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![check_folder, run_report])
        .run(tauri::generate_context!())
        .expect("error while running Operator OS desktop cockpit");
}

#[cfg(test)]
mod tests {
    use super::*;

    // Requires OPERATOR_OS_TEST_FOLDER pointing at a real scaffolded
    // business folder (see packaging/desktop/README.md's dev instructions
    // -- `operator-os new` + `./os use 01-field-service` gives one). Skips
    // rather than fails when unset, so a plain `cargo test` in CI (no
    // scaffolded folder present) doesn't break on missing fixture data.
    fn fixture_folder() -> Option<String> {
        std::env::var("OPERATOR_OS_TEST_FOLDER").ok()
    }

    #[test]
    fn check_folder_rejects_a_folder_with_no_launcher() {
        let tmp = std::env::temp_dir().join("not-an-operator-os-folder");
        std::fs::create_dir_all(&tmp).unwrap();
        let result = check_folder(tmp.to_string_lossy().to_string());
        assert!(!result.valid);
        assert!(result.reason.is_some());
    }

    #[test]
    fn check_folder_accepts_a_real_scaffolded_folder() {
        let Some(folder) = fixture_folder() else {
            return;
        };
        let result = check_folder(folder);
        assert!(
            result.valid,
            "expected a real Operator OS folder to validate"
        );
        assert_eq!(
            result.business_name.as_deref(),
            Some("Kestrel Heating and Air")
        );
    }

    #[test]
    fn run_report_rejects_a_command_not_on_the_allowlist() {
        let Some(folder) = fixture_folder() else {
            return;
        };
        let result = run_report(
            folder,
            vec!["set".into(), "invoices".into(), "i0001".into()],
        );
        assert!(
            result.is_err(),
            "a write command must never be runnable from this app"
        );
    }

    #[test]
    fn run_report_runs_a_real_allowlisted_command_against_live_data() {
        let Some(folder) = fixture_folder() else {
            return;
        };
        let result = run_report(folder, vec!["brief".into()]).expect("brief should succeed");
        assert_eq!(result.exit_code, Some(0));
        assert!(
            result.stdout.contains("cash now"),
            "expected a real ./os brief report, got: {}",
            result.stdout
        );
    }
}
