use std::process::Command;

#[test]
fn help_documents_the_real_workflow() {
    let output = Command::new(env!("CARGO_BIN_EXE_raw-fit-check"))
        .arg("--help")
        .output()
        .expect("CLI should run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("check"));
    assert!(stdout.contains("registry"));
    assert!(stdout.contains("Files never leave this computer"));
}

#[test]
fn documented_registry_json_is_scriptable() {
    let output = Command::new(env!("CARGO_BIN_EXE_raw-fit-check"))
        .args(["registry", "--json"])
        .output()
        .expect("CLI should run");
    assert!(output.status.success());
    let registry: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(registry["schema_version"], 1);
    assert!(registry["rules"].as_array().unwrap().iter().all(|rule| {
        rule["evidence"]["url"]
            .as_str()
            .is_some_and(|url| url.starts_with("https://"))
    }));
}

#[test]
fn missing_input_has_automation_safe_error_code() {
    let output = Command::new(env!("CARGO_BIN_EXE_raw-fit-check"))
        .args(["check", "/definitely/not/a/raw-file.NEF", "--json"])
        .output()
        .expect("CLI should run");
    assert_eq!(output.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&output.stderr).contains("input does not exist"));
}
