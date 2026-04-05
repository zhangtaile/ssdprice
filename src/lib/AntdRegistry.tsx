'use client';

import React, { useState } from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';

const AntdRegistry = ({ children }: { children: React.ReactNode }) => {
  const [cache] = useState(() => createCache());

  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: `{ const style = ${JSON.stringify(extractStyle(cache))}; document.head.insertAdjacentHTML('beforeend', style); }`,
      }}
    />
  ));

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
};

export default AntdRegistry;
