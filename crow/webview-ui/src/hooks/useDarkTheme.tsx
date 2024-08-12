import { useEffect, useState } from 'react';
import { IS_CHROME } from '@/constant/';

/**
 * 使用useEffect和useState实现黑暗主题切换功能
 */
export default function useDarkTheme(): boolean {
  /**
   * 初始化是否使用黑暗主题的状态
   */
  const [isUsingDarkTheme, setIsUsingDarkTheme] = useState(window?.initTheme === 'dark');

  /**
   * 监听窗口消息事件，当接收到用户主题颜色变更时更新状态
   */
  useEffect(() => {
    const handleUserThemeColorChange = (event: MessageEvent) => {
      const { data = {} } = event;
      const { type, content } = data;

      if (type === 'userThemeColor') {
        if (content === 'light') {
          setIsUsingDarkTheme(false);
          if (IS_CHROME) {
            document.body.style.backgroundColor = '#fff';
            document.body.style.color = 'rgba(0, 0, 0, 0.88)';
          }
        } else {
          setIsUsingDarkTheme(true);
          if (IS_CHROME) {
            document.body.style.backgroundColor = '#2b2a2a';
            document.body.style.color = 'rgba(212, 212, 212, 0.88)';
          }
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('message', handleUserThemeColorChange);

    // 清理函数，移除事件监听器
    return () => {
      window.removeEventListener('message', handleUserThemeColorChange);
    };
  }, []);

  return isUsingDarkTheme;
}
