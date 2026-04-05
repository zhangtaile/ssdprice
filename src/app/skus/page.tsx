'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Breadcrumb, App, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PartitionOutlined } from '@ant-design/icons';
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
}

export default function SKUPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: skuData, error } = await supabase
      .from('skus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取数据失败: ' + error.message);
    } else {
      setData(skuData || []);
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
      title: '成品 MPN',
      dataIndex: 'mpn',
      key: 'mpn',
    },
    {
      title: '容量 (User/Raw)',
      key: 'capacity',
      render: (_: any, record: SKU) => (
        <Space>
          <Tag color="blue">{record.user_capacity}</Tag>
          <span className="text-gray-400">/</span>
          <Tag color="default">{record.raw_capacity}</Tag>
        </Space>
      ),
    },
    {
      title: 'Form Factor',
      dataIndex: 'form_factor',
      key: 'form_factor',
    },
    {
      title: 'PCBA MPN',
      dataIndex: 'pcba_mpn',
      key: 'pcba_mpn',
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
          { title: '首页' },
          { title: '产品 SKU 管理' },
        ]}
      />

      <Card 
        title="产品 SKU 列表" 
        variant="borderless"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            新增 SKU
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