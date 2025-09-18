# TestEZ Companion CLI (TypeScript)

TypeScript 版本的 TestEZ Companion CLI，用于从命令行运行 Roblox 测试。

## 功能特性

- 从命令行轻松运行测试
- 支持多个游戏场景
- 美观的结果输出
- 显示来自 Studio 的日志和输出
- TypeScript 实现，类型安全

## 安装

### 开发环境

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行开发版本
pnpm dev
```

### 生产环境

```bash
# 构建并运行
pnpm build
pnpm start
```

## 使用方法

1. 确保 `testez-companion.toml` 配置文件存在
2. 在 Roblox Studio 中打开你的项目
3. 运行 CLI：

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start

# 只显示失败的测试
pnpm dev -- --only-print-failures
```

## 配置文件

创建 `testez-companion.toml` 文件：

```toml
roots = [
    "game/ReplicatedStorage",
    "game/ServerStorage",
    "game/ServerScriptService"
]

[test_extra_options]
# 可选的额外测试选项
```

## API 端点

- `GET /poll` - 轮询配置
- `POST /logs` - 接收日志
- `POST /results` - 接收测试结果

## 开发脚本

- `pnpm build` - 构建 TypeScript 代码
- `pnpm dev` - 运行开发版本
- `pnpm start` - 运行生产版本
- `pnpm watch` - 监视文件变化并自动重新构建
- `pnpm typecheck` - 运行类型检查

## 项目结构

```
src/
├── index.ts        # 主程序入口
├── config.ts       # 配置管理
├── state.ts        # 状态管理
├── testez.ts       # TestEZ 类型定义
├── api/            # API 处理器
│   ├── index.ts
│   ├── poll.ts
│   ├── logs.ts
│   └── results.ts
└── types/          # TypeScript 类型定义
    └── index.ts
```

## 许可证

MIT