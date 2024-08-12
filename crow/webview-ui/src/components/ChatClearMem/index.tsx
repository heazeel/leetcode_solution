import { memo } from 'react';
import { ChatMode } from '@/types';
import { VSCodeStorage, StorageKey } from '@/utilities/storage';
import './index.css';

type ChatClearMemProps = {
  type: ChatMode.Free | ChatMode.DevMind;
  updateChatData: (data: any) => void;
  sessionKey: string;
};

const ChatClearMem = memo((props: ChatClearMemProps) => {
  const { type, updateChatData, sessionKey } = props || {};
  const storageKey = type === ChatMode.Free ? StorageKey.FreeChatStore : StorageKey.DevMindStore;

  const restore = () => {
    let data = VSCodeStorage.restoreContext(storageKey, sessionKey);
    updateChatData(data);
  };

  return (
    <div className="clear-wrapper">
      <div className="has-clear">上下文已清除</div>
      <div className="restore-clear" onClick={restore}>
        恢复上下文
      </div>
    </div>
  );
});

export default ChatClearMem;
