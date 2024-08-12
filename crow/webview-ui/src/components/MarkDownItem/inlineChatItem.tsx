import React, { memo, useState, useRef } from 'react';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as codeStyleDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight as codeStyleLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Typography, Button, Tooltip, Space } from 'antd';
import { CopyOutlined, CodeOutlined, DiffOutlined } from '@ant-design/icons';
import { ChatMode } from '@/types';
import { vscode } from '@/utilities/vscode';
import { logCode } from '@/utilities/common';
import useDarkTheme from '@/hooks/useDarkTheme';
import highlight from 'highlight.js';
import remarkGfm from 'remark-gfm';
import './index.css';

export interface MarkDownItemProp {
  content: string;
  needShrink?: boolean;
  type: ChatMode.DevMind | ChatMode.Free;
}

const defaultHStyle = {
  fontWeight: 600,
  margin: '16px 0',
  lineHeight: '20px',
};

const MarkDownItem = memo((props: any) => {
  const { content, needShrink = false, type = ChatMode.Free } = props || {};
  const [isShrink, setIsShrink] = useState(false);
  const [firstShrinkStatus, setFirstShrinkStatus] = useState(false);
  const firstRender = useRef(true);
  const useDark = useDarkTheme();

  // 操作
  const operate = (operateType: string, text: string) => {
    if (operateType === 'clipboard') {
      vscode.postMessage({
        type: operateType,
        content: { method: 'writeText', text },
      });
    }
    if (operateType === 'insertText') {
      vscode.postMessage({
        type: 'textEditor',
        content: { method: 'replaceSelectedText', text },
      });
    }
    if (operateType === 'insertTextBeforePreview') {
      vscode.postMessage({
        type: 'textEditor',
        content: { method: 'insertTextBeforePreview', text },
      });
    }

    // 快捷操作上报
    logCode({
      page: type,
      operator: operateType,
      eventType: 'CLK',
      extData: {
        text,
      },
    });
  };

  return (
    <div className="md-wrapper">
      <div className="md-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          children={content}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const { position, data }: any = node || {};
              const { start, end } = position;
              const { meta = '' } = data || {};

              if (!children) {
                return null;
              }

              if (end.line - start.line > 7) {
                if (firstRender.current) {
                  setIsShrink(true);
                  setFirstShrinkStatus(true);
                  firstRender.current = false;
                }
              }

              // 判断语言类型
              const result = highlight.highlightAuto(String(children));
              const language = `language-${result.language}`;

              // 内联代码
              const isInline = !String(children).includes('\n');
              // 匹配语言
              const match = /language-(\w+)/.exec(className || language || '');
              return match && !isInline ? (
                <div className="code-wrapper">
                  <SyntaxHighlighter
                    className={`code-block ${needShrink && 'code-block-need-shrink'} ${
                      needShrink && isShrink && 'code-block-shrink'
                    }`}
                    PreTag="div"
                    children={String(children).replace(/\n$/, '')}
                    language={match[1] || result.language}
                    style={useDark ? codeStyleDark : codeStyleLight}
                  />
                  <div className="css-var-crow md-header">
                    <Space size={4}>
                      <Tooltip placement="top" title={'复制'}>
                        <Button
                          type="text"
                          size="small"
                          // shape="circle"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            operate('clipboard', String(children));
                          }}
                        />
                      </Tooltip>
                      <Tooltip placement="top" title={'插入'}>
                        <Button
                          type="text"
                          size="small"
                          // shape="circle"
                          icon={<CodeOutlined />}
                          onClick={() => {
                            operate('insertText', String(children));
                          }}
                        />
                      </Tooltip>
                      <Tooltip placement="top" title={'插入并比对'}>
                        <Button
                          type="text"
                          size="small"
                          // shape="circle"
                          icon={<DiffOutlined />}
                          onClick={() => {
                            operate('insertTextBeforePreview', String(children));
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                  {!!needShrink && firstShrinkStatus && (
                    <div className="shrink-btn" onClick={() => setIsShrink(!isShrink)}>
                      {isShrink ? <CaretDownOutlined /> : <CaretUpOutlined />}
                    </div>
                  )}
                </div>
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },
            p(props) {
              const { children, className } = props || {};
              return (
                <Typography.Paragraph style={{ whiteSpace: 'normal' }} className={className}>
                  {children}
                </Typography.Paragraph>
              );
            },
            table({ children }) {
              return <table className="css-var-crow md-table">{children}</table>;
            },
            a({ children, href }) {
              return (
                <Typography.Link href={href} style={{ whiteSpace: 'normal' }}>
                  {children}
                </Typography.Link>
              );
            },
            h1({ children }) {
              return <h1 style={{ fontSize: 20, ...defaultHStyle }}>{children}</h1>;
            },
            h2({ children }) {
              return <h2 style={{ fontSize: 16, ...defaultHStyle }}>{children}</h2>;
            },
            h3({ children }) {
              return <h3 style={{ fontSize: 14, ...defaultHStyle }}>{children}</h3>;
            },
            h4({ children }) {
              return <h4 style={{ fontSize: 13, ...defaultHStyle }}>{children}</h4>;
            },
            h5({ children }) {
              return <h5 style={{ fontSize: 11, ...defaultHStyle }}>{children}</h5>;
            },
          }}
        />
      </div>
    </div>
  );
});

export default MarkDownItem;
