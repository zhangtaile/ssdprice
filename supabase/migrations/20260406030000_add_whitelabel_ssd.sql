-- 1. 更新枚举类型 (增加 Whitelabel)
-- 注意：PostgreSQL 中 ALTER TYPE ... ADD VALUE 不能在事务块中运行，但在 Supabase 迁移中通常是允许的
ALTER TYPE material_category ADD VALUE IF NOT EXISTS 'Whitelabel';

-- 2. 创建白牌 SSD 物料表
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

-- 3. 在快照详情表中增加白牌成本列
ALTER TABLE sku_cost_snapshots ADD COLUMN IF NOT EXISTS whitelabel_cost DECIMAL(15, 4) NOT NULL DEFAULT 0;

-- 4. 更新 RPC 函数以包含白牌物料
-- 将 rebrand_fee 映射到输出的 selection_fee，保持前端计算逻辑不变
CREATE OR REPLACE FUNCTION get_bom_with_materials(p_sku_id UUID)
RETURNS TABLE (
  id UUID,
  sku_id UUID,
  material_type TEXT,
  material_id UUID,
  quantity NUMERIC,
  selection_loss NUMERIC,
  selection_fee NUMERIC,
  material_pn TEXT,
  material_name TEXT,
  material_price NUMERIC,
  material_selection_fee NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH all_materials AS (
    SELECT id, 'DRAM'::TEXT AS type, pn, supplier, price, selection_fee FROM materials_dram
    UNION ALL
    SELECT id, 'NAND'::TEXT AS type, pn, supplier, price, 0 AS selection_fee FROM materials_nand
    UNION ALL
    SELECT id, 'Controller'::TEXT AS type, pn, supplier, price, 0 FROM materials_controller
    UNION ALL
    SELECT id, 'PCBA'::TEXT AS type, pn, supplier, price, 0 FROM materials_pcba
    UNION ALL
    SELECT id, 'Housing'::TEXT AS type, pn, supplier, price, 0 FROM materials_housing
    UNION ALL
    SELECT id, 'MVA'::TEXT AS type, pn, supplier, price, 0 FROM materials_mva
    UNION ALL
    SELECT id, 'Whitelabel'::TEXT AS type, pn, supplier, price, rebrand_fee AS selection_fee FROM materials_whitelabel
  )
  SELECT 
    b.id,
    b.sku_id,
    b.material_type::TEXT,
    b.material_id,
    b.quantity,
    b.selection_loss,
    b.selection_fee,
    m.pn AS material_pn,
    m.supplier AS material_name,
    m.price AS material_price,
    m.selection_fee AS material_selection_fee
  FROM bom_items b
  LEFT JOIN all_materials m ON b.material_type::TEXT = m.type AND b.material_id = m.id
  WHERE b.sku_id = p_sku_id;
$$;

-- 5. 确保该表对所有 API 请求开放 (禁用 RLS)
ALTER TABLE materials_whitelabel DISABLE ROW LEVEL SECURITY;
