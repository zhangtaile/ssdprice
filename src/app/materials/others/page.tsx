'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, message, Card, Breadcrumb, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

interface OtherMaterial {
  id: string;
  inventory_code: string;
  pn: string;
  supplier: string;
  price: number;
  created_at: string;
}

type MaterialType = 'controller' | 'pcba' | 'housing' | 'mva';

const typeConfig: Record<MaterialType, { label: string, table: string }> = {
  controller: { label: '主控', table: 'materials_controller' },
  pcba: { label: 'PCBA', table: 'materials_pcba' },
  housing: { label: '外壳', table: 'materials_housing' },
  mva: { label: 'MVA', table: 'materials_mva' },
};

export default function OthersPage() {
  const [activeTab, setActiveTab] = useState<MaterialType>('controller');
  const [data, setData] = useState<OtherMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async (type: MaterialType) => {
    setLoading(true);
    const { data: materialData, error } = await supabase
      .from(typeConfig[type].table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error(`获取${typeConfig[type].label}数据失败: ` + error.message);
    } else {
      setData(materialData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const showModal = (record?: OtherMaterial) => {
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

      const table = typeConfig[activeTab].table;

      if (editingId) {
        const { error } = await supabase
          .from(table)
          .update(values)
          .eq('id', editingId);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from(table)
          .insert([values]);
        if (error) throw error;
        message.success('添加成功');
      }

      setIsModalVisible(false);
      fetchData(activeTab);
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: `确认删除该${typeConfig[activeTab].label}?`,
      content: '删除后无法恢复',
      onOk: async () => {
        const { error } = await supabase
          .from(typeConfig[activeTab].table)
          .delete()
          .eq('id', id);
        if (error) {
          message.error('删除失败');
        } else {
          message.success('删除成功');
          fetchData(activeTab);
        }
      },
    });
  };

  const columns = [
    { title: '存货编码', dataIndex: 'inventory_code', key: 'inventory_code' },
    { title: 'P/N', dataIndex: 'pn', key: 'pn' },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '单价 ($)', dataIndex: 'price', key: 'price', render: (val: number) => `$${val.toFixed(4)}` },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: OtherMaterial) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)}>编辑</Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const tabItems = Object.entries(typeConfig).map(([key, config]) => ({
    key,
    label: config.label,
  }));

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>原材料管理</Breadcrumb.Item>
        <Breadcrumb.Item>其他辅料</Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as MaterialType)}
          items={tabItems}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              新增 {typeConfig[activeTab].label}
            </Button>
          }
        />
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? `编辑 ${typeConfig[activeTab].label}` : `新增 ${typeConfig[activeTab].label}`}
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
          <Form.Item name="price" label="单价 ($)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={0.0001} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
