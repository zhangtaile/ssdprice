'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Breadcrumb, App, Tag, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PartitionOutlined, CalculatorOutlined, DownloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface SKU {
  id: string;
  code_name: string;
  form_factor: string;
  user_capacity: string;
  raw_capacity: string;
  mpn: string;
  pcba_mpn: string;
  created_at: string;
  indirect_cost_rate?: number;
  // 扩展字段用于显示成本
  calculated_cost?: number;
}

export default function SKUPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  // 内存缓存：记录物料价格的请求状态（Promise），完美拦截瞬间发起的并发重复请求
  const materialPriceCache = React.useRef(new Map<string, Promise<number>>());

  const calculateSKUCost = async (sku: SKU, bomItems: any[]) => {
    try {
      const rate = sku.indirect_cost_rate ?? 0.012;

      if (!bomItems || bomItems.length === 0) return 0;

      // 并发请求所有物料并使用 Promise 缓存机制
      const materialCosts = await Promise.all(bomItems.map(async (item) => {
        const cacheKey = `${item.material_type}_${item.material_id}`;
        let pricePromise = materialPriceCache.current.get(cacheKey);

        if (!pricePromise) {
          const tableName = `materials_${item.material_type.toLowerCase()}`;
          // 显式断言为 Promise<number> 以满足 TypeScript 类型要求
          pricePromise = supabase.from(tableName).select('price').eq('id', item.material_id).single()
            .then(({ data }) => (data?.price || 0) as number) as Promise<number>;
          materialPriceCache.current.set(cacheKey, pricePromise);
        }

        const price = await pricePromise;
        return price * item.quantity * (1 + (item.selection_loss || 0));
      }));

      const totalMaterialCost = materialCosts.reduce((sum, cost) => sum + cost, 0);

      // 使用动态费率计算 (1 + rate)
      return totalMaterialCost * (1 + rate);
    } catch (err) {
      return 0;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    materialPriceCache.current.clear(); // 刷新数据时清空缓存，获取最新报价

    // 一次性并联查出所有 SKU 及其下面的 BOM 明细，从根本上消灭 N 次单独的 BOM 查询
    const { data: skuData, error } = await supabase
      .from('skus')
      .select('*, bom_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取数据失败: ' + error.message);
    } else if (skuData) {
      // 增强逻辑：为每个 SKU 计算实时成本
      const enrichedData = await Promise.all(skuData.map(async (sku: any) => {
        const cost = await calculateSKUCost(sku, sku.bom_items);
        // 从返回状态中剔除大数组 bom_items，保持 React state 轻量化
        const { bom_items, ...restSku } = sku;
        return { ...restSku, calculated_cost: cost };
      }));
      setData(enrichedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showModal = (record?: SKU) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingId) {
        const { error } = await supabase
          .from('skus')
          .update(values)
          .eq('id', editingId);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('skus')
          .insert([values]);
        if (error) throw error;
        message.success('创建 SKU 成功');
      }

      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    modal.confirm({
      title: '确认删除 SKU?',
      content: '删除 SKU 将同步删除其关联的所有 BOM 信息，且无法恢复。',
      okType: 'danger',
      onOk: async () => {
        const { error } = await supabase.from('skus').delete().eq('id', id);
        if (error) {
          message.error('删除失败');
        } else {
          message.success('删除成功');
          fetchData();
        }
      },
    });
  };

  const columns = [
    {
      title: '内部代号 (Code Name)',
      dataIndex: 'code_name',
      key: 'code_name',
      render: (text: string) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    {
      title: '容量 (User/Raw)',
      key: 'capacity',
      render: (_: any, record: SKU) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Tag color="blue">{record.user_capacity}</Tag>
            <span className="text-gray-300">/</span>
            <Tag color="default">{record.raw_capacity}</Tag>
          </div>
          <small className="text-gray-400">{record.mpn}</small>
        </div>
      ),
    },
    {
      title: 'Form Factor',
      dataIndex: 'form_factor',
      key: 'form_factor',
    },
    {
      title: '实时估算成本 ($)',
      dataIndex: 'calculated_cost',
      key: 'calculated_cost',
      sorter: (a: SKU, b: SKU) => (a.calculated_cost || 0) - (b.calculated_cost || 0),
      render: (cost: number) => (
        <div className="flex flex-col">
          <span className={`font-bold text-lg ${cost > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
            ${cost ? cost.toFixed(4) : '0.0000'}
          </span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: SKU) => (
        <Space size="middle">
          <Link href={`/skus/bom/${record.id}`}>
            <Button type="primary" ghost icon={<PartitionOutlined />} size="small">
              配置 BOM
            </Button>
          </Link>
          <Button icon={<EditOutlined />} size="small" onClick={() => showModal(record)}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)}>
            删除
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
          { title: '产品 SKU 管理' },
        ]}
      />

      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">产品 SKU 列表</h2>
          <p className="text-gray-500 text-sm">管理 SSD 成品型号及其基于 BOM 的实时核算成本。</p>
        </div>
        <Space>
          <Button 
            size="large" 
            icon={<DownloadOutlined />} 
            onClick={() => {
              if (data.length === 0) {
                message.warning('没有可导出的数据');
                return;
              }
              const headers = ['内部代号 (Code Name)', '用户容量', '物理容量', '成品 MPN', 'PCBA MPN', '外形尺寸', '实时估算成本 ($)'];
              const rows = data.map(sku => [
                sku.code_name,
                sku.user_capacity,
                sku.raw_capacity,
                sku.mpn,
                sku.pcba_mpn,
                sku.form_factor,
                sku.calculated_cost ? sku.calculated_cost.toFixed(4) : '0.0000'
              ]);
              const csvContent = '\uFEFF' + [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `SSD_SKU_Cost_Export_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              message.success('导出清单成功');
            }} 
            disabled={data.length === 0}
          >
            导出 Excel 清单
          </Button>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => showModal()}>
            新增 SKU
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "编辑 SKU 基础信息" : "新增 SKU 基础信息"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="code_name"
              label="内部代号 (Code Name)"
              rules={[{ required: true, message: '请输入内部代号' }]}
            >
              <Input placeholder="例如: Venus Pro 2" />
            </Form.Item>
            <Form.Item
              name="form_factor"
              label="外形尺寸 (Form Factor)"
              rules={[{ required: true, message: '请输入外形尺寸' }]}
            >
              <Input placeholder="例如: M.2 2280" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="user_capacity"
              label="用户容量 (User Cap)"
              rules={[{ required: true, message: '请输入用户容量' }]}
            >
              <Input placeholder="例如: 960GB" />
            </Form.Item>
            <Form.Item
              name="raw_capacity"
              label="物理容量 (Raw Cap)"
              rules={[{ required: true, message: '请输入物理容量' }]}
            >
              <Input placeholder="例如: 1024GB" />
            </Form.Item>
          </div>

          <Form.Item
            name="mpn"
            label="成品 MPN"
            rules={[{ required: true, message: '请输入成品 MPN' }]}
          >
            <Input placeholder="例如: SV-810-960G-S3" />
          </Form.Item>

          <Form.Item
            name="pcba_mpn"
            label="PCBA MPN"
            rules={[{ required: true, message: '请输入 PCBA MPN' }]}
          >
            <Input placeholder="例如: P-SV-810-M2-R1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}