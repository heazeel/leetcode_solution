import { useEffect, useState } from 'react';

// const getCssVarRgbColor = (cssVar: string): string | undefined => {
//   const div = document.createElement('div');
//   div.style.display = 'none';
//   div.style.boxShadow = `0 0 0 1px var(${cssVar})`;
//   document.body.appendChild(div);
//   const rgb = getComputedStyle(div).boxShadow.match(/\d+, \d+, \d+/)?.[0];
//   document.body.removeChild(div);

//   return rgb;
// };

// rgba颜色转16进制
const colorToHex = (color: string, alpha?: number) => {
  // 判断是否是rgb或rgba颜色
  if (/^rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*(\d+(?:\.\d+)?))?\)/.test(color)) {
    const rgbaString =
      color.match(/\d+,\s*\d+,\s*\d+,\s*\d+(?:\.\d+)?/) || color.match(/\d+,\s*\d+,\s*\d+/);

    if (rgbaString) {
      let [r, g, b, a = 1] = rgbaString[0].split(',').map(Number);
      const hex = (r << 16) | (g << 8) | b;

      if (alpha) {
        a = alpha;
      }

      if (a === 1) {
        return '#' + (0x1000000 + hex).toString(16).slice(1).toUpperCase();
      }

      const _alpha = Math.round(a * 255);

      return (
        '#' +
        (0x1000000 + hex).toString(16).slice(1).toUpperCase() +
        _alpha.toString(16).padStart(2, '0').toUpperCase()
      );
    }
  }

  if (alpha) {
    const _alpha = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

    if (color.length === 7) {
      return color.toUpperCase() + _alpha;
    } else if (color.length === 9) {
      return color.toUpperCase().slice(0, 7) + _alpha;
    }
  }

  return color;
};

// 16进制颜色转rgba
const colorToRgba = (color: string, alpha?: number) => {
  if (!/^#([0-9A-F]{3,4}){1,2}$/i.test(color)) {
    return color;
  }

  color = color.substring(1);

  if (color.length === 3 || color.length === 4) {
    color = color
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  let _alpha = 1;
  if (color.length === 8) {
    _alpha = parseInt(color.substring(6, 8), 16) / 255;
  }

  if (alpha) {
    _alpha = alpha;
  }

  return `rgba(${r}, ${g}, ${b}, ${_alpha})`;
};

const getRootVar = (root: CSSStyleDeclaration, varName: string, alpha?: number) => {
  return colorToRgba(root.getPropertyValue(varName)?.trim(), alpha);
};

const getRootVarRgb = (root: CSSStyleDeclaration, varName: string, alpha?: number) => {
  return colorToRgba(root.getPropertyValue(varName)?.trim(), alpha);
};

export default function useBaseColorToken() {
  const [baseColorToken, setBaseColorToken] = useState<{
    colorText: string;
    colorPrimary: string;
    colorBgElevated: string;
    colorBgContainer: string;
    colorBorder: string;
  }>();

  // 生成基础的文本rgb颜色变量
  const generateBaseColor = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const colorText = getRootVar(rootStyle, '--vscode-foreground');
    const colorPrimary = getRootVar(rootStyle, '--vscode-focusBorder');
    const colorBgElevated = getRootVar(rootStyle, '--vscode-sideBar-background');
    const colorBgContainer = getRootVar(rootStyle, '--vscode-editor-background');
    const colorBorder = getRootVar(rootStyle, '--vscode-chat-requestBorder');
    const askAnswerBg = getRootVar(rootStyle, '--vscode-editor-background', 0.62);

    document.documentElement.style.setProperty('--crow-color-text', colorText);
    document.documentElement.style.setProperty('--crow-color-primary', colorPrimary);
    document.documentElement.style.setProperty('--crow-color-border', colorBorder);
    document.documentElement.style.setProperty('--crow-color-ask-bg', askAnswerBg);

    let token = {
      colorText,
      colorPrimary,
      colorBgElevated,
      colorBgContainer,
      colorBorder,
    };

    setBaseColorToken(token);
  };

  useEffect(() => {
    generateBaseColor();

    const handleMsg = (event: MessageEvent) => {
      const { data = {} } = event;
      const { type } = data;

      if (type === 'userThemeColor') {
        generateBaseColor();
      }
    };

    // 添加事件监听器
    window.addEventListener('message', handleMsg);

    // 清理函数，移除事件监听器
    return () => {
      window.removeEventListener('message', handleMsg);
    };
  }, []);

  return [baseColorToken];
}
