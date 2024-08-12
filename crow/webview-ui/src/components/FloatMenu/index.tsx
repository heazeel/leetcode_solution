import { memo, useState } from 'react';
import { Button, Dropdown, Drawer, Typography } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DeleteOutlined,
  ClearOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import { vscode } from '@/utilities/vscode';
import type { MenuProps } from 'antd';
import { ChatMode } from '@/types';
import './index.css';
import { VSCodeStorage, StorageKey, DevMindStorage } from '@/utilities/storage';
import { logFloat } from '@/utilities/common';

const { Paragraph, Link } = Typography;

const CleanStorageMenu = {
  key: 'clearStorage',
  label: '清除历史记录',
  icon: <DeleteOutlined />,
};

const ClearMemoryMenu = {
  key: 'clearMemory',
  label: '清除记忆',
  icon: <ClearOutlined />,
};

const UserManual = {
  key: 'userManual',
  label: '用户使用手册',
  icon: <ContainerOutlined />,
};

type FloatMenuProps = {
  type?: ChatMode.Free | ChatMode.DevMind;
  updateChatData: (data?: any) => void;
  sessionKey: string;
};

const FloatMenu = memo((props: FloatMenuProps) => {
  const { type = ChatMode.Free, updateChatData, sessionKey } = props;
  const [open, setOpend] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);

  const FloatMenuItems: MenuProps['items'] = [UserManual, CleanStorageMenu];
  if (type === ChatMode.Free) {
    FloatMenuItems.push(ClearMemoryMenu);
  }

  const renderIcon = () => {
    if (!open) {
      return <MenuUnfoldOutlined />;
    }

    return <MenuFoldOutlined />;
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const { key } = e;
    // 浮层操作上报
    logFloat({
      page: type,
      operator: key,
      eventType: 'CLK',
    });
    if (key === 'userManual') {
      vscode.postMessage({
        type: 'floatOperation',
        content: {
          type: key,
        },
      });
      return;
    }

    if (key === 'disclaimer') {
      setOpenDrawer(true);
      return;
    }

    const storageKey = type === ChatMode.Free ? StorageKey.FreeChatStore : StorageKey.DevMindStore;
    let data;
    if (key === 'clearStorage') {
      if (type === ChatMode.DevMind) {
        DevMindStorage.clearStorage();
        updateChatData();
        return;
      }

      data = VSCodeStorage.clearStorage(storageKey, sessionKey);
      // 清除实时搜索记忆
      VSCodeStorage.setItem(StorageKey.RealtimeSearchSession, '');
      updateChatData(data);
      vscode.postMessage({
        type: 'sendFreeChatMsg',
        content: {
          sessionKey,
          prompt: '',
          lastMessageIds: [],
          type: 'initFollowUpQuestion',
        },
      });
      return;
    }

    if (key === 'clearMemory') {
      data = VSCodeStorage.clearContext(storageKey, sessionKey);
      // 清除实时搜索记忆
      VSCodeStorage.setItem(StorageKey.RealtimeSearchSession, '');
      updateChatData(data);
    }
  };

  return (
    <>
      <Dropdown
        onOpenChange={(open) => {
          setOpend(open);
        }}
        menu={{
          items: FloatMenuItems,
          onClick: handleMenuClick,
        }}
        trigger={['click']}
        placement="topRight"
        className="float-menu"
      >
        <Button shape="circle" size="small" icon={renderIcon()} />
      </Dropdown>
    </>
  );
});
export default FloatMenu;
