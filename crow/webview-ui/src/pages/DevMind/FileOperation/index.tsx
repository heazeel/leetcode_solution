import React, { useRef, useEffect, useMemo } from 'react';
import { DevMindMessage, DevMindProject, DevMindFileList } from '@/utilities/storage';
import { Button, Progress, Collapse, Input, message, Tooltip, Typography } from 'antd';
import { ChatItemType } from '@/types';
import { getDataTime, logDevMind } from '@/utilities/common';
import {
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { vscode } from '@/utilities/vscode';
import './indes.css';

interface FileitemProps {
  code: DevMindFileList[] | undefined;
  isLast: boolean;
  messageData: DevMindMessage;
  chatData: DevMindProject;
  updateChatData: (updateData?: DevMindProject) => void;
  fileInfo: { name: string; uri: { path: string } };
  editting?: boolean;
  showAccept?: boolean;
  showProcess?: boolean;
  showFileItem?: boolean;
  setAnswerLoading?: (loading: boolean) => void;
}

const useFileOperation = (props: FileitemProps) => {
  let {
    isLast,
    messageData,
    chatData,
    updateChatData,
    fileInfo,
    code,
    editting,
    showProcess = false,
    showAccept = true,
    setAnswerLoading,
  } = props || {};

  const [messageApi, contextHolder] = message.useMessage();
  const updateRequirement = useRef(
    code?.map((item) => ({ filename: item.fileName, requirement: '' })) || [],
  );

  const fileBtnDisabled = useMemo(() => {
    const lastMessage = [...chatData.messages].pop();
    if (messageData.target === 'ui-code' && chatData.status !== 2) {
      return true;
    }

    if (messageData.target !== lastMessage?.target) {
      return true;
    }

    return false;
  }, [messageData, chatData]);

  const onFileClick = (file: DevMindFileList) => {
    const { name } = fileInfo || {};
    vscode.postMessage({
      type: 'file',
      content: {
        method: 'createTempReadOnlyFilePreview',
        text: file.data,
        fsPath: `${name}/${chatData.sessionId}/${file.fileName}`,
      },
    });
  };

  const onTell = () => {
    vscode.postMessage({
      type: 'devMindSessionTell',
      content: {
        reqBody: {
          event: 'userSelect',
          target: 'code',
          codes: code?.map((item) => ({ filename: item.fileName, content: item.data })) || [],
        },
        sessionId: chatData.sessionId,
      },
    });
  };

  const onAcceptFile = (codes: DevMindFileList[]) => {
    let lastMessage = chatData.messages.pop();
    if (lastMessage) {
      const acceptCode = codes.map((item) => item.fileName);
      const _code = lastMessage?.code?.map((item) => {
        let accept = item.accept || false;
        if (acceptCode.includes(item.fileName)) {
          accept = true;
        }

        return {
          ...item,
          accept,
        };
      });

      if (_code?.every((item) => item.accept)) {
        chatData.status = 3;
      }

      lastMessage.code = _code;
      chatData.messages.push(lastMessage);

      logDevMind({
        sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
        taskType: _code?.length === acceptCode?.length ? 'acceptAll' : 'accept',
        target: codes?.length ? JSON.stringify(acceptCode) : '',
        executeStatus: 'success',
      });

      updateChatData();
    }

    const insertCodes = codes.map((item) => ({
      path: `${item.fileName}`,
      text: item.data,
    }));

    vscode.postMessage({
      type: 'devMindInsertCode',
      content: {
        sessionId: chatData.sessionId,
        codes: insertCodes,
      },
    });
  };

  const onUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>, file: DevMindFileList) => {
    const { value } = e.target;
    for (let i = 0; i < updateRequirement.current.length; i++) {
      if (updateRequirement.current[i].filename === file.fileName) {
        updateRequirement.current[i].requirement = value;
        break;
      }
    }
  };

  const onSubmitUpdate = () => {
    setAnswerLoading && setAnswerLoading(true);
    onTell();

    const lastMessage = chatData.messages.pop();
    if (lastMessage) {
      lastMessage.content = '正在提交修改意见...';
      chatData.messages.push(lastMessage);
      updateChatData();
    }

    setTimeout(() => {
      const fixOpinions = updateRequirement.current.filter((item) => !!item.requirement);
      if (fixOpinions.length === 0) {
        messageApi.error('请填写修改意见');
        return;
      }

      const lastAskMessage = chatData.messages
        .filter((item) => item.type === ChatItemType.Ask)
        .pop();
      const lastMessage = chatData.messages.pop();

      if (lastAskMessage?.content) {
        const chatAnswer: DevMindMessage = {
          type: ChatItemType.Answer,
          content: '正在修改代码...',
          date: getDataTime(),
          taskType: 'fix',
          target: lastMessage?.target,
          fixOpinions,
        };

        chatData.messages.push(chatAnswer);
        updateChatData();

        const reqBody = {
          type: 'fix',
          target: lastMessage?.target || '',
          fixOpinions,
        };

        vscode.postMessage({
          type: 'devMindSessionAsk',
          content: {
            reqBody: reqBody,
            sessionId: chatData.sessionId,
          },
        });
      }
    }, 3000);
  };

  const RenderCode = (item: DevMindFileList, index: number) => {
    return (
      <div
        className="devmind_file_wrapper"
        key={item.fileName}
        style={index !== 0 ? { marginTop: 2 } : {}}
      >
        <Button
          className={`devmind_file_button ${showAccept && 'devmind_file_button_with_accept'}`}
          disabled={fileBtnDisabled}
          icon={<FileTextOutlined />}
          onClick={() => onFileClick(item)}
        >
          {showProcess && (
            <Progress
              className="devmind_progress_wrapper"
              percent={item.percent}
              type="circle"
              size={20}
            />
          )}
          <Typography.Text ellipsis>{item.fileName}</Typography.Text>
        </Button>
        {showAccept && (
          <Tooltip title={item.accept ? '已采纳' : '采纳'}>
            <Button
              disabled={
                item.accept || editting || !isLast || item.percent !== 100 || chatData.status === 3
              }
              onClick={() => onAcceptFile([item])}
              style={{ marginLeft: 2, width: 46 }}
            >
              {item.accept ? <CheckCircleOutlined /> : <PlusCircleOutlined />}
            </Button>
          </Tooltip>
        )}
      </div>
    );
  };

  const fileItem = code?.length ? (
    <>
      {contextHolder}
      {editting ? (
        <Collapse
          ghost
          size="small"
          collapsible="icon"
          className="devmind_collapse_wrapper devmind_edit_wrapper"
          expandIcon={() => <EditOutlined />}
          defaultActiveKey={code?.[0].fileName}
          items={code?.map((item, index) => ({
            key: item.fileName,
            label: RenderCode(item, index),
            children: (
              <Input.TextArea
                placeholder="请输入修改意见"
                autoSize={{ minRows: 3 }}
                defaultValue={
                  updateRequirement.current.find((i) => i.filename === item.fileName)
                    ?.requirement || ''
                }
                onChange={(e) => onUpdate(e, item)}
              />
            ),
          }))}
        />
      ) : (
        code?.map((item, index) => RenderCode(item, index))
      )}
    </>
  ) : (
    <div className="devmind_file_empty">暂无文件</div>
  );

  useEffect(() => {
    updateRequirement.current =
      code?.map((item) => ({ filename: item.fileName, requirement: '' })) || [];
  }, [code]);

  return [fileItem, onSubmitUpdate, onAcceptFile] as [
    React.ReactNode,
    () => void,
    (codes?: DevMindFileList[]) => void,
  ];
};

export default useFileOperation;
