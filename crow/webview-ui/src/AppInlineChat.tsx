import { ConfigProvider, theme } from 'antd';
import useDarkTheme from '@/hooks/useDarkTheme';
import useBaseColorToken from '@/hooks/useBaseColorToken';
import { IS_CHROME } from './constant';
import InlineChat from './pages/InlineChat';
import './App.css';

const AppInlineChat = () => {
  const useDark = useDarkTheme();
  const [baseColorToken] = useBaseColorToken();

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
      <InlineChat />
    </ConfigProvider>
  );
};

export default AppInlineChat;
