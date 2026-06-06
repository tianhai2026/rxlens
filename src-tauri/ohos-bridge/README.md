# RxLens OpenHarmony 适配层（实验性）

> 状态：实验性 / 等待 Tauri 官方 OpenHarmony 支持成熟

## 架构概述

```
┌─────────────────────────────────────────────────────┐
│                    ArkTS 层 (HarmonyOS)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ EntryAbility │  │  ArkWeb      │  │ JSBridge │  │
│  │   (入口)     │  │  (WebView)   │  │ (中间层) │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
│         │                 │               │         │
│         └─────────────────┴───────────────┘         │
│                         │                           │
│                    NAPI FFI                         │
│                         │                           │
├─────────────────────────┼───────────────────────────┤
│                    Rust 层 (Tauri Core)             │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Command     │  │  Event       │                │
│  │  Handler     │  │  Emitter     │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

## 通信机制

### 1. ArkTS → Rust（invoke）

通过 `web.WebviewController.runJavaScript()` 注入全局 `__TAURI__` 对象，拦截前端调用并转发到 Rust 层：

```typescript
// ArkTS 侧注册 JSBridge
this.webviewController.registerJavaScriptProxy(
  {
    invoke: (cmd: string, args: string) => {
      return this.napiInvoke(cmd, JSON.parse(args));
    }
  },
  '__TAURI_OS__',
  ['invoke']
);
```

### 2. Rust → ArkTS（emit）

通过 NAPI 回调将事件推送到 ArkTS，再由 ArkTS 调用 WebView 的 `runJavaScript()` 触发前端事件监听：

```typescript
// ArkTS 侧监听 Rust 事件
this.napi.onEvent((event: string, payload: string) => {
  this.webviewController.runJavaScript(
    `window.__TAURI_EVENT_BUS__.emit('${event}', ${payload})`
  );
});
```

## 已知限制

1. Tauri v2 官方尚未提供 OpenHarmony 目标平台支持
2. `cargo-mobile2` 的 OpenHarmony 后端仍在开发中
3. `ohrs` 工具链对 Tauri 的集成需要社区进一步验证
4. 建议等待 Tauri 官方宣布 OpenHarmony 支持后再投入生产

## 参考资源

- [OpenHarmony ArkWeb 文档](https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/web/web-get-started.md)
- [Tauri v2 Mobile 指南](https://v2.tauri.app/start/migrate/)
- [cargo-mobile2](https://github.com/tauri-apps/cargo-mobile2)
