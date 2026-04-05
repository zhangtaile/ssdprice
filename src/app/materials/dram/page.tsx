'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, message, Card, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

interface DramMaterial {
  id: string;
  inventory_code: string;
  pn: string;
  supplier: string;
  category_cap: string;
  bit_width: string;
  price: number;
  created_at: string;
}

export default function DramPage() {
  const [data, setData] = useState<DramMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: dramData, error } = await supabase
      .from('materials_dram')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取数据失败: ' + error.message);
    } else {
      setData(dramData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showModal = (record?: DramMaterial) => {
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
          .from('materials_dram')
          .update(values)
          .eq('id', editingId);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('materials_dram')
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
    Modal.confirm({
      title: '确认删除?',
      content: '删除后无法恢复',
      onOk: async () => {
        const { error } = await supabase.from('materials_dram').delete().eq('id', id);
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
    { title: 'P/N', dataIndex: 'pn', key: 'pn' },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '类别容量', dataIndex: 'category_cap', key: 'category_cap' },
    { title: '位宽', dataIndex: 'bit_width', key: 'bit_width' },
    { title: '单价 ($)', dataIndex: 'price', key: 'price', render: (val: number) => `$${val.toFixed(4)}` },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DramMaterial) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)}>编辑</Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>原材料管理</Breadcrumb.Item>
        <Breadcrumb.Item>DRAM</Breadcrumb.Item>
      </Breadcrumb>
      
      <Card title="DRAM 物料库" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新增 DRAM
        </Button>
      }>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "编辑 DRAM 物料" : "新增 DRAM 物料"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="inventory_code" label="存货编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="pn" label="P/N" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="supplier" label="供应商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="category_cap" label="类别容量" className="flex-1">
              <Input placeholder="例如: 16Gb" />
            </Form.Item>
            <Form.Item name="bit_width" label="位宽" className="flex-1">
              <Input placeholder="例如: x16" />
            </Form.Item>
          </div>
          <Form.Item name="price" label="单价 ($)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={0.0001} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
