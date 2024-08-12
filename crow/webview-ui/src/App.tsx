import { useRoutes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import routes from '@/routes';
import useDarkTheme from '@/hooks/useDarkTheme';
import useBaseColorToken from '@/hooks/useBaseColorToken';
import mermaid from 'mermaid';
import { sendPv } from '@/utilities/common';
import { vscode } from '@/utilities/vscode';
import { useEffect, useRef } from 'react';
import { IS_CHROME } from './constant';
import './App.css';

const App = () => {
  const Router = useRoutes(routes);
  const useDark = useDarkTheme();
  const [baseColorToken] = useBaseColorToken();
  const location = useLocation();
  const loactionKey = useRef<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: useDark ? 'dark' : 'default',
    });
  }, [useDark]);

  useEffect(() => {
    if (location.pathname === '/' || loactionKey.current === location.key) {
      return;
    }

    loactionKey.current = location.key;
    sendPv({
      page: location.pathname,
    });
  }, [location]);

  useEffect(() => {
    vscode.postMessage({ type: '@WEBVIEW_INIT' });
  }, []);

  if (!baseColorToken) return null;

  return (
    <ConfigProvider
      theme={{
        cssVar: { key: 'css-var-crow' },
        hashed: false,
        algorithm: !useDark ? theme.defaultAlgorithm : theme.darkAlgorithm,
        components: {
          Typography: {
            fontSize: 13,
          },
          Steps: {
            fontSize: 12,
            descriptionMaxWidth: 100,
          },
          Tooltip: !IS_CHROME
            ? {
                fontSize: 13,
                colorTextLightSolid: baseColorToken?.colorText,
              }
            : {},
          Drawer: !IS_CHROME
            ? {
                colorBgElevated: baseColorToken?.colorBgElevated,
              }
            : {},
        },
        token: !IS_CHROME
          ? {
              colorText: baseColorToken?.colorText || 'rgba(0, 0, 0, 0.88)',
              colorPrimary: baseColorToken?.colorPrimary || '#1677ff',
              colorBgElevated: baseColorToken?.colorBgContainer || '#ffffff',
              colorBgContainer: baseColorToken?.colorBgContainer || '#ffffff',
              colorBgSpotlight: baseColorToken?.colorBgContainer || 'rgba(0, 0, 0, 0.85)',
              colorBorder: baseColorToken?.colorBorder || '#d9d9d9',
              colorSplit: baseColorToken?.colorBorder || 'rgba(5, 5, 5, 0.06)',
            }
          : {},
      }}
    >
      {Router}
    </ConfigProvider>
  );
};

export default App;
