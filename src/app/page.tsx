import { Card, Row, Col, Statistic } from 'antd';
import { DatabaseOutlined, ProductOutlined, HistoryOutlined } from '@ant-design/icons';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        欢迎使用企业级 SSD 成本核算系统
      </h1>
      
      <p className="text-gray-600 mb-10 text-center text-lg">
        高效管理您的物料清单 (BOM)，实时推算最新 NAND/DRAM 价格波动对利润的影响。
      </p>

      <Row gutter={24}>
        <Col span={8}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="物料库"
              value={6}
              suffix="大类"
              prefix={<DatabaseOutlined className="text-blue-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Link href="/skus">
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <Statistic
                title="活跃 SKU"
                value={0}
                suffix="个"
                prefix={<ProductOutlined className="text-green-500 mr-2" />}
              />
            </Card>
          </Link>
        </Col>
        <Col span={8}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="历史快照"
              value={0}
              suffix="份"
              prefix={<HistoryOutlined className="text-orange-500 mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      <div className="mt-12 bg-blue-50 p-6 rounded-lg border border-blue-100">
        <h3 className="text-blue-800 font-semibold mb-3">快速上手指引：</h3>
        <ol className="list-decimal list-inside text-blue-700 space-y-2">
          <li>首先在左侧<strong>“原材料管理”</strong>中录入最新的 NAND、DRAM 及其他辅料单价。</li>
          <li>在<strong>“产品 SKU 管理”</strong>中定义您的 SSD 型号并配置其 BOM 结构。</li>
          <li>系统将自动根据最新单价计算每个 SKU 的总成本（含 Others 1.2% 分摊）。</li>
          <li>您可以随时点击“保存快照”来锁定并归档当前的成本数据。</li>
        </ol>
      </div>
    </div>
  );
}
