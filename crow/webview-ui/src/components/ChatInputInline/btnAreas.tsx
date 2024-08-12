import { memo, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import Icon, { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { ChatMode, TBStartMode } from '@/types';
import './index.css';

interface AreasProps {
  type: ChatMode;
  disabled: boolean | undefined;
  loading: boolean;
  handleSubmit: () => void;
  handleStop: () => void;
}

const BtnAreas = memo((props: AreasProps) => {
  const { type, disabled, loading, handleSubmit, handleStop } = props || {};

  return (
    <div className="chat-btn-area" style={type === ChatMode.DevMind ? { bottom: 'auto' } : {}}>
      <div className="bottom-btns">
        <div className="chat-btn">
          {loading ? (
            <Tooltip placement="top" title={'停止'} mouseEnterDelay={0}>
              <LoadingOutlined className="chat-text-icon" onClick={handleStop} />
            </Tooltip>
          ) : (
            !disabled && (
              <Tooltip placement="top" title={'发送消息'} mouseEnterDelay={0}>
                <SendOutlined className="chat-text-icon" onClick={handleSubmit} />
              </Tooltip>
            )
          )}
        </div>
      </div>
    </div>
  );
});

export default BtnAreas;
