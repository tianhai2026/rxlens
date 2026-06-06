// OpenHarmony EntryAbility（实验性适配骨架）
// 需要 DevEco Studio 4.0+ 和 HarmonyOS API 12+

import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { webview } from '@kit.ArkWeb';
import { window } from '@kit.ArkUI';

// NAPI 模块引用（由 ohrs / cargo-mobile2 生成）
// import { RxlensCore } from 'librxlens';

const TAG = 'RxLensAbility';

export default class EntryAbility extends UIAbility {
  private webviewController: webview.WebviewController = new webview.WebviewController();

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    console.info(TAG, 'Ability onCreate');
  }

  onDestroy(): void {
    console.info(TAG, 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    console.info(TAG, 'WindowStage create');

    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        console.error(TAG, 'Failed to load content');
        return;
      }
      console.info(TAG, 'Succeeded in loading content');
    });
  }

  onWindowStageDestroy(): void {
    console.info(TAG, 'WindowStage destroy');
  }

  onForeground(): void {
    console.info(TAG, 'Ability onForeground');
  }

  onBackground(): void {
    console.info(TAG, 'Ability onBackground');
  }

  /**
   * 注册 JSBridge 中间层
   * 模拟 Tauri 的 invoke() 行为
   */
  private registerJSBridge(): void {
    const bridge = {
      invoke: (cmd: string, args: string): string => {
        console.info(TAG, `JSBridge invoke: ${cmd}`);
        // TODO: 通过 NAPI 调用 Rust 层
        // return RxlensCore.invoke(cmd, args);
        return JSON.stringify({ success: true, data: null });
      },
      emit: (event: string, payload: string): void => {
        console.info(TAG, `JSBridge emit: ${event}`);
        // 由 Rust 层回调触发
      }
    };

    this.webviewController.registerJavaScriptProxy(
      bridge,
      '__TAURI_HOS__',
      ['invoke', 'emit']
    );
  }
}
