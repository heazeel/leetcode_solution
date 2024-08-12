import { memo, useMemo, useState } from 'react';
import { Tooltip, Dropdown, MenuProps } from 'antd';
import Icon, { SendOutlined, LoadingOutlined, PlusSquareOutlined } from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import { vscode } from '@/utilities/vscode';
import { ChatMode, TBStartMode } from '@/types';
import './index.css';

const RealTimeOutLinedSvg = () => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024">
    <path d="M395.765 586.57H224.032c-22.421 0-37.888-22.442-29.91-43.38L364.769 95.274a32 32 0 0 1 29.899-20.608h287.957c22.72 0 38.208 23.018 29.632 44.064l-99.36 243.882h187.05c27.51 0 42.187 32.427 24.043 53.099l-458.602 522.56c-22.294 25.408-63.627 3.392-54.976-29.28l85.354-322.421zm20.95-447.903L270.453 522.58h166.87a32 32 0 0 1 30.933 40.182l-61.13 230.954L729.3 426.603H565.312c-22.72 0-38.208-23.019-29.632-44.064l99.36-243.883H416.715z" />
  </svg>
);

const RealTimeIconSvg = () => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024">
    <path d="M395.765 586.57H224.032c-22.421 0-37.888-22.442-29.91-43.38L364.769 95.274a32 32 0 0 1 29.899-20.608h287.957c22.72 0 38.208 23.018 29.632 44.064l-99.36 243.882h187.05c27.51 0 42.187 32.427 24.043 53.099l-458.602 522.56c-22.294 25.408-63.627 3.392-54.976-29.28l85.354-322.421z" />
  </svg>
);

const RealTimeOutLined = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={RealTimeOutLinedSvg} {...props} />
);

const RealTimeIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={RealTimeIconSvg} {...props} />
);

interface AreasProps {
  type: ChatMode;
  disabled: boolean | undefined;
  loading: boolean;
  needShowAdd: boolean | undefined;
  showQuick: boolean;
  openRealTimeSearch: boolean;

  handleInsert: () => void;
  handleRC: () => void;
  handleSubmit: () => void;
  handleStop: () => void;
}

const BtnAreas = memo((props: AreasProps) => {
  const { 
    type,
    disabled,
    loading,
    needShowAdd,
    showQuick,
    openRealTimeSearch,
    handleInsert,
    handleRC,
    handleSubmit,
    handleStop, 
  } = props || {};

  const [TBMode, setTBMode] = useState(() => {
    const mode = VSCodeStorage.getItem(StorageKey.TBStartMode) || TBStartMode.GPT;
    vscode.postMessage({
      type: 'dealTbstarMsg',
      content: { type: 'setMode', mode },
    });
    return mode;
  });


  const TBStarMenus = useMemo(() => {
    const menuProps: MenuProps = {
      onClick: (event: any) => {
        const { key } = event || {};
        setTBMode(key);
        VSCodeStorage.setItem(StorageKey.TBStartMode, key);
        VSCodeStorage.setItem(StorageKey.RealtimeSearchSession, '');
        vscode.postMessage({
          type: 'dealTbstarMsg',
          content: { type: 'setMode', mode: key },
        });
        handleSubmit();
      },
      style: {
        padding: '0 8px',
        margin: '0 4px',
      },
      selectedKeys: [String(TBMode)],
      items: [
        {
          label: '使用GPT模型(默认）',
          key: TBStartMode.GPT,
        },
        {
          label: '使用集团内模型',
          key: TBStartMode.Group,
        },
      ],
    };
    return menuProps;
  }, [TBMode]);

  return (
    <div className="chat-btn-area" style={type === ChatMode.DevMind ? { bottom: 'auto' } : {}}>
      <div className="top-btns">
        {needShowAdd ? (
          <div className="chat-btn" onClick={handleInsert}>
            <Tooltip placement="top" title={'插入选中代码'} mouseEnterDelay={0}>
              <PlusSquareOutlined className="chat-text-icon" />
            </Tooltip>
          </div> 
        ) : null}
        {!showQuick && type === ChatMode.Free && (
          <div className="chat-btn" onClick={handleRC}>
            <Tooltip
              placement="top"
              title={!openRealTimeSearch ? '开启实时搜索' : '关闭实时搜索'}
              mouseEnterDelay={0}
            >
              {!openRealTimeSearch ? (
                <RealTimeOutLined className="chat-text-icon " />
              ) : (
                <RealTimeIcon className="chat-text-icon " />
              )}
            </Tooltip>
          </div>
        )}
      </div>
      <div className="bottom-btns">
        <div className="chat-btn">
          {loading ? (
            <Tooltip placement="top" title={'停止'} mouseEnterDelay={0}>
              <LoadingOutlined className="chat-text-icon" onClick={handleStop} />
            </Tooltip>
          ) : (
            !disabled &&
            (openRealTimeSearch ? (
              <Dropdown.Button
                className="tbstart-dropdown-button"
                size="small"
                type="text"
                menu={TBStarMenus}
                placement="top"
                trigger={['click']}
              >
                <SendOutlined className="chat-text-icon" onClick={handleSubmit} />
              </Dropdown.Button>
            ) : (
              <Tooltip placement="top" title={'发送消息'} mouseEnterDelay={0}>
                <SendOutlined className="chat-text-icon" onClick={handleSubmit} />
              </Tooltip>
            ))
          )}
        </div>
      </div>
    </div>
  )
});

export default BtnAreas;