'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Button, App, Skeleton } from 'antd';
import { 
  DatabaseOutlined, 
  ProductOutlined, 
  HistoryOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { message } = App.useApp();
  const [stats, setStats] = useState({
    materials: 0,
    skus: 0,
    snapshots: 0
  });
  const [recentSkus, setRecentSkus] = useState<any[]>([]);
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. 并行获取各项总数
      const [
        { count: nandCount },
        { count: dramCount },
        { count: ctrlCount },
        { count: pcbaCount },
        { count: housingCount },
        { count: mvaCount },
        { count: skuCount },
        { count: snapshotCount }
      ] = await Promise.all([
        supabase.from('materials_nand').select('*', { count: 'exact', head: true }),
        supabase.from('materials_dram').select('*', { count: 'exact', head: true }),
        supabase.from('materials_controller').select('*', { count: 'exact', head: true }),
        supabase.from('materials_pcba').select('*', { count: 'exact', head: true }),
        supabase.from('materials_housing').select('*', { count: 'exact', head: true }),
        supabase.from('materials_mva').select('*', { count: 'exact', head: true }),
        supabase.from('skus').select('*', { count: 'exact', head: true }),
        supabase.from('cost_snapshots').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        materials: (nandCount || 0) + (dramCount || 0) + (ctrlCount || 0) + (pcbaCount || 0) + (housingCount || 0) + (mvaCount || 0),
        skus: skuCount || 0,
        snapshots: snapshotCount || 0
      });

      // 2. 获取最近的 5 个 SKU
      const { data: skus } = await supabase
        .from('skus')
        .select('id, code_name, mpn, user_capacity')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentSkus(skus || []);

      // 3. 获取最近的 5 个快照
      const { data: snapshots } = await supabase
        .from('cost_snapshots')
        .select('id, label, snapshot_date')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentSnapshots(snapshots || []);

    } catch (err: any) {
      message.error('统计加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-900 tracking-tight">
          企业级 SSD 成本核算系统
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          实时监控原材料价格波动，精细化核算每一款 SKU 的利润空间。
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Link href="/materials/nand">
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all cursor-pointer border-t-4 border-blue-500">
              <Statistic
                title="物料库总数"
                value={stats.materials}
                suffix="项"
                prefix={<DatabaseOutlined className="text-blue-500 mr-2" />}
              />
              <div className="mt-2 text-xs text-gray-400 font-medium flex items-center">
                查看全部分类 <ArrowRightOutlined className="ml-1" />
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={8}>
          <Link href="/skus">
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all cursor-pointer border-t-4 border-green-500">
              <Statistic
                title="活跃产品 SKU"
                value={stats.skus}
                suffix="个"
                prefix={<ProductOutlined className="text-green-500 mr-2" />}
              />
              <div className="mt-2 text-xs text-gray-400 font-medium flex items-center">
                配置 BOM 明细 <ArrowRightOutlined className="ml-1" />
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={8}>
          <Link href="/snapshots">
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all cursor-pointer border-t-4 border-orange-500">
              <Statistic
                title="已固化快照"
                value={stats.snapshots}
                suffix="份"
                prefix={<HistoryOutlined className="text-orange-500 mr-2" />}
              />
              <div className="mt-2 text-xs text-gray-400 font-medium flex items-center">
                追溯历史核算 <ArrowRightOutlined className="ml-1" />
              </div>
            </Card>
          </Link>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="mt-12">
        <Col xs={24} lg={12}>
          <Card 
            title={<span><ProductOutlined className="mr-2 text-green-500" /> 最近新增 SKU</span>} 
            variant="borderless" 
            className="shadow-sm"
            extra={<Link href="/skus"><Button type="link" size="small">全部产品</Button></Link>}
          >
            {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
              <div className="space-y-4">
                {recentSkus.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">暂无产品数据</div>
                ) : (
                  recentSkus.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded">
                      <div>
                        <div className="font-bold text-gray-800">{item.code_name}</div>
                        <div className="text-gray-400 text-xs">{item.mpn} / {item.user_capacity}</div>
                      </div>
                      <Link href={`/skus/bom/${item.id}`}>
                        <Button size="small" type="primary" ghost>配置 BOM</Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<span><HistoryOutlined className="mr-2 text-orange-500" /> 最新成本快照</span>} 
            variant="borderless" 
            className="shadow-sm"
            extra={<Link href="/snapshots"><Button type="link" size="small">核算历史</Button></Link>}
          >
            {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
              <div className="space-y-4">
                {recentSnapshots.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">暂无快照记录</div>
                ) : (
                  recentSnapshots.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border-b border-gray-50 last:border-0">
                      <ClockCircleOutlined className="text-gray-300 mt-1" />
                      <div>
                        <div className="font-semibold text-blue-600">{item.label}</div>
                        <div className="text-gray-400 text-xs">{new Date(item.snapshot_date).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <div className="mt-12 p-8 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
        <div>
          <h3 className="text-blue-800 font-bold text-xl mb-1">开始新核算?</h3>
          <p className="text-blue-600">添加一个新物料或在 SKU 列表中为现有产品更新 BOM 组件。</p>
        </div>
        <Link href="/skus">
          <Button type="primary" size="large" icon={<PlusOutlined />}>进入工作台</Button>
        </Link>
      </div>
    </div>
  );
}