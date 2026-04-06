'use client';

import React, { useEffect, useState, use } from 'react';
import { Table, Button, Space, Modal, Form, InputNumber, Select, Card, Breadcrumb, App, Tag, Descriptions, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BOMItem {
  id: string;
  sku_id: string;
  material_type: string;
  material_id: string;
  quantity: number;
  selection_loss: number;
  selection_fee: number;
  // 扩展字段用于显示与计算
  material_pn?: string;
  material_name?: string;
  material_price?: number;
  material_selection_fee?: number;
  item_cost?: number;
}

interface SKU {
  id: string;
  code_name: string;
  mpn: string;
  user_capacity: string;
  indirect_cost_rate?: number;
}

export default function BOMConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: skuId } = use(params);
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [sku, setSku] = useState<SKU | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSnapshotModalVisible, setIsSnapshotModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [snapshotForm] = Form.useForm();
  
  const [materialOptions, setMaterialOptions] = useState<{ id: string, pn: string, supplier: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [indirectRate, setIndirectRate] = useState(0.012);

  const materialTypes = [
    { label: 'NAND Flash', value: 'NAND' },
    { label: 'DRAM', value: 'DRAM' },
    { label: '主控 (Controller)', value: 'Controller' },
    { label: 'PCBA', value: 'PCBA' },
    { label: '外壳 (Housing)', value: 'Housing' },
    { label: '加工费 (MVA)', value: 'MVA' },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: skuData } = await supabase.from('skus').select('*').eq('id', skuId).single();
      setSku(skuData);
      if (skuData?.indirect_cost_rate !== undefined) {
        setIndirectRate(skuData.indirect_cost_rate);
      }

      // 1. 获取所有 BOM 基础条目
      const { data: items, error: itemsError } = await supabase.from('bom_items').select('*').eq('sku_id', skuId);
      if (itemsError) throw itemsError;
      
      if (items && items.length > 0) {
        // 2. 按物料类型分组 ID
        const groups: Record<string, string[]> = {};
        items.forEach(item => {
          if (!groups[item.material_type]) groups[item.material_type] = [];
          groups[item.material_type].push(item.material_id);
        });

        // 3. 针对每种物料类型，发起一次批量查询 (最多 6 次查询)
        const materialDataMap: Record<string, any> = {};
        await Promise.all(Object.keys(groups).map(async (type) => {
          const tableName = `materials_${type.toLowerCase()}`;
          const selectFields = type === 'DRAM' ? 'id, pn, supplier, price, selection_fee' : 'id, pn, supplier, price';
          const { data: materials } = await supabase
            .from(tableName)
            .select(selectFields as any)
            .in('id', groups[type]);
          
          materials?.forEach(m => {
            materialDataMap[`${type}_${m.id}`] = m;
          });
        }));

        // 4. 组装最终数据并计算成本
        const resolvedItems = items.map(item => {
          const mat = materialDataMap[`${item.material_type}_${item.material_id}`];
          const price = mat?.price || 0;
          const sFee = item.selection_fee || 0;
          
          // 恢复全局逻辑：所有物料均应用其填写的损耗率
          // 新公式: (单价 + 筛选费) * 用量 * (1 + 损耗)
          const item_cost = (price + sFee) * item.quantity * (1 + (item.selection_loss || 0));

          return {
            ...item,
            material_pn: mat?.pn || 'Unknown',
            material_name: mat?.supplier || 'Unknown',
            material_price: price,
            material_selection_fee: mat?.selection_fee || 0,
            item_cost: item_cost
          };
        });

        setBomItems(resolvedItems);
      } else {
        setBomItems([]);
      }
    } catch (err: any) {
      message.error('加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [skuId]);

  const handleTypeChange = async (type: string, keepMaterialId = false) => {
    setOptionsLoading(true);
    if (!keepMaterialId) {
      form.setFieldsValue({
        material_id: undefined,
        selection_fee: 0
      });
    }
    const tableName = `materials_${type.toLowerCase()}`;
    const selectFields = type === 'DRAM' ? 'id, pn, supplier, selection_fee' : 'id, pn, supplier';
    const { data, error } = await supabase.from(tableName).select(selectFields as any);
    if (!error) {
      setMaterialOptions(data || []);
    }
    setOptionsLoading(false);
  };

  const handleMaterialChange = (materialId: string) => {
    const type = form.getFieldValue('material_type');
    if (type === 'DRAM') {
      const selected = materialOptions.find(m => m.id === materialId) as any;
      if (selected) {
        form.setFieldValue('selection_fee', selected.selection_fee || 0);
      }
    } else {
      form.setFieldValue('selection_fee', 0);
    }
  };

  const showAddModal = () => {
    setEditingItemId(null);
    setMaterialOptions([]);
    setIsModalVisible(true);
    // 使用 setTimeout 确保在 Modal 渲染后的下一帧执行，避免 Form 未连接的警告
    setTimeout(() => {
      form.resetFields();
    }, 0);
  };

  const showEditModal = async (record: BOMItem) => {
    setEditingItemId(record.id);
    setIsModalVisible(true);
    
    // 1. 先加载物料选项
    await handleTypeChange(record.material_type, true);
    
    // 2. 确保在选项加载完成且 Modal 已打开后设置值
    form.setFieldsValue({
      material_type: record.material_type,
      material_id: record.material_id,
      quantity: record.quantity,
      selection_loss: record.selection_loss || 0,
      selection_fee: record.selection_fee || 0
    });
  };

  const handleSaveBOM = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (editingItemId) {
        const { error } = await supabase.from('bom_items').update({
          material_type: values.material_type,
          material_id: values.material_id,
          quantity: values.quantity,
          selection_loss: values.selection_loss || 0,
          selection_fee: values.selection_fee || 0
        }).eq('id', editingItemId);
        
        if (error) throw error;
        message.success('更新物料成功');
      } else {
        const { error } = await supabase.from('bom_items').insert([{
          sku_id: skuId,
          material_type: values.material_type,
          material_id: values.material_id,
          quantity: values.quantity,
          selection_loss: values.selection_loss || 0,
          selection_fee: values.selection_fee || 0
        }]);

        if (error) throw error;
        message.success('添加物料成功');
      }

      setIsModalVisible(false);
      setEditingItemId(null);
      fetchData();
    } catch (err: any) {
      message.error('保存失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    modal.confirm({
      title: '确认移除此物料?',
      onOk: async () => {
        const { error } = await supabase.from('bom_items').delete().eq('id', id);
        if (error) message.error('移除失败');
        else {
          message.success('已移除');
          fetchData();
        }
      }
    });
  };

  const totalMaterialCost = bomItems.reduce((sum, item) => sum + (item.item_cost || 0), 0);
  const indirectCost = totalMaterialCost * indirectRate;
  const finalTotalCost = totalMaterialCost + indirectCost;

  const handleUpdateIndirectRate = async (val: number | null) => {
    if (val === null) return;
    try {
      const { error } = await supabase.from('skus').update({ indirect_cost_rate: val }).eq('id', skuId);
      if (error) throw error;
      setIndirectRate(val);
      message.success('间接费率已更新');
    } catch (err: any) {
      message.error('更新费率失败: ' + err.message);
    }
  };

  // 保存快照逻辑
  const handleSaveSnapshot = async () => {
    try {
      const values = await snapshotForm.validateFields();
      setLoading(true);

      // 1. 创建快照主记录
      const { data: snapshot, error: sError } = await supabase
        .from('cost_snapshots')
        .insert([{ 
          label: values.label, 
          description: values.description 
        }])
        .select()
        .single();

      if (sError) throw sError;

      // 2. 准备子项分类成本
      const costByCategory: Record<string, number> = {
        NAND: 0, DRAM: 0, Controller: 0, PCBA: 0, Housing: 0, MVA: 0
      };
      
      bomItems.forEach(item => {
        costByCategory[item.material_type] += (item.item_cost || 0);
      });

      // 3. 固化当前参数到 JSONB
      const paramsSnapshot = bomItems.map(item => ({
        type: item.material_type,
        pn: item.material_pn,
        supplier: item.material_name,
        price_at_moment: item.material_price,
        selection_fee: item.selection_fee,
        qty: item.quantity,
        loss: item.selection_loss,
        sub_cost: item.item_cost
      }));

      // 4. 创建 SKU 关联快照详情
      const { error: dError } = await supabase
        .from('sku_cost_snapshots')
        .insert([{
          snapshot_id: snapshot.id,
          sku_id: skuId,
          nand_cost: costByCategory['NAND'],
          dram_cost: costByCategory['DRAM'],
          ctrl_cost: costByCategory['Controller'],
          pcba_cost: costByCategory['PCBA'],
          housing_cost: costByCategory['Housing'],
          mva_cost: costByCategory['MVA'],
          others_cost: indirectCost,
          total_cost: finalTotalCost,
          applied_indirect_rate: indirectRate,
          params_snapshot: paramsSnapshot
        }]);

      if (dError) throw dError;

      message.success('快照固化成功，可在历史记录中查看');
      setIsSnapshotModalVisible(false);
      router.push('/snapshots');
    } catch (err: any) {
      message.error('固化失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '物料类型',
      dataIndex: 'material_type',
      key: 'material_type',
      render: (type: string) => <Tag color="cyan">{type}</Tag>,
    },
    {
      title: 'P/N (供应商)',
      key: 'material',
      render: (_: any, record: BOMItem) => (
        <div>
          <div className="font-medium text-blue-600">{record.material_pn}</div>
          <div className="text-gray-400 text-xs">{record.material_name}</div>
        </div>
      ),
    },
    {
      title: '实时单价 / 筛选费',
      key: 'price_fee',
      render: (_: any, record: BOMItem) => (
        <div>
          <div>${record.material_price?.toFixed(4)}</div>
          {record.selection_fee > 0 && (
            <div className="text-orange-500 text-xs">筛选费: ${record.selection_fee.toFixed(4)}</div>
          )}
        </div>
      ),
    },
    {
      title: '用量 / 损耗',
      key: 'qty_loss',
      render: (_: any, record: BOMItem) => (
        <span>{record.quantity} <small className="text-gray-400">/ {((record.selection_loss || 0) * 100).toFixed(1)}%</small></span>
      ),
    },
    {
      title: '子项成本 ($)',
      dataIndex: 'item_cost',
      key: 'item_cost',
      className: 'font-semibold',
      render: (val: number) => `$${val?.toFixed(4)}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BOMItem) => (
        <Space>
          <Button type="text" className="text-blue-500" icon={<EditOutlined />} onClick={() => showEditModal(record)}>
            编辑
          </Button>
          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            移除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link href="/">首页</Link> },
          { title: <Link href="/skus">产品 SKU 管理</Link> },
          { title: 'BOM 配置与核算' },
        ]}
      />

      <div className="mb-4">
        <Link href="/skus">
          <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
        </Link>
      </div>

      <Card variant="borderless" className="mb-6 shadow-sm">
        <Descriptions title="产品基础画像" bordered size="small">
          <Descriptions.Item label="Code Name">{sku?.code_name}</Descriptions.Item>
          <Descriptions.Item label="成品 MPN">{sku?.mpn}</Descriptions.Item>
          <Descriptions.Item label="用户容量">{sku?.user_capacity}</Descriptions.Item>
          <Descriptions.Item label="其它费率 (Others %)">
            <InputNumber 
              value={indirectRate} 
              step={0.001} 
              min={0} 
              max={1} 
              formatter={value => `${(Number(value) * 100).toFixed(1)}%`}
              parser={value => Number(value!.replace('%', '')) / 100}
              onChange={handleUpdateIndirectRate}
              style={{ width: 100 }}
              size="small"
            />
            <small className="ml-2 text-gray-400">(点击数字可修改)</small>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card 
        title="BOM 组装与实时核算" 
        variant="borderless"
        className="shadow-sm"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            添加组件
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={bomItems} 
          rowKey="id" 
          loading={loading}
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-blue-50/50">
                <Table.Summary.Cell index={0} colSpan={4} className="text-right font-bold">
                  原材料成本合计 (Sum of Materials):
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} className="font-bold text-blue-600">
                  ${totalMaterialCost.toFixed(4)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
              <Table.Summary.Row className="bg-gray-50/50">
                <Table.Summary.Cell index={0} colSpan={4} className="text-right text-gray-500">
                  其它费用 (Others {(indirectRate * 100).toFixed(1)}%):
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} className="text-gray-500">
                  ${indirectCost.toFixed(4)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
              <Table.Summary.Row className="bg-orange-50/50">
                <Table.Summary.Cell index={0} colSpan={4} className="text-right font-bold text-lg">
                  最终核算总成本 (Final Total Cost):
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} className="font-bold text-orange-600 text-lg underline decoration-double">
                  ${finalTotalCost.toFixed(4)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        
        <div className="mt-8 flex justify-between items-center p-4 border-t border-dashed">
          <span className="text-gray-400 text-sm italic">
            * 成本基于物料库当前单价实时刷新。
          </span>
          <Space>
            <Button size="large">导出清单</Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<SaveOutlined />}
              onClick={() => setIsSnapshotModalVisible(true)}
              disabled={bomItems.length === 0}
            >
              固化当前核算快照
            </Button>
          </Space>
        </div>
      </Card>

      {/* 添加物料组件 Modal */}
      <Modal
        title={editingItemId ? "编辑 BOM 组件" : "添加 BOM 组件"}
        open={isModalVisible}
        onOk={handleSaveBOM}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingItemId(null);
        }}
        confirmLoading={loading}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ quantity: 1, selection_loss: 0, selection_fee: 0 }}>
          <Form.Item name="material_type" label="组件类型" rules={[{ required: true }]}>
            <Select 
              placeholder="选择类型" 
              options={materialTypes} 
              onChange={(val) => handleTypeChange(val)} 
            />
          </Form.Item>
          <Form.Item name="material_id" label="选择具体物料 (P/N)" rules={[{ required: true }]}>
            <Select 
              placeholder="请先选择类型" 
              loading={optionsLoading} 
              showSearch 
              optionFilterProp="label"
              onChange={handleMaterialChange}
              options={materialOptions.map(m => ({ label: `${m.pn} (${m.supplier})`, value: m.id }))} 
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="quantity" label="用量 (Qty)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0.0001} />
            </Form.Item>
            <Form.Item name="selection_loss" label="筛选损耗 (小数)">
              <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} placeholder="例如 0.075" />
            </Form.Item>
          </div>
          <Form.Item 
            noStyle 
            shouldUpdate={(prev, curr) => prev.material_type !== curr.material_type}
          >
            {({ getFieldValue }) => 
              getFieldValue('material_type') === 'DRAM' ? (
                <Form.Item name="selection_fee" label="筛选费用 (单价加成 $)">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.0001} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <p className="text-gray-400 text-xs mt-[-10px]">注：DRAM 通常需要设置 7.5% (0.075) 的筛选损耗。</p>
        </Form>
      </Modal>

      {/* 固化快照 Modal */}
      <Modal
        title={<span><HistoryOutlined className="mr-2 text-orange-500" /> 固化成本核算快照</span>}
        open={isSnapshotModalVisible}
        onOk={handleSaveSnapshot}
        onCancel={() => setIsSnapshotModalVisible(false)}
        confirmLoading={loading}
        okText="确认固化"
        cancelText="取消"
      >
        <div className="mb-4 p-3 bg-orange-50 text-orange-700 text-xs rounded border border-orange-100">
          提示：固化快照将锁定当前物料清单、实时单价和核算结果。即使后续物料单价发生变化，快照数据也将保持不变。
        </div>
        <Form form={snapshotForm} layout="vertical" initialValues={{ label: `${sku?.code_name} - ${new Date().toLocaleDateString()} 成本核算` }}>
          <Form.Item 
            name="label" 
            label="快照标签 (Label)" 
            rules={[{ required: true, message: '请输入标签以便后续查找' }]}
          >
            <Input placeholder="例如：26CQ1-2月5号报价核算" />
          </Form.Item>
          <Form.Item name="description" label="备注说明">
            <Input.TextArea placeholder="可选：填写本次核算的背景，如：基于 1.5$ 的 NAND 目标价试算" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}