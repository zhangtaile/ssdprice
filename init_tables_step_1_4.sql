-- 1. 创建物料类型枚举 (用于 BOM 关联)
DO $$ BEGIN
    CREATE TYPE material_category AS ENUM ('DRAM', 'NAND', 'Controller', 'PCBA', 'Housing', 'MVA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 创建产品 SKU 表
CREATE TABLE IF NOT EXISTS skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_name VARCHAR(255) NOT NULL,
    form_factor VARCHAR(100) NOT NULL,
    user_capacity VARCHAR(100) NOT NULL, -- 如 3.84TB
    raw_capacity VARCHAR(100) NOT NULL,  -- 如 4096GB
    mpn VARCHAR(255) NOT NULL,           -- 成品料号
    pcba_mpn VARCHAR(255) NOT NULL,      -- PCBA 料号
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建 BOM 组成明细表 (支持多态关联)
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    material_type material_category NOT NULL,
    material_id UUID NOT NULL, -- 指向对应原材料表的 id
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    selection_loss DECIMAL(15, 4) NOT NULL DEFAULT 0, -- 仅 DRAM 使用，如 0.075
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为索引加速查询
CREATE INDEX IF NOT EXISTS idx_bom_items_sku_id ON bom_items(sku_id);
