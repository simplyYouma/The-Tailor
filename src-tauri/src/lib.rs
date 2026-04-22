use std::fs;
use tauri::{AppHandle, Manager};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};

#[cfg(target_os = "windows")]
fn get_machine_id_internal() -> String {
    use std::process::Command;
    
    // 1. Try WMIC (Standard)
    if let Ok(output) = Command::new("wmic").args(&["csproduct", "get", "uuid"]).output() {
        let result = String::from_utf8_lossy(&output.stdout);
        let cleaned = result.replace("UUID", "").trim().to_string();
        if !cleaned.is_empty() && cleaned != "00000000-0000-0000-0000-000000000000" { 
            return cleaned; 
        }
    }

    // 2. Try PowerShell MachineGuid (Fallback)
    if let Ok(output) = Command::new("powershell")
        .args(&["-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid"])
        .output() {
        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !result.is_empty() { return result; }
    }

    // 3. Try Reg query directly
    if let Ok(output) = Command::new("reg")
        .args(&["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
        .output() {
        let result = String::from_utf8_lossy(&output.stdout);
        if let Some(guid) = result.split_whitespace().last() {
            if guid.contains('-') { return guid.to_string(); }
        }
    }

    "ID-MOTEUR-YUMI-NON-IDENTIFIE".to_string()
}

#[cfg(not(target_os = "windows"))]
fn get_machine_id_internal() -> String {
    if let Ok(id) = fs::read_to_string("/etc/machine-id") { return id.trim().to_string(); }
    "FALLBACK_MACHINE_ID".to_string()
}

#[tauri::command]
fn get_machine_id() -> String {
    get_machine_id_internal().to_uppercase()
}

#[tauri::command]
fn verify_license(machine_id: String, license_key: String) -> bool {
    // Clé publique Yumi Hub
    let pub_bytes = match hex::decode("eef17a2365fe4e7d9fbad5d87741f79979e00055108be650d57ece534d53360a") {
        Ok(b) => b,
        Err(_) => return false,
    };
    let mut pub_arr = [0u8; 32];
    pub_arr.copy_from_slice(&pub_bytes);
    
    let public_key = match VerifyingKey::from_bytes(&pub_arr) {
        Ok(pk) => pk,
        Err(_) => return false,
    };

    let sig_bytes = match hex::decode(&license_key) {
        Ok(b) => b,
        Err(_) => return false,
    };
    let signature = match Signature::from_slice(&sig_bytes) {
        Ok(s) => s,
        Err(_) => return false,
    };

    println!("[LICENSE_Backend] Verifying Message: {}", machine_id);
    println!("[LICENSE_Backend] With Key Hash: {}", &license_key[..10]);
    
    let res = public_key.verify(machine_id.as_bytes(), &signature).is_ok();
    println!("[LICENSE_Backend] Result: {}", res);
    res
}

#[tauri::command]
fn get_license_key(app_handle: AppHandle) -> String {
    let data_dir = match app_handle.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => return "".to_string(),
    };
    let license_path = data_dir.join(".license");
    fs::read_to_string(license_path).unwrap_or_default().trim().to_string()
}

#[tauri::command]
fn save_license_key(app_handle: AppHandle, key: String) -> Result<(), String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    let license_path = data_dir.join(".license");
    fs::write(license_path, key).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_secure_storage(app_handle: AppHandle, key: String) -> String {
    let data_dir = match app_handle.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => return String::new(),
    };
    fs::read_to_string(data_dir.join(format!(".{}", key)))
        .unwrap_or_default()
        .trim()
        .to_string()
}

#[tauri::command]
fn set_secure_storage(app_handle: AppHandle, key: String, value: String) -> Result<(), String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    fs::write(data_dir.join(format!(".{}", key)), value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_password(password: String, hash: String) -> bool {
    bcrypt::verify(password, &hash).unwrap_or(false)
}

#[tauri::command]
fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[tauri::command]
fn backup_database(app_handle: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let backup_dir = data_dir.join("backups");

    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }

    let db_path = data_dir.join("the_tailor_v2.db");
    if !db_path.exists() {
        return Ok(());
    }

    let now = chrono::Local::now();
    let backup_name = format!("backup-{}.db", now.format("%Y-%m-%d"));
    let backup_path = backup_dir.join(backup_name);

    if !backup_path.exists() {
        fs::copy(db_path, backup_path).map_err(|e| e.to_string())?;
    }

    // Retention: 7 days
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(created) = metadata.created() {
                    if created.elapsed().map(|d| d.as_secs()).unwrap_or(0) > 7 * 24 * 60 * 60 {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:the_tailor_v2.db", vec![]).build())
        .invoke_handler(tauri::generate_handler![
            get_machine_id,
            verify_license,
            get_license_key,
            save_license_key,
            get_secure_storage,
            set_secure_storage,
            hash_password,
            verify_password,
            generate_id,
            backup_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
