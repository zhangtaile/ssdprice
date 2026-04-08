'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Card, Breadcrumb, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

interface NandMaterial {
  id: string;
  inventory_code: string;
  pn: string;
  supplier: string;
  capacity: number;
  bit_width: string;
  price: number;
  gb_price: number;
  created_at: string;
}

type PriceField = 'price' | 'gb_price';

const roundTo4 = (value: number) => Number(value.toFixed(4));

export default function NandPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<NandMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastEditedField, setLastEditedField] = useState<PriceField>('price');

  const fetchData = async () => {
    setLoading(true);
    const { data: nandData, error } = await supabase
      .from('materials_nand')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取数据失败: ' + error.message);
    } else {
      setData(nandData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncFromPrice = (price: number | null, capacityValue?: number | null) => {
    const capacity = Number(capacityValue ?? form.getFieldValue('capacity'));
    if (price === null || price === undefined) {
      form.setFieldsValue({ price: null });
      return;
    }

    if (!capacity || capacity <= 0) {
      form.setFieldsValue({ price });
      return;
    }

    form.setFieldsValue({
      price,
      gb_price: roundTo4(price / (capacity / 8)),
    });
  };

  const syncFromGbPrice = (gbPrice: number | null, capacityValue?: number | null) => {
    const capacity = Number(capacityValue ?? form.getFieldValue('capacity'));
    if (gbPrice === null || gbPrice === undefined) {
      form.setFieldsValue({ gb_price: null });
      return;
    }

    if (!capacity || capacity <= 0) {
      form.setFieldsValue({ gb_price: gbPrice });
      return;
    }

    form.setFieldsValue({
      gb_price: gbPrice,
      price: roundTo4(gbPrice * (capacity / 8)),
    });
  };

  const handleCapacityChange = (capacity: number | null) => {
    form.setFieldsValue({ capacity });

    if (!capacity || capacity <= 0) {
      return;
    }

    if (lastEditedField === 'gb_price') {
      syncFromGbPrice(form.getFieldValue('gb_price'), capacity);
      return;
    }

    syncFromPrice(form.getFieldValue('price'), capacity);
  };

  const showModal = (record?: NandMaterial) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
      setLastEditedField('price');
    } else {
      setEditingId(null);
      form.resetFields();
      setLastEditedField('price');
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const submitData = { ...values };
      // 数据库会自动处理 gb_price 虚拟列，我们不需要提交它
      delete submitData.gb_price;
      
      if (editingId) {
        const { error } = await supabase
          .from('materials_nand')
          .update(submitData)
          .eq('id', editingId);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('materials_nand')
          .insert([submitData]);
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
      title: '确认删除?',
      content: '删除后无法恢复',
      onOk: async () => {
        const { error } = await supabase.from('materials_nand').delete().eq('id', id);
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
    { title: '容量 (Gb)', dataIndex: 'capacity', key: 'capacity' },
    { title: '封装位宽', dataIndex: 'bit_width', key: 'bit_width' },
    { title: '单颗价格 ($)', dataIndex: 'price', key: 'price', render: (val: number) => `$${val.toFixed(4)}` },
    { title: 'GB 单价 ($/GB)', dataIndex: 'gb_price', key: 'gb_price', render: (val: number) => `$${val.toFixed(4)}` },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: NandMaterial) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)}>编辑</Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: '原材料管理' },
          { title: 'NAND Flash' },
        ]}
      />
      
      <Card title="NAND 物料库" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新增 NAND
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
        title={editingId ? "编辑 NAND 物料" : "新增 NAND 物料"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form 
          form={form} 
          layout="vertical" 
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="inventory_code" label="存货编码" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="pn" label="P/N" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="supplier" label="供应商" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="bit_width" label="封装位宽">
              <Input placeholder="例如: x8" />
            </Form.Item>
            <Form.Item name="capacity" label="容量 (Gb)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例如: 2048"
                onChange={handleCapacityChange}
              />
            </Form.Item>
            <Form.Item name="price" label="单颗价格 ($)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                step={0.0001}
                precision={4}
                min={0}
                onChange={(value) => {
                  setLastEditedField('price');
                  syncFromPrice(value);
                }}
              />
            </Form.Item>
            <Form.Item name="gb_price" label="单GB价格 ($/GB)">
              <InputNumber
                style={{ width: '100%' }}
                step={0.0001}
                precision={4}
                min={0}
                onChange={(value) => {
                  setLastEditedField('gb_price');
                  syncFromGbPrice(value);
                }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
