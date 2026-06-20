; ============================================================
; NSIS Installer Hooks - .md 文件类型自定义图标
; Tauri 2 移除了 FileAssociation.icon 字段，默认用 app 图标。
; 这里在安装后覆盖 DefaultIcon，指向独立的 md-file.ico
; ============================================================

!macro NSIS_HOOK_POSTINSTALL
  ; 读取 Tauri 注册的 .md ProgID（可能是 com.zwf.marklite.md 等）
  ReadRegStr $0 HKLM "SOFTWARE\Classes\.md" ""
  StrCmp $0 "" try_hkcu 0
    WriteRegStr HKLM "SOFTWARE\Classes\$0\DefaultIcon" "" "$INSTDIR\md-file.ico"
    Goto refresh
  try_hkcu:
  ReadRegStr $0 HKCU "SOFTWARE\Classes\.md" ""
  StrCmp $0 "" refresh 0
    WriteRegStr HKCU "SOFTWARE\Classes\$0\DefaultIcon" "" "$INSTDIR\md-file.ico"
  refresh:
  ; 通知系统文件关联变更，刷新图标缓存
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; 卸载时清理自定义 DefaultIcon
  ReadRegStr $0 HKLM "SOFTWARE\Classes\.md" ""
  StrCmp $0 "" done 0
    DeleteRegKey HKLM "SOFTWARE\Classes\$0\DefaultIcon"
  done:
!macroend
