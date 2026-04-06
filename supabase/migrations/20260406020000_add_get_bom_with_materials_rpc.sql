-- 创建 RPC 函数：修正了枚举类型 (Enum) 与文本 (Text) 的匹配问题
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
