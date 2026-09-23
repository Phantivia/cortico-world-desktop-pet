# 第三方声明

这个包不带识别程序、模型和 Electron。下面是它在运行时会去取的东西,以及各自的许可。

## 识别程序

FunASR 的 `llama-funasr-sensevoice`,钉在发布 `v1.4.16`,由「语音输入」面板从
[modelscope/FunASR releases](https://github.com/modelscope/FunASR/releases/tag/v1.4.16) 取到
`<运行时根>/sensevoice/v1.4.16/`。FunASR 仓库许可为 MIT；运行包包含的组件依各自许可。

## 模型

放在 `<模型根>/desktop-pet/`,按固定 revision 从 Hugging Face 下载。

| 文件 | 来源 | 许可 |
|---|---|---|
| `sensevoice-small-q8.gguf` | [FunAudioLLM/SenseVoiceSmall-GGUF](https://huggingface.co/FunAudioLLM/SenseVoiceSmall-GGUF) @ `90c1c61` | Apache-2.0 |

## 桌宠窗口

Electron 44.4.4,从 [electron/electron releases](https://github.com/electron/electron/releases/tag/v44.4.4)
取到 `<运行时根>/electron/44.4.4/`,或使用内嵌应用自带的那份。MIT;其中 Chromium 与依赖各随其许可。

## 其他运行时依赖

- `ws`:MIT
- `opencc-js`(繁简转换):MIT AND Apache-2.0

## 本包的许可

MIT,见 [`LICENSE`](LICENSE)。
