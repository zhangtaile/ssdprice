'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, App, Typography } from 'antd';
import { LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { message } = App.useApp();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      // 通过 API 验证，以防密码泄露在前端 JS 中
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      });

      if (res.ok) {
        message.success('登录成功，欢迎使用 SSD 成本核算系统');
        // 后端 API 会设置 Cookie，这里直接跳转
        router.push('/');
      } else {
        message.error('访问密码错误，请重试');
      }
    } catch (err) {
      message.error('系统繁忙，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card 
        className="w-full max-w-md shadow-xl border-t-4 border-blue-600 rounded-xl"
        variant="borderless"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockOutlined style={{ fontSize: 32 }} />
          </div>
          <Title level={3} className="mb-1">系统访问受限</Title>
          <Text type="secondary">请输入企业级 SSD 成本核算系统的专用访问密码</Text>
        </div>

        <Form
          layout="vertical"
          onFinish={handleLogin}
          size="large"
        >
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入访问密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-gray-400 mr-2" />} 
              placeholder="请输入密码..."
              autoFocus
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              icon={<ArrowRightOutlined />}
              className="h-12 text-lg font-bold"
            >
              验证并进入系统
            </Button>
          </Form.Item>
        </Form>
        
        <div className="mt-8 text-center text-gray-400 text-xs italic">
          &copy; 2026 Memblaze SSD COST SYSTEM. All rights reserved.
        </div>
      </Card>
    </div>
  );
}