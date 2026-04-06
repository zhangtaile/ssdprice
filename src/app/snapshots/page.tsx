'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Card, Breadcrumb, App, Tag, Collapse, Descriptions } from 'antd';
import { HistoryOutlined, EyeOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Snapshot {
  id: string;
  label: string;
  description: string;
  snapshot_date: string;
  sku_snapshots: any[];
}

export default function SnapshotsPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // 获取快照及其关联的 SKU 详情
    const { data: snapshots, error } = await supabase
      .from('cost_snapshots')
      .select(`
        *,
        sku_snapshots:sku_cost_snapshots (
          *,
          sku:skus (code_name, mpn)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      message.error('获取快照失败: ' + error.message);
    } else {
      setData(snapshots || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    modal.confirm({
      title: '删除快照记录?',
      content: '此操作将永久删除该历史核算记录，无法恢复。',
      okType: 'danger',
      onOk: async () => {
        const { error } = await supabase.from('cost_snapshots').delete().eq('id', id);
        if (error) message.error('删除失败');
        else {
          message.success('已删除');
          fetchData();
        }
      }
    });
  };

  const columns = [
    {
      title: '快照标签 / 备注',
      key: 'info',
      render: (_: any, record: Snapshot) => (
        <div>
          <div className="font-bold text-blue-600">{record.label}</div>
          <div className="text-gray-400 text-xs">{record.description || '无备注'}</div>
        </div>
      ),
    },
    {
      title: '核算日期',
      dataIndex: 'snapshot_date',
      key: 'snapshot_date',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '涉及 SKU',
      key: 'skus',
      render: (_: any, record: Snapshot) => (
        <Space wrap>
          {record.sku_snapshots.map((s: any) => (
            <Tag key={s.id} color="blue">{s.sku?.code_name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Snapshot) => (
        <Space size="middle">
          <Button icon={<DeleteOutlined />} danger size="small" onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 展开行的渲染函数：展示详细的 BOM 构成
  const expandedRowRender = (snapshot: Snapshot) => {
    return (
      <div className="bg-gray-50 p-4 rounded">
        {snapshot.sku_snapshots.map((skuSnap: any) => (
          <Card key={skuSnap.id} size="small" className="mb-4" title={`SKU 核算详情: ${skuSnap.sku?.code_name} (${skuSnap.sku?.mpn})`}>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Statistic title="总成本" value={skuSnap.total_cost} prefix="$" precision={4} valueStyle={{ color: '#cf1322' }} />
              <Statistic title="NAND 成本" value={skuSnap.nand_cost} prefix="$" precision={4} />
              <Statistic title="DRAM 成本" value={skuSnap.dram_cost} prefix="$" precision={4} />
              <Statistic title="白牌 SSD 成本" value={skuSnap.whitelabel_cost || 0} prefix="$" precision={4} />
              <Statistic title="间接费用 (1.2%)" value={skuSnap.others_cost} prefix="$" precision={4} />
            </div>
            
            <Collapse 
              ghost 
              items={[
                {
                  key: '1',
                  label: '查看固化时的物料清单 (JSONB Params)',
                  children: (
                    <Table 
                      size="small"
                      pagination={false}
                      dataSource={skuSnap.params_snapshot as any[]}
                      rowKey={(record: any) => `${record.type}-${record.pn}`}
                      columns={[
                        { title: '类型', dataIndex: 'type', key: 'type' },
                        { title: 'P/N', dataIndex: 'pn', key: 'pn' },
                        { title: '历史单价', dataIndex: 'price_at_moment', key: 'price', render: (v) => `$${v.toFixed(4)}` },
                        { title: '用量', dataIndex: 'qty', key: 'qty' },
                        { title: '损耗', dataIndex: 'loss', key: 'loss', render: (v) => `${(v*100).toFixed(1)}%` },
                        { title: '子项成本', dataIndex: 'sub_cost', key: 'sub_cost', render: (v) => `$${v.toFixed(4)}` },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link href="/">首页</Link> },
          { title: '成本快照/历史' },
        ]}
      />

      <Card 
        title={<span><HistoryOutlined className="mr-2" /> 历史成本快照库</span>} 
        variant="borderless"
        className="shadow-sm"
      >
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

// 辅助组件
function Statistic({ title, value, prefix, precision, valueStyle }: any) {
  return (
    <div className="p-2 border rounded bg-white">
      <div className="text-gray-400 text-xs mb-1">{title}</div>
      <div className="font-bold" style={valueStyle}>
        {prefix}{value.toFixed(precision)}
      </div>
    </div>
  );
}