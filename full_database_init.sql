-- ==========================================
-- SSD 成本核算系统 - 全量数据库初始化脚本 (v3.0)
-- 包含：原材料、SKU、BOM、快照系统
-- 安全设置：已禁用所有表的 RLS (仅建议本地/开发环境使用)
-- ==========================================

-- 1. 创建枚举类型
DO $$ BEGIN
    CREATE TYPE material_category AS ENUM ('DRAM', 'NAND', 'Controller', 'PCBA', 'Housing', 'MVA', 'Whitelabel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 原材料表定义
-- DRAM
CREATE TABLE IF NOT EXISTS materials_dram (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    category_cap VARCHAR(100),
    bit_width VARCHAR(100),
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NAND
CREATE TABLE IF NOT EXISTS materials_nand (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    capacity NUMERIC NOT NULL,
    bit_width VARCHAR(100),
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NAND GB 单价虚拟列
ALTER TABLE materials_nand 
ADD COLUMN IF NOT EXISTS gb_price DECIMAL(15, 4) 
GENERATED ALWAYS AS (CASE WHEN capacity > 0 THEN price / (capacity / 8.0) ELSE 0 END) STORED;

-- Controller
CREATE TABLE IF NOT EXISTS materials_controller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PCBA
CREATE TABLE IF NOT EXISTS materials_pcba (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Housing
CREATE TABLE IF NOT EXISTS materials_housing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MVA
CREATE TABLE IF NOT EXISTS materials_mva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Whitelabel SSD (OEM)
CREATE TABLE IF NOT EXISTS materials_whitelabel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    rebrand_fee DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 产品 SKU 与 BOM 定义
-- SKUs
CREATE TABLE IF NOT EXISTS skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_name VARCHAR(255) NOT NULL,
    form_factor VARCHAR(100) NOT NULL,
    user_capacity VARCHAR(100) NOT NULL,
    raw_capacity VARCHAR(100) NOT NULL,
    mpn VARCHAR(255) NOT NULL,
    pcba_mpn VARCHAR(255) NOT NULL,
    indirect_cost_rate DECIMAL(15, 4) DEFAULT 0.012,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOM Items
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    material_type material_category NOT NULL,
    material_id UUID NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    selection_loss DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bom_items_sku_id ON bom_items(sku_id);

-- 4. 快照系统定义
-- Snapshots Meta
CREATE TABLE IF NOT EXISTS cost_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snapshot Details
CREATE TABLE IF NOT EXISTS sku_cost_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES cost_snapshots(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    nand_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    dram_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    ctrl_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    pcba_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    housing_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    mva_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    whitelabel_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    others_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    applied_indirect_rate DECIMAL(15, 4) DEFAULT 0.012,
    total_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sku_cost_snapshots_snapshot_id ON sku_cost_snapshots(snapshot_id);

-- 5. 禁用所有表的 RLS (Row Level Security)
ALTER TABLE materials_dram DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_nand DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_controller DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_pcba DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_housing DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_mva DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials_whitelabel DISABLE ROW LEVEL SECURITY;
ALTER TABLE skus DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE sku_cost_snapshots DISABLE ROW LEVEL SECURITY;
