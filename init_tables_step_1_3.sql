-- 1. 创建原材料：DRAM 表
CREATE TABLE IF NOT EXISTS materials_dram (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    category_cap VARCHAR(100), -- 类别容量
    bit_width VARCHAR(100),    -- 位宽
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建原材料：NAND 表
CREATE TABLE IF NOT EXISTS materials_nand (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    capacity NUMERIC NOT NULL, -- 容量 (Gb)
    bit_width VARCHAR(100),    -- 封装位宽
    price DECIMAL(15, 4) NOT NULL DEFAULT 0, -- 单颗价格
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 NAND 添加自动计算 GB 单价的虚拟列 (生成的列)
-- GB 单价 = 单颗价格 / (容量 / 8)
ALTER TABLE materials_nand 
ADD COLUMN IF NOT EXISTS gb_price DECIMAL(15, 4) 
GENERATED ALWAYS AS (CASE WHEN capacity > 0 THEN price / (capacity / 8.0) ELSE 0 END) STORED;

-- 3. 创建原材料：主控 表
CREATE TABLE IF NOT EXISTS materials_controller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建原材料：PCBA 表
CREATE TABLE IF NOT EXISTS materials_pcba (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建原材料：外壳 表
CREATE TABLE IF NOT EXISTS materials_housing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建原材料：MVA 表
CREATE TABLE IF NOT EXISTS materials_mva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(255) NOT NULL,
    pn VARCHAR(255) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
