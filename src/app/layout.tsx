import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AntdRegistry from "@/lib/AntdRegistry";
import { Layout, Menu, ConfigProvider } from 'antd';
import Link from 'next/link';
import { 
  DatabaseOutlined, 
  ProductOutlined, 
  HistoryOutlined, 
  SettingOutlined,
  ContainerOutlined
} from '@ant-design/icons';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SSD Cost Analysis System",
  description: "Enterprise SSD BOM & Cost Management",
};

const { Header, Content, Sider } = Layout;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuItems = [
    {
      key: 'materials',
      icon: <DatabaseOutlined />,
      label: '原材料管理',
      children: [
        { key: 'nand', label: <Link href="/materials/nand">NAND Flash</Link> },
        { key: 'dram', label: <Link href="/materials/dram">DRAM</Link> },
        { key: 'others', label: <Link href="/materials/others">其他辅料</Link> },
      ]
    },
    {
      key: 'skus',
      icon: <ProductOutlined />,
      label: <Link href="/skus">产品 SKU 管理</Link>,
    },
    {
      key: 'snapshots',
      icon: <HistoryOutlined />,
      label: <Link href="/snapshots">成本快照/历史</Link>,
    },
  ];

  return (
    <html lang="zh">
      <body className={inter.className}>
        <AntdRegistry>
          <ConfigProvider theme={{ token: { primaryColor: '#1677ff' } }}>
            <Layout style={{ minHeight: '100vh' }}>
              <Sider collapsible width={240}>
                <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  SSD COST SYSTEM
                </div>
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['nand']} items={menuItems} />
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
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
