// OpenHarmony 前端入口页面（实验性适配骨架）
// 包装 ArkWeb 组件作为 Tauri 前端渲染引擎

import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();
  private localUrl: Resource = $rawfile('index.html');

  build() {
    Column() {
      // ArkWeb 作为 Tauri 前端渲染引擎
      Web({ src: this.localUrl, controller: this.controller })
        .width('100%')
        .height('100%')
        .darkMode(WebDarkMode.On)
        .domStorageAccess(true)
        .databaseAccess(true)
        .javaScriptAccess(true)
        .zoomAccess(false)
        .onPageBegin(() => {
          console.info('RxLens', 'Web page begin loading');
          this.injectTauriShim();
        })
        .onErrorReceive((event) => {
          console.error('RxLens', `Web error: ${event.error.getErrorInfo()}`);
        });
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#121212');
  }

  /**
   * 注入 Tauri JS Shim
   * 在前端环境中模拟 __TAURI__ 全局对象
   */
  private injectTauriShim(): void {
    const shim = `
      window.__TAURI__ = {
        invoke: function(cmd, args) {
          return new Promise((resolve, reject) => {
            try {
              const result = __TAURI_HOS__.invoke(cmd, JSON.stringify(args || {}));
              resolve(JSON.parse(result));
            } catch (e) {
              reject(e);
            }
          });
        },
        event: {
          listen: function(event, handler) {
            if (!window.__TAURI_LISTENERS__) window.__TAURI_LISTENERS__ = {};
            if (!window.__TAURI_LISTENERS__[event]) window.__TAURI_LISTENERS__[event] = [];
            window.__TAURI_LISTENERS__[event].push(handler);
            return Promise.resolve(() => {
              const idx = window.__TAURI_LISTENERS__[event].indexOf(handler);
              if (idx > -1) window.__TAURI_LISTENERS__[event].splice(idx, 1);
            });
          }
        }
      };
    `;
    this.controller.runJavaScript(shim);
  }
}
