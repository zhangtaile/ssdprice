# 企业级 SSD 成本核算系统 - 数据库架构说明文档 (v1.0)

本系统使用 **Supabase (PostgreSQL)** 作为后端数据库。架构设计旨在支持高频率的物料调价、多 SKU 并行核算以及历史成本的精确追溯。

---

## 1. 核心枚举类型 (Types)

### `material_category`
用于标识 BOM 组件的所属分类。
- **值**: `DRAM`, `NAND`, `Controller`, `PCBA`, `Housing`, `MVA`

---

## 2. 物料库 (Material Tables)

所有物料表均包含以下共有字段：
- `id`: UUID (PK, 自动生成)
- `inventory_code`: 内部库存编码 (P/N 之外的唯一标识)
- `pn`: 生产料号 (Product Number)
- `supplier`: 供应商名称
- `price`: 实时单价 (DECIMAL 15,4)
- `created_at / updated_at`: 时间戳

### 特殊字段说明:
- **`materials_nand`**: 
    - `capacity`: 容量 (Gb)
    - `gb_price`: **虚拟列** (Generated Column)，自动计算 `$ / GB` 单价。计算逻辑：`price / (capacity / 8.0)`。
- **`materials_dram`**:
    - `category_cap`: 规格容量 (例如 8Gb)
    - `bit_width`: 位宽 (例如 x16)

---

## 3. 产品与 BOM 架构 (SKU & BOM)

### `skus` (产品定义)
存储 SSD 成品的基础属性。
- `code_name`: 研发代码 (如 26CQ1)
- `mpn`: 最终成品料号
- `user_capacity`: 用户可用容量 (如 1.92TB)
- `raw_capacity`: 物理原厂容量 (如 2048GB)
- `form_factor`: 形态 (M.2, U.2 等)
- `indirect_cost_rate`: **其它费率** (Default 0.012)，支持按 SKU 设置不同的核算比例。

### `bom_items` (BOM 明细)
**多态关联表**，通过 `material_type` 路由至不同的物料表。
- `sku_id`: 关联的 SKU ID (FK, On Delete Cascade)
- `material_type`: 对应物料分类枚举
- `material_id`: 对应物料表中的 UUID (注意：由于是跨表关联，此处无硬性 FK)
- `quantity`: 用量 (Qty)
- `selection_loss`: 筛选损耗 (适用于所有组件，如 DRAM、NAND 等，默认为 0)

---

## 4. 成本核算与历史追溯 (Snapshot System)

### `cost_snapshots` (快照元数据)
记录一次核算操作的概览。
- `label`: 快照名称 (如 "2026 Q1 报价核算")
- `snapshot_date`: 核算日期
- `description`: 备注

### `sku_cost_snapshots` (固化详情)
核心表，用于“冻结”核算时的所有参数。
- `snapshot_id`: 关联快照元数据
- `sku_id`: 关联产品
- `nand_cost / dram_cost ...`: 存储核算时的各分类子项总额。
- `others_cost`: 最终核算得出“其它费用”的总额。
- `applied_indirect_rate`: **核算时应用的费率** (如 0.012)，确保核算逻辑可回溯。
- `total_cost`: 最终总成本。
- **`params_snapshot` (JSONB)**: 
    - **极重要**: 以 JSON 数组形式存储当时 BOM 中所有物料的 `P/N`、`当时单价`、`损耗系数`和`子项成本`。
    - **价值**: 确保即使物料库在 1 年后调价或删除，通过快照仍能完整还原当时的核算依据。

---

## 5. 安全与约束

- **RLS**: 已在所有表中禁用 (RLS Disabled)，简化开发阶段的读写。
- **外键约束**: 所有 `sku_id` 和 `snapshot_id` 均配置了 `ON DELETE CASCADE`，删除 SKU 或快照将自动清理关联数据，保持数据库整洁。
