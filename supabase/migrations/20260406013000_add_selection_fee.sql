-- Add selection_fee column to materials_dram and bom_items
ALTER TABLE materials_dram ADD COLUMN IF NOT EXISTS selection_fee DECIMAL(15, 4) NOT NULL DEFAULT 0;
ALTER TABLE bom_items ADD COLUMN IF NOT EXISTS selection_fee DECIMAL(15, 4) NOT NULL DEFAULT 0;
