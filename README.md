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

### 1. 数据库初始化
在 Supabase SQL Editor 中执行项目根目录下的 `full_database_init.sql`。

### 2. 环境变量配置
创建 `.env.local` 文件并配置以下内容：
```env
NEXT_PUBLIC_SUPABASE_URL="您的 Supabase 地址"
NEXT_PUBLIC_SUPABASE_ANON_KEY="您的 Supabase Key"
ACCESS_PASSWORD="您的访问密码"
```

### 3. 安装与运行
```bash
npm install
npm run dev
```

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
