use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            export_excel,
            get_app_version
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running RxLens application");
}

/// 基础问候指令（用于测试通信链路）
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to RxLens v4.0.0", name)
}

/// 导出 Excel 文件到指定路径
#[tauri::command]
async fn export_excel(path: String, data: String) -> Result<String, String> {
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(format!("文件已导出至: {}", path))
}

/// 获取应用版本号
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
