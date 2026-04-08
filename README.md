# 🚀 企业级 SSD 成本核算系统 (SSD Cost Calculation System) - v1.0

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/zhangtaile/ssdprice/releases/tag/1.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![Ant Design](https://img.shields.io/badge/Ant_Design-5.22+-blue.svg)](https://ant.design/)

本系统专为年销售规模达 **50 亿级** 的 SSD 企业量身定制。它解决了多 SKU 硬件配置下，面对 NAND/DRAM 价格剧烈波动时，成本核算效率低、历史报价难追溯、复杂损耗计算易出错等核心痛点。

---

## 🌟 核心功能 (Core Features)

### 1. 动态物料库 (Material Library)
- **六大分类**：精细化管理 NAND Flash, DRAM, Controller, PCBA, Housing, MVA。
- **智能单价**：NAND 颗粒支持自动计算 **$/GB** 虚拟列；DRAM 支持位宽与规格管理。
- **实时同步**：物料单价修改后，所有关联 SKU 的估算成本将秒级完成重算。

### 2. 精准 BOM 核算 (BOM & Costing)
- **多态 BOM 架构**：通过 `material_type` 路由，支持一套 BOM 挂载不同分类的物料。
- **行业损耗算法**：内置 DRAM 筛选损耗（默认 7.5%）、NAND 损耗等专业计算规则。
- **可配置“其它费用”**：支持按 SKU 灵活设置 **1.2% - X.X%** 的间接费用比例（Others %）。

### 3. 历史成本快照 (Snapshot System)
- **核算冻结**：通过 **JSONB** 格式将核算时的 BOM 清单、实时单价、损耗系数及结果一次性“固化”。
- **不可篡改性**：即使后续物料库删改或调价，已固化的快照仍能完整还原当时的报价依据。

### 4. 极致性能优化 (Extreme Performance)
- **JOIN 预加载**：使用 Supabase 关系查询，将 N+1 的网络请求压缩为 O(1)。
- **Promise 缓存池**：针对高并发物料查询，引入 `React.useRef` 级的 Promise 缓存，彻底杜绝重复请求。

### 5. 企业级安全与导出
- **全局拦截**：基于 Next.js 代理的 Cookie 级访问控制，通过环境变量 `ACCESS_PASSWORD` 保护敏感数据。
- **原生导出**：支持零依赖、防乱码的 **Excel (CSV)** 导出，方便财务与销售离线流转。

---

## 🛠️ 技术栈 (Tech Stack)

- **前端框架**: Next.js 16.2.2 (App Router)
- **UI 组件库**: Ant Design 5.22+ (使用最新 items 属性及 variant 设计)
- **数据库/后端**: Supabase (PostgreSQL)
- **样式**: Tailwind CSS
- **状态管理**: React Hooks + Promise Cache Layer

---

## 🚀 快速开始 (Quick Start)

### 1. Node.js 版本
建议使用 **Node.js 20**。如果你使用 `nvm`：
```bash
nvm use
```

### 2. 重新 clone 后恢复本地环境变量
本仓库不会提交任何本地敏感文件，重新 clone 后请基于 `.env.example` 创建 `.env.local`：
```bash
cp .env.example .env.local
```

然后从你的线上环境恢复真实值：
```env
NEXT_PUBLIC_SUPABASE_URL="Supabase Project URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="Supabase anon public key"
ACCESS_PASSWORD="本地访问密码"
```

恢复来源如下：
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 控制台 `Project Settings -> API -> Project URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 控制台 `Project Settings -> API -> Project API keys -> anon public`
- `ACCESS_PASSWORD`: Vercel 控制台 `Project -> Settings -> Environment Variables`

如果你的 Vercel 线上项目已经正常运行，**本地调试推荐直接复用线上 Supabase**，不需要重新初始化本地数据库。

### 3. 首次搭建数据库时的初始化说明
如果你是在新 Supabase 项目中首次部署本系统，不要只执行 `full_database_init.sql`。当前代码还依赖后续 migration 中的字段和 RPC，请按顺序执行：

1. `full_database_init.sql`
2. `supabase/migrations/20260406013000_add_selection_fee.sql`
3. `supabase/migrations/20260406020000_add_get_bom_with_materials_rpc.sql`
4. `supabase/migrations/20260406030000_add_whitelabel_ssd.sql`
5. `supabase/migrations/20260408000000_enable_rls_with_anon_policies.sql`

否则 `BOM` 页面可能因缺少 `selection_fee` 字段或 `get_bom_with_materials` RPC 而无法正常工作。

### 3.1 RLS 说明
Supabase 会对暴露给 Data API 的 `public` 表检查是否启用了 RLS。本项目当前已经改为：
- 对业务表启用 RLS
- 对 `anon` 角色补齐 `SELECT / INSERT / UPDATE / DELETE` policy

这是一种**最小改动兼容方案**：
- 优点：消除 `RLS Disabled in Public` 安全告警，同时保持现有网页录入和管理功能可用
- 限制：前端仍然直接使用 `anon key` 访问数据库，安全性只是从“未启用 RLS”提升到“已启用 RLS 但 anon 放行”

### 4. 安装与运行
```bash
npm install
npm run dev
```

默认访问地址：
```text
http://localhost:3000
```

系统会先跳转到 `/login`，输入 `.env.local` 中的 `ACCESS_PASSWORD` 后即可进入系统。

### 5. 本地调试检查清单
- 首页可以正常加载统计数据
- `SKU 管理` 页面可以打开
- `BOM` 配置页面可以正常加载物料明细
- `成本快照` 页面可以读取历史记录

---

## 📂 数据库架构参考 (Database Schema)

详细的表结构关联与字段定义请参阅：[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

## 📅 版本计划 (Roadmap)

- [x] v1.0: 核心物料、BOM 核算、快照系统、性能优化。
- [ ] v1.1: 增加物料历史价格波动曲线图。
- [ ] v1.2: 支持多币种 (USD/RMB) 实时汇率切换。
- [ ] v2.0: 引入毛利率测算与销售报价生成器。

---

## 📄 开源协议
本项目采用 [MIT License](./LICENSE) 授权。
