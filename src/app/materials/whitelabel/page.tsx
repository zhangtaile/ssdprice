'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Card, Breadcrumb, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface WhitelabelMaterial {
  id: string;
  inventory_code: string;
  pn: string;
  supplier: string;
  price: number;
  rebrand_fee: number;
  created_at: string;
}

export default function WhitelabelPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<WhitelabelMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: materialData, error } = await supabase
      .from('materials_whitelabel')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取数据失败: ' + error.message);
    } else {
      setData(materialData || []);
    }
    setLoading(false);
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showModal = (record?: WhitelabelMaterial) => {
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
          .from('materials_whitelabel')
          .update(values)
          .eq('id', editingId);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('materials_whitelabel')
          .insert([values]);
        if (error) throw error;
        message.success('添加成功');
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
      title: '确认删除该白牌 SSD 物料?',
      content: '删除后无法恢复，且可能影响关联的 BOM 核算',
      okType: 'danger',
      onOk: async () => {
        const { error } = await supabase
          .from('materials_whitelabel')
          .delete()
          .eq('id', id);
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
    { title: '存货编码', dataIndex: 'inventory_code', key: 'inventory_code' },
    { title: 'P/N (成品料号)', dataIndex: 'pn', key: 'pn', render: (text: string) => <span className="font-medium text-blue-600">{text}</span> },
    { title: '原厂供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '基础单价 ($)', dataIndex: 'price', key: 'price', render: (val: number) => `$${val.toFixed(4)}` },
    { 
      title: '换标费 ($)', 
      dataIndex: 'rebrand_fee', 
      key: 'rebrand_fee', 
      render: (val: number) => <span className="text-orange-600 font-medium">+${(val || 0).toFixed(4)}</span> 
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: WhitelabelMaterial) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} size="small" onClick={() => showModal(record)}>编辑</Button>
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
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
          { title: '原材料管理' },
          { title: '白牌 SSD' },
        ]}
      />

      <Card 
        title="白牌 SSD 物料库" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            新增白牌 SSD
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑白牌 SSD' : '新增白牌 SSD'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="inventory_code" label="存货编码" rules={[{ required: true }]}>
            <Input placeholder="内部识别码" />
          </Form.Item>
          <Form.Item name="pn" label="P/N (成品料号)" rules={[{ required: true }]}>
            <Input placeholder="原厂 P/N" />
          </Form.Item>
          <Form.Item name="supplier" label="原厂供应商" rules={[{ required: true }]}>
            <Input placeholder="例如: Samsung, Micron" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="price" label="基础单价 ($)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.0001} min={0} />
            </Form.Item>
            <Form.Item name="rebrand_fee" label="换标费 ($)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.0001} min={0} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
