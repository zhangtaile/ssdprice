'use client';

import React from 'react';
import { Layout, Menu, ConfigProvider, App } from 'antd';
import Link from 'next/link';
import { 
  DatabaseOutlined, 
  ProductOutlined, 
  HistoryOutlined, 
} from '@ant-design/icons';
import { usePathname } from 'next/navigation';

const { Header, Content, Sider } = Layout;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    {
      key: 'materials',
      icon: <DatabaseOutlined />,
      label: '原材料管理',
      children: [
        { key: '/materials/nand', label: <Link href="/materials/nand">NAND Flash</Link> },
        { key: '/materials/dram', label: <Link href="/materials/dram">DRAM</Link> },
        { key: '/materials/others', label: <Link href="/materials/others">其他辅料</Link> },
      ]
    },
    {
      key: '/skus',
      icon: <ProductOutlined />,
      label: <Link href="/skus">产品 SKU 管理</Link>,
    },
    {
      key: '/snapshots',
      icon: <HistoryOutlined />,
      label: <Link href="/snapshots">成本快照/历史</Link>,
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <App>
        <Layout style={{ minHeight: '100vh' }}>
          <Sider collapsible width={240}>
            <Link href="/">
              <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                SSD COST SYSTEM
              </div>
            </Link>
            <Menu 
              theme="dark" 
              mode="inline" 
              selectedKeys={[pathname]} 
              defaultOpenKeys={['materials']}
              items={menuItems} 
            />
          </Sider>
          <Layout>
            <Header style={{ background: '#fff', padding: 0, paddingLeft: 24 }}>
              <h2 style={{ margin: 0 }}>企业级 SSD 成本核算系统</h2>
            </Header>
            <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8 }}>
              {children}
            </Content>
          </Layout>
        </Layout>
      </App>
    </ConfigProvider>
  );
}
