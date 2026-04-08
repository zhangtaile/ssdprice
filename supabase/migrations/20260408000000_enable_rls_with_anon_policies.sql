-- Enable RLS on all public business tables while preserving current anon-based frontend access.
DO $$
DECLARE
    tbl TEXT;
    public_tables TEXT[] := ARRAY[
        'materials_dram',
        'materials_nand',
        'materials_controller',
        'materials_pcba',
        'materials_housing',
        'materials_mva',
        'materials_whitelabel',
        'skus',
        'bom_items',
        'cost_snapshots',
        'sku_cost_snapshots'
    ];
BEGIN
    FOREACH tbl IN ARRAY public_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I_select_anon ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_select_anon ON public.%I FOR SELECT TO anon USING (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I_insert_anon ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_insert_anon ON public.%I FOR INSERT TO anon WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I_update_anon ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_update_anon ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I_delete_anon ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_delete_anon ON public.%I FOR DELETE TO anon USING (true)', tbl, tbl);
    END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_bom_with_materials(UUID) TO anon;
