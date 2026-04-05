# 《SSD 成本核算系统架构设计与数据库 Schema 草案 (v3.0)》

本方案针对企业级 SSD 业务特性进行了深度定制，将各类型原材料独立建表，以支持更精准的字段管理和成本拆解，同时包含了损耗计算及间接费用分摊。

## 1. 系统架构 (Vercel + Supabase)
*   **计算引擎 (BFF):** 成本核算逻辑封装在 Next.js Server Actions 中，由后端统一执行公式，前端仅负责参数输入和结果展示，确保核算一致性。
*   **数据库:** PostgreSQL (Supabase) 存储 SKU、各类原材料及其历史价格。

---

## 2. 数据库设计 (Schema)

为满足不同类型物料特有的属性要求，将原材料拆分为 6 个独立的表。

### 2.1 原材料：DRAM 表 (`materials_dram`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `category_cap` | varchar | **类别容量** |
| `bit_width` | varchar | **位宽** |
| `price` | decimal | **价格** |

### 2.2 原材料：NAND 表 (`materials_nand`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `capacity` | numeric | **容量** |
| `bit_width` | varchar | **封装位宽** |
| `price` | decimal | **单颗价格** |
| `gb_price` | decimal | **GB 单价** (生成的虚拟字段: `price / (capacity / 8)`) |

### 2.3 原材料：主控 表 (`materials_controller`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `price` | decimal | **价格** |

### 2.4 原材料：PCBA 表 (`materials_pcba`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `price` | decimal | **价格** |

### 2.5 原材料：外壳 表 (`materials_housing`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `price` | decimal | **价格** |

### 2.6 原材料：MVA 表 (`materials_mva`)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `inventory_code`| varchar | **存货编码** |
| `pn` | varchar | **PN (Part Number)** |
| `supplier` | varchar | **供应商** |
| `price` | decimal | **价格** |

### 2.7 产品 SKU 表 (`skus`)
定义 SSD 产品的硬件画像。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `code_name` | varchar | **Code Name** (代号) |
| `form_factor` | varchar | **Form Factor** (U.2, M.2, etc.) |
| `user_capacity` | varchar | **User Capacity** (用户容量) |
| `raw_capacity` | varchar | **Raw Capacity** (裸容量) |
| `mpn` | varchar | **MPN** (成品料号) |
| `pcba_mpn` | varchar | **PCBA-MPN** (PCBA 料号) |

### 2.8 BOM 组成明细 (`bom_items`)
定义 SKU 包含哪些原材料及配比。使用 `material_type` 区分关联表。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `sku_id` | uuid | 关联 skus.id |
| `material_type` | enum | **物料所属分类** (DRAM, NAND, Controller, PCBA, Housing, MVA) |
| `material_id` | uuid | 关联对应原材料表的主键 id |
| `quantity` | decimal | 数量 (Usage) |
| `selection_loss` | decimal | **筛选损耗率** (适用于所有物料类型, 初始值可设为 0) |

---

## 3. 成本核算逻辑 (Core Logic)

系统在计算单个 SKU 总成本时，严格遵循以下公式：

### 3.1 关键项计算
1.  **分项成本** = `物料价格 * 数量 * (1 + 筛选损耗)`
    *   *注：筛选损耗可应用于 NAND, DRAM, 主控, PCBA, 外壳, MVA 等所有物料。*
2.  **直材成本合计** = `Σ(分项成本)`

### 3.2 间接费用与汇总
4.  **间接费用 (Others)** = `(NAND 成本 + DRAM 成本 + 主控成本 + PCBA 成本 + 外壳成本 + MVA 成本) * 1.2%`
    *   *说明：初始系数为 0.012*
5.  **SKU 总成本** = `NAND 成本 + DRAM 成本 + 主控成本 + PCBA 成本 + 外壳成本 + MVA 成本 + Others`

### 2.9 成本快照元数据表 (`cost_snapshots`)
用于存储历史记录的“标签”，如 "26CQ1-1月4号"。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `label` | varchar | **快照标签** (如: 26CQ1-1月4号) |
| `snapshot_date`| timestamp | **快照生成日期** |
| `created_by` | uuid | 执行快照的人员 ID |
| `description` | text | 备注说明 |

### 2.10 SKU 成本快照详情表 (`sku_cost_snapshots`)
存储快照时刻每个 SKU 的详细成本拆解。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键 |
| `snapshot_id` | uuid | 关联 cost_snapshots.id |
| `sku_id` | uuid | 关联 skus.id |
| `nand_cost` | decimal | 当时计算的 NAND 成本 |
| `dram_cost` | decimal | 当时计算的 DRAM 成本 |
| `ctrl_cost` | decimal | 当时计算的主控成本 |
| `pcba_cost` | decimal | 当时计算的 PCBA 成本 |
| `housing_cost`| decimal | 当时计算的外壳成本 |
| `mva_cost` | decimal | 当时计算的 MVA 成本 |
| `others_cost` | decimal | 当时计算的间接费用 |
| `total_cost` | decimal | **当时计算的总成本** |
| `params_snapshot`| jsonb | 记录当时的系数 (损耗率 7.5%, Others 1.2% 等) |

---

## 3. 成本核算逻辑 (Core Logic)
... (中间内容不变) ...

---

## 4. 业务场景实现建议

### 4.1 历史成本追溯 (Historical Auditing)
*   **版本对比：** 用户可以选择两个不同的快照（例如 "26CQ1-1月4号" vs "25CQ4-12月30号"），系统自动对比每个 SKU 的成本变动额度和原因（是 NAND 涨了还是 DRAM 损耗变了）。
*   **冻结机制：** 一旦快照生成，该记录应设为只读，作为财务结算或季度汇报的依据。

### 4.2 自动化与手动归档
*   **手动归档：** 供应链主管在录入一波大宗调价后，手动点击“保存当前快照”并输入自定义标签。
*   **自动归档：** 系统可设定在每周末或每月初自动抓取一次当前全线 SKU 成本并归档。
