use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
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

        // 跳过隐藏文件和缓存目录
        if name.starts_with('.') || name == "node_modules" || name == "target" {
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
        .invoke_handler(tauri::generate_handler![read_folder_tree])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
