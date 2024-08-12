import { memo } from 'react';
import { Tooltip } from 'antd';
import { SendOutlined, LoadingOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { ChatMode } from '@/types';
import './index.css';

interface AreasProps {
  type: ChatMode;
  disabled: boolean | undefined;
  loading: boolean;
  needShowAdd: boolean | undefined;

  handleInsert: () => void;
  handleSubmit: () => void;
  handleStop: () => void;
}

const BtnAreas = memo((props: AreasProps) => {
  const { type, loading, needShowAdd, handleInsert, handleSubmit, handleStop } = props || {};

  return (
    <div
      className="chat-btn-area-mention"
      style={type === ChatMode.DevMind ? { bottom: 'auto' } : {}}
    >
      <div className="chat-btn">
        {needShowAdd ? (
          <Tooltip placement="top" title={'插入选中代码'} mouseEnterDelay={0}>
            <PlusSquareOutlined className="chat-text-icon" onClick={handleInsert} />
          </Tooltip>
        ) : null}
        {loading ? (
          <Tooltip placement="top" title={'停止'} mouseEnterDelay={0}>
            <LoadingOutlined className="chat-text-icon" onClick={handleStop} />
          </Tooltip>
        ) : (
          <Tooltip placement="top" title={'发送消息'} mouseEnterDelay={0}>
            <SendOutlined className="chat-text-icon" onClick={handleSubmit} />
          </Tooltip>
        )}
      </div>
    </div>
  );
});

export default BtnAreas;
