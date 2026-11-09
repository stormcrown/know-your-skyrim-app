# Know your Skyrim

在游戏外面翻你 Skyrim SE 的全部数据：物品、人物、任务、地点、法术、配方、书籍……按当前加载顺序解析一遍，存成本地索引，用窗口或浏览器查。

An out-of-game browser for your Skyrim SE load order: every item, actor, quest, place, spell, recipe and book, parsed once into a local index and served in a window or a browser tab.

灵感来自 SKSE 模组 [know-your-skyrim](https://github.com/laymovi/know-your-skyrim)——同一个念头，读同一份数据，只是换到桌面上跑。
Inspired by the SKSE mod [know-your-skyrim](https://github.com/laymovi/know-your-skyrim) — same idea, same data, running outside the game.

[中文](#中文) · [English](#english)

---

## 中文

### 这是什么

把 Skyrim SE 的插件（ESM/ESP/ESL）读一遍，还原游戏里的全部记录：名字、数值、附魔、效果、任务阶段与日记、地点与摆放、书籍正文。数据只在本机，不联网、不上传。

### 功能

- **全量数据**：武器、护甲、消耗品、材料、法术、龙吼、天赋、人物、派系、任务、地点、容器、等级表、关键词、配方
- **按加载顺序解析**：支持 MO2 实例/配置、ESL 轻量插件、多插件覆盖；重复插件、缺失前置会标出来
- **任务**：阶段、目标、日记合成一张表（目标按索引对到同号阶段）；任务链（NAM0 + 别名引用）画成树；三态进度（未接受/进行中/已完成）；触发条件解析成句子
- **书籍**：按游戏标记排版（`<font>`、`<b>`、`<br>`、`[pagebreak]`），书里引用的插图从 BSA 里解出来直接显示；`<Alias=Player>` 会换成存档里的角色名
- **存档**：只读解析 `.ess`，读角色名、等级、位置和任务进度
- **系统页**：游戏/SKSE/CK 版本、SKSE 插件清单、兼容性检查（缺失前置、重复文件、插件上限…），可导出检测报告
- **多语言界面**：简体中文、繁體中文、English、日本語、한국어、Русский、Deutsch、Français；默认跟随系统
- **主题**：跟随系统 / 浅色 / 深色 / GitHub / VS Code / WebStorm

### 怎么用

1. 下载发行版压缩包，解压到任意目录（比如 `D:\Develop\KnowYourSkyrim`）
2. 双击 `start.cmd` 或 `KnowYourSkyrim.exe` 打开窗口
3. 设置页里选 Mod Organizer 实例、配置（Profile）和字符串语言，点「重建索引」
4. 之后按分类随便查；换加载顺序或存档后再重建一次

索引默认和程序放一起（`resources\app\data\index.sqlite`），首次全量解析，1100 个插件大约 2–3 分钟。

### 开发

| 项目 | 版本 / 说明 |
| --- | --- |
| 运行环境 | Windows 10 / 11 x64 |
| Electron | 43.3.0 |
| Node.js | 24.17.0（开发与打包） |
| 运行时依赖 | 无（只用 Node 内置模块 + Electron） |
| 数据库 | `node:sqlite`（Node 内置），单文件索引 |
| 界面 | 原生 HTML/CSS/JS，无框架 |
| 打包 | `build.cmd` → `tools/package-app.mjs` + `tools/zip-app.ps1` |

目录：

```
src/core/       解析与索引（TES4 记录、BSA、存档、索引、查询）
src/server.js   本地 HTTP 服务与 JSON 接口
src/web/        窗口里的页面（无构建步骤）
electron/       Electron 主进程（内置服务 + 窗口）
tools/          打包、BSA 解包、字体/多语言辅助脚本
```

开发运行：`npm install` 之后 `npm run app`；只跑服务：`node src/cli.js serve`；重建索引：`node src/cli.js index`。

打包：双击 `build.cmd`，程序输出到 `D:\Develop\KnowYourSkyrim`，压缩包在 `dist\`。

WebStorm 调试配置在 `.run/` 下（Electron 开发模式、主进程断点、页面 JS Debug、后端 serve）。

### 说明与边界

- 只读：不修改任何插件或存档
- 数据全在本机；除了读你自己的游戏文件，程序不联网
- 「哪个阶段加哪个目标」写在编译后的脚本里，程序只能按索引对齐，个别任务可能对不上
- 物品「是否见过」只存在于 SKSE 的 co-save，这里判断不了

### 许可

MIT

---

## English

### What it is

It reads your Skyrim SE plugins (ESM/ESP/ESL) and rebuilds every record the game holds: names, stats, enchantments, effects, quest stages and journals, locations and placements, book text. Everything stays on your machine — no network, no upload.

### Features

- **Full data**: weapons, armor, consumables, ingredients, spells, shouts, perks, actors, factions, quests, places, containers, leveled lists, keywords, recipes
- **Load-order aware**: Mod Organizer instances/profiles, ESL light plugins, record overrides; duplicate plugins and missing masters are reported
- **Quests**: stages, objectives and journal in one table (objectives matched to the stage with the same index); quest chain (NAM0 + alias references) drawn as a tree; three-state progress (not started / in progress / completed); conditions rendered as readable sentences
- **Books**: laid out from the game's own markup (`<font>`, `<b>`, `<br>`, `[pagebreak]`), illustrations extracted from the BSA and shown inline; `<Alias=Player>` becomes the character name from your save
- **Saves**: read-only parse of `.ess` — character name, level, location, quest progress
- **System page**: game / SKSE / CK versions, SKSE plugin list, compatibility checks (missing masters, duplicate files, plugin limits…), exportable report
- **UI languages**: 简体中文, 繁體中文, English, 日本語, 한국어, Русский, Deutsch, Français — follows the system language by default
- **Themes**: follow system / light / dark / GitHub / VS Code / WebStorm

### Usage

1. Download the release archive and unpack it anywhere (`D:\Develop\KnowYourSkyrim` works)
2. Run `start.cmd` (or `KnowYourSkyrim.exe`)
3. In Settings pick your Mod Organizer instance, profile and string language, then hit **Rebuild index**
4. Browse by family; rebuild after changing your load order or save

The index lives next to the app (`resources\app\data\index.sqlite`). A full build of ~1100 plugins takes 2–3 minutes.

### Development

| Item | Version / notes |
| --- | --- |
| Platform | Windows 10 / 11 x64 |
| Electron | 43.3.0 |
| Node.js | 24.17.0 (development and packaging) |
| Runtime dependencies | none — only Node built-ins plus Electron |
| Database | `node:sqlite` (built into Node), single-file index |
| UI | plain HTML/CSS/JS, no framework |
| Packaging | `build.cmd` → `tools/package-app.mjs` + `tools/zip-app.ps1` |

Layout:

```
src/core/       parsing and indexing (TES4 records, BSA, saves, query)
src/server.js   local HTTP server and JSON API
src/web/        the page shown in the window (no build step)
electron/       Electron main process (in-process server + window)
tools/          packaging, BSA unpacking, font/i18n helpers
```

Dev run: `npm install`, then `npm run app`; server only: `node src/cli.js serve`; rebuild index: `node src/cli.js index`.

Packaging: run `build.cmd`; the app goes to `D:\Develop\KnowYourSkyrim` and the zip to `dist\`.

WebStorm run configurations live in `.run/` (Electron dev mode, main-process breakpoints, page JS debug, backend serve).

### Limits

- Read-only: never writes to plugins or saves
- Everything is local; the app makes no network calls beyond reading your own game files
- Which stage adds which objective lives in compiled scripts, so a few quests may not line up
- Whether you have "seen" an item only exists in SKSE's co-save, so it cannot be determined here

### License

MIT
