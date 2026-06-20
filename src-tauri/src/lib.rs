use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::path::Path;
use std::fs;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

/// 启动时通过文件关联打开的文件路径（argv 中提取，前端调用 get_initial_file 取走）
struct InitialFile(Mutex<Option<String>>);

/// 前端初始化时调用，取走启动参数中的文件路径（取后清空，只返回一次）
#[tauri::command]
fn get_initial_file(state: tauri::State<InitialFile>) -> Option<String> {
    state.0.lock().ok().and_then(|mut opt| opt.take())
}

/// 递归读取目录树（Rust 端实现，减少 IPC 调用）
fn read_dir_tree(dir: &Path, depth: u32, max_depth: u32) -> Vec<FileNode> {
    if depth > max_depth {
        return Vec::new();
    }

    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut nodes: Vec<FileNode> = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        // 跳过 .git、node_modules、target 目录
        if name == ".git" || name == "node_modules" || name == "target" {
            continue;
        }

        let path = entry.path();
        let is_dir = path.is_dir();

        // 只收录 md 文件和目录
        if !is_dir && !name.ends_with(".md") && !name.ends_with(".markdown") && !name.ends_with(".mdx") {
            continue;
        }

        let children = if is_dir {
            Some(read_dir_tree(&path, depth + 1, max_depth))
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    // 排序：目录在前，按名称
    nodes.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    nodes
}

#[tauri::command]
fn read_folder_tree(path: String, max_depth: Option<u32>) -> Vec<FileNode> {
    let dir = Path::new(&path);
    let max = max_depth.unwrap_or(5);
    read_dir_tree(dir, 0, max)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 从命令行参数提取 .md 文件路径（Windows 文件关联打开时传入）
            let initial = std::env::args()
                .skip(1)
                .find(|p| {
                    let lower = p.to_lowercase();
                    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
                });
            app.manage(InitialFile(Mutex::new(initial)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_folder_tree, get_initial_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
