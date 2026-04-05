-- 1. 成本快照元数据表 (用于记录标签，如 "26CQ1-1月4号")
CREATE TABLE IF NOT EXISTS cost_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL,           -- 快照标签 (如: 26CQ1-1月4号)
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,                       -- 关联 auth.users.id (可选)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SKU 成本快照详情表 (存储快照瞬间的详细成本拆解)
CREATE TABLE IF NOT EXISTS sku_cost_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES cost_snapshots(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    
    -- 拆解金额 (Snapshot Moment)
    nand_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    dram_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    ctrl_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    pcba_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    housing_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    mva_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    others_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    
    -- 当时的计算参数快照 (JSON 格式存储，如损耗率、Others 系数)
    params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为索引加速历史查询和对比
CREATE INDEX IF NOT EXISTS idx_sku_cost_snapshots_snapshot_id ON sku_cost_snapshots(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_sku_cost_snapshots_sku_id ON sku_cost_snapshots(sku_id);
