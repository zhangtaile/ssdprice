'use client';

import React, { useEffect, useState, use } from 'react';
import { Table, Button, Space, Modal, Form, InputNumber, Select, Card, Breadcrumb, App, Tag, Descriptions } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface BOMItem {
  id: string;
  sku_id: string;
  material_type: string;
  material_id: string;
  quantity: number;
  selection_loss: number;
  // 扩展字段用于显示
  material_pn?: string;
  material_name?: string;
}

interface SKU {
  id: string;
  code_name: string;
  mpn: string;
  user_capacity: string;
}

export default function BOMConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: skuId } = use(params);
  const { message, modal } = App.useApp();
  const [sku, setSku] = useState<SKU | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // 用于下拉框的候选物料
  const [materialOptions, setMaterialOptions] = useState<{ id: string, pn: string, supplier: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

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
      // 1. 获取 SKU 信息
      const { data: skuData } = await supabase.from('skus').select('*').eq('id', skuId).single();
      setSku(skuData);

      // 2. 获取 BOM Items
      const { data: items } = await supabase.from('bom_items').select('*').eq('sku_id', skuId);
      
      if (items) {
        // 3. 这里的物料信息需要根据类型跨表查询，为了简单起见，我们并行获取这些信息
        const resolvedItems = await Promise.all(items.map(async (item) => {
          const tableName = `materials_${item.material_type.toLowerCase()}`;
          const { data: mat } = await supabase.from(tableName).select('pn, supplier').eq('id', item.material_id).single();
          return {
            ...item,
            material_pn: mat?.pn || 'Unknown',
            material_name: mat?.supplier || 'Unknown'
          };
        }));
        setBomItems(resolvedItems);
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

  // 当选择物料类型变化时，加载对应的物料列表
  const handleTypeChange = async (type: string) => {
    setOptionsLoading(true);
    form.setFieldValue('material_id', undefined);
    const tableName = `materials_${type.toLowerCase()}`;
    const { data, error } = await supabase.from(tableName).select('id, pn, supplier');
    if (!error) {
      setMaterialOptions(data || []);
    }
    setOptionsLoading(false);
  };

  const showModal = () => {
    form.resetFields();
    setMaterialOptions([]);
    setIsModalVisible(true);
  };

  const handleAddBOM = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const { error } = await supabase.from('bom_items').insert([{
        sku_id: skuId,
        material_type: values.material_type,
        material_id: values.material_id,
        quantity: values.quantity,
        selection_loss: values.selection_loss || 0
      }]);

      if (error) throw error;
      
      message.success('添加物料成功');
      setIsModalVisible(false);
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
        <span>{record.material_pn} <small className="text-gray-400">({record.material_name})</small></span>
      ),
    },
    {
      title: '用量 (Qty)',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '筛选损耗 (%)',
      dataIndex: 'selection_loss',
      key: 'selection_loss',
      render: (val: number) => val > 0 ? `${(val * 100).toFixed(2)}%` : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BOMItem) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
          移除
        </Button>
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
          { title: '配置 BOM' },
        ]}
      />

      <div className="mb-4">
        <Link href="/skus">
          <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
        </Link>
      </div>

      <Card variant="borderless" className="mb-6 shadow-sm">
        <Descriptions title="当前产品画像" bordered size="small">
          <Descriptions.Item label="Code Name">{sku?.code_name}</Descriptions.Item>
          <Descriptions.Item label="成品 MPN">{sku?.mpn}</Descriptions.Item>
          <Descriptions.Item label="容量">{sku?.user_capacity}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card 
        title="BOM 清单明细" 
        variant="borderless"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
            添加物料组件
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={bomItems} 
          rowKey="id" 
          loading={loading}
          pagination={false}
        />
        
        <div className="mt-6 p-4 bg-gray-50 rounded text-right">
          <p className="text-gray-500 mb-2">提示：BOM 组装完成后，系统将根据物料库实时单价自动计算总成本。</p>
          <Button type="primary" size="large" icon={<SaveOutlined />} disabled={bomItems.length === 0}>
            保存并预览计算结果
          </Button>
        </div>
      </Card>

      <Modal
        title="添加 BOM 组件"
        open={isModalVisible}
        onOk={handleAddBOM}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ quantity: 1, selection_loss: 0 }}>
          <Form.Item 
            name="material_type" 
            label="组件类型" 
            rules={[{ required: true }]}
          >
            <Select 
              placeholder="选择类型" 
              options={materialTypes} 
              onChange={handleTypeChange}
            />
          </Form.Item>

          <Form.Item 
            name="material_id" 
            label="选择具体物料 (P/N)" 
            rules={[{ required: true }]}
          >
            <Select 
              placeholder="请先选择类型" 
              loading={optionsLoading}
              showSearch
              optionFilterProp="label"
              options={materialOptions.map(m => ({ label: `${m.pn} (${m.supplier})`, value: m.id }))}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name="quantity" 
              label="用量 (Qty)" 
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.0001} />
            </Form.Item>

            <Form.Item 
              name="selection_loss" 
              label="筛选损耗 (小数, 如 0.075)"
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={0} 
                max={1} 
                step={0.001} 
                placeholder="例如 0.075"
              />
            </Form.Item>
          </div>
          <p className="text-gray-400 text-xs mt-[-10px]">注：DRAM 通常需要设置 7.5% (0.075) 的筛选损耗。</p>
        </Form>
      </Modal>
    </div>
  );
}