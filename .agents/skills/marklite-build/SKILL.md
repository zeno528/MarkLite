---
name: marklite-build
description: 编译 MarkLite 的 Windows 发行版（便携版 / MSI / NSIS 安装包）并验证产物。当用户说"编译发行版"、"打包 MarkLite"、"出个便携版"、"打个安装包"、"build release"、"编译 release"、"出 release"时使用。
---

# MarkLite 发行版编译

封装 Tauri 2 在 Windows 的构建流程，产出可分发的便携版/安装包并验证。所有命令在项目根目录 `d:\Desktop\GitHub project\MarkLite` 执行。

## 前置检查

构建前先确认工具链（已验证可用的版本基线）：

```bash
cargo --version    # 期望 1.96+（edition 2021）
node --version     # 期望 20+/24
pnpm --version     # 期望 9+/11
```

Rust 依赖首次会下载，之后 `target/` 缓存。代理未开时 cargo 走 registry 一般也能直连；`pnpm` 若因 esbuild 等被忽略构建脚本报 deps-status 错，见下方「排错」。

## 构建命令（三种变体）

### 1. 便携版（最快，推荐先出这个试用）

```bash
pnpm tauri build --no-bundle
```

- `--no-bundle` 跳过 MSI/NSIS 打包，只编译单体 exe，前端已嵌入。
- 产物：`src-tauri/target/release/MarkLite.exe`（约 5-6 MB）。
- 单文件免安装，Win11 自带 WebView2 直接双击运行。
- LTO 链接慢，**用后台跑**（`run_in_background` 或 `&`），约 2-3 分钟。日志重定向到文件后 `tail` 轮询。

### 2. 完整安装包（MSI + NSIS）

```bash
pnpm tauri build
```

- `tauri.conf.json` 里 `bundle.targets: "all"` + `webviewInstallMode: embedBootstrapper`，会内嵌 WebView2 引导器（+1.8MB）。
- 产物：
  - MSI：`src-tauri/target/release/bundle/msi/MarkLite_0.1.0_x64_en-US.msi`
  - NSIS：`src-tauri/target/release/bundle/nsis/MarkLite_0.1.0_x64-setup.exe`

### 3. 只要某一种安装包

```bash
pnpm tauri build --bundles nsis   # 只要 NSIS
pnpm tauri build --bundles msi    # 只要 MSI
```

## 产物验证

构建完成后逐项检查：

```bash
# 1. 存在 + 大小（目标 <10MB）
ls -la src-tauri/target/release/MarkLite.exe

# 2. 架构（PE Machine 字段：0x8664=x64，0x014c=x86）
powershell.exe -NoProfile -Command "\$b=[IO.File]::ReadAllBytes('src-tauri/target/release/MarkLite.exe'); \$m=[BitConverter]::ToInt16(\$b,[BitConverter]::ToInt32(\$b,0x3c)+4); '{0:X4}' -f \$m"
# 输出 8664 = x64 ✓
```

便携版可顺手复制到桌面方便取用：`cp src-tauri/target/release/MarkLite.exe "D:\Desktop\MarkLite-portable.exe"`（先问用户是否要复制）。

## 已知坑（构建/分发时牢记）

1. **WebView2 运行时依赖**：便携版单体 exe 依赖系统 WebView2。Win11/Win10 自带；老系统要装 WebView2 Runtime。安装包（embedBootstrapper）会自动引导安装。
2. **Chromium 149 IME bug（运行时，非构建问题）**：用户 WebView2 ≥ 149.0.7827.103 时，中文拼音首次输入可能要按两次空格。上游 Chromium bug，应用层无可靠绕过，等上游修。详见项目 `AGENTS.md`「已知问题」。构建不受影响。
3. **配置不随 exe 走**：Tauri Store + localStorage 默认存 `%APPDATA%\com.zwf.marklite\`，不是 exe 旁边。便携版「单体免安装」成立，但不是「U 盘式配置随行」。要做纯便携需加自定义配置目录逻辑（当前未做）。
4. **dev vs release 内存差很大**：dev 模式（`tauri dev`）总占用虚高至 ~600MB（Vite dev server + 未压缩 React/CodeMirror + HMR + debug 构建）。release 才是真实水位（主进程 ~31MB、整机两百多 MB）。**评估内存必须用 release，别被 dev 数字吓到。**
5. **release 构建别中断**：LTO 阶段 CPU 满载几分钟属正常，不要以为是卡死。

## 排错

**`pnpm tauri build` 报 `ERR_PNPM_IGNORED_BUILDS`（esbuild 构建脚本被忽略）**
- 若是项目本体：通常是首次 `pnpm install` 后未批准 esbuild。运行 `pnpm approve-builds` 选 esbuild；或 pnpm 10+ 在 `pnpm-workspace.yaml` 加 `onlyBuiltDependencies: [esbuild]` 后重装。
- 临时绕过：直接调 vite/tauri 二进制，如 `node node_modules/vite/bin/vite.js`，避开 pnpm 的 deps-status 预检（构建本体不需要）。

**构建卡住 / 超过 10 分钟**
- 检查是否 LTO 链接阶段（日志最后会卡在单个 crate 久编）→ 正常，继续等。
- 真卡死看日志：`tail -f /tmp/marklite-build.log`。

**产物 exe 双击无反应**
- 确认 WebView2 已装（Win11 自带）。命令行运行 exe 看是否有报错输出。
- 检查 CSP：`tauri.conf.json` 的 `security.csp`，改前端资源来源时要同步改 CSP。

**便携版体积异常变大**
- 确认 release profile（`Cargo.toml` 应有 `opt-level="s"` + `lto=true` + `strip=true`）。
- 检查是否误引入重依赖（`cargo bloat --release --crates` 可定位体积来源，需先 `cargo install cargo-bloat`）。

## 示例

**用户说："出个便携版我试试"**
1. 后台运行 `pnpm tauri build --no-bundle`，日志写 `/tmp/marklite-build.log`。
2. 轮询 `tail`，看到 `Finished release profile` 即完成。
3. 验证 `src-tauri/target/release/MarkLite.exe` 存在、PE 架构 `8664`、大小 <10MB。
4. 报告路径/大小/架构；询问是否复制到桌面。

**用户说："打个完整安装包分发"**
1. `pnpm tauri build`（后台，会更慢，要跑 MSI/NSIS 打包）。
2. 完成后定位 `src-tauri/target/release/bundle/{msi,nsis}/` 下的安装包。
3. 报告安装包路径与大小；提醒 WebView2 引导器已内嵌、配置存 AppData。

## 参考

- 项目配置：`src-tauri/tauri.conf.json`（productName/bundle/security）、`src-tauri/Cargo.toml`（release profile）、`package.json`（build script）。
- 架构与已知问题：项目根 `AGENTS.md`。
- 官方文档（遇到版本兼容/参数疑问时查）：用 context7 查 `tauri-apps/tauri`。
