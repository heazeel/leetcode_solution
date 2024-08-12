import { useState } from 'react';
import { Tag, Button, Form, Input, Space, Divider, Drawer, message, Popconfirm } from 'antd';
import { vscode } from '@/utilities/vscode';
import {
  PlusOutlined,
  SwapOutlined,
  MenuOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import { CSS } from '@dnd-kit/utilities';
import { logCustomPrompt } from '@/utilities/common';
import { ChatMode } from '@/types';

import './index.css';

export interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
  promptOp: any[];
  setPromptOp: any;
  type: ChatMode;
  getPromptFactory: () => void;
}

const { CheckableTag } = Tag;
const { TextArea } = Input;

const ConfigModal = (props: ConfigModalProps) => {
  const {
    visible,
    onClose,
    promptOp,
    setPromptOp,
    type = ChatMode.Free,
    getPromptFactory,
  } = props || {};

  const [isSortable, setIsSortable] = useState(false);
  const [selectOp, setSelectOp] = useState<any>();
  const [addPromptData, setAddPromptData] = useState<any>();

  const [form] = Form.useForm();

  const SortableItem = (props: any) => {
    const { data } = props || {};
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: data.key,
    });

    const style = {
      transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
      transition,
    };

    return (
      <div ref={setNodeRef} style={{ zIndex: 1001, ...style }} {...attributes} {...listeners}>
        <Tag className="sort-tag">
          <MenuOutlined className="drag-handle" />
          {data.name}
        </Tag>
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setPromptOp((prev: any) => {
        const activeIndex = prev.findIndex((i: any) => i.key === active.id);
        const overIndex = prev.findIndex((i: any) => i.key === over?.id);
        const newArr = arrayMove(prev, activeIndex, overIndex);
        VSCodeStorage.setItem(StorageKey.PromptStore, newArr);
        return [...newArr];
      });
      message.success('排序成功');
    }
  };

  const handleTagClick = (item: any, checked: boolean) => {
    handleClearStatus();
    if (checked) {
      setSelectOp(item);
      form.setFieldsValue({
        name: item.name,
        description: item.description,
        template: item.template,
      });
    } else {
      setSelectOp(null);
    }
  };

  const onFinish = () => {
    form
      .validateFields()
      .then((values) => {
        const submitValue = {
          ...values,
          isBuiltin: false,
          isFactory: false,
          key: values.name.substring(1),
        };

        let operator = '';

        if (selectOp) {
          const index = promptOp.findIndex((item) => item.key === selectOp.key);
          promptOp.splice(index, 1, submitValue);
          setPromptOp([...promptOp]);
          VSCodeStorage.setItem(StorageKey.PromptStore, [...promptOp]);
          message.success('修改成功');
          operator = 'modifySucc';
        } else {
          setPromptOp([...promptOp, submitValue]);
          VSCodeStorage.setItem(StorageKey.PromptStore, [...promptOp, submitValue]);
          message.success('添加成功');
          operator = 'addSucc';
        }

        logCustomPrompt({
          page: type,
          operator: operator,
          eventType: 'CLK',
          extData: submitValue,
        });

        handleClearStatus();
      })
      .catch((ex) => {
        logCustomPrompt({
          page: type,
          operator: 'submitErr',
          eventType: 'CLK',
          extData: ex,
        });
      });
  };

  const onDelete = () => {
    if (selectOp) {
      const index = promptOp.findIndex((item) => item.key === selectOp.key);
      promptOp.splice(index, 1);
      setPromptOp([...promptOp]);
      VSCodeStorage.setItem(StorageKey.PromptStore, [...promptOp]);
      message.success('删除成功');
      handleClearStatus();

      logCustomPrompt({
        page: type,
        operator: 'delSucc',
        eventType: 'CLK',
        extData: selectOp,
      });
    }
  };

  // 清除所有操作状态
  const handleClearStatus = () => {
    setIsSortable(false);
    setSelectOp(null);
    setAddPromptData(null);
    form.resetFields();
  };

  const handleSortClick = () => {
    logCustomPrompt({
      page: type,
      operator: isSortable ? 'exitSort' : 'sort',
      eventType: 'CLK',
    });

    handleClearStatus();
    setIsSortable(!isSortable);
  };

  // 新增prompt
  const handleAddPrompt = () => {
    handleClearStatus();
    if (addPromptData) {
      setAddPromptData(null);
      return;
    }

    logCustomPrompt({
      page: type,
      operator: addPromptData ? 'exitAdd' : 'addPrompt',
      eventType: 'CLK',
    });

    const data = {
      name: '/custom',
      key: '',
      template:
        '你可以在这里输入自定义prompt~\n可以使用{codeStr}来自定义选中代码的插入位置，默认会插入在最后一行。\n\n下面是一个使用例子：\n\n帮我分析一下这段代码的优化点\n{codeStr}',
      description: '自定义操作',
      isBuiltin: false,
      isFactory: false,
    };

    setAddPromptData(data);
    form.setFieldsValue(data);
  };

  const handleClose = () => {
    logCustomPrompt({
      page: type,
      operator: 'closeSetting',
      eventType: 'CLK',
    });

    onClose();
    handleClearStatus();
  };

  const handleAddInputChange = (e: any) => {
    if (!addPromptData) return;
    addPromptData.name = e.target.value;
    setAddPromptData({ ...addPromptData });
  };

  const promptNameCheck = (): {
    status: '' | 'error' | 'success' | 'warning' | 'validating' | undefined;
    tips: string;
  } => {
    const name = form.getFieldValue('name');
    if (!name) {
      return { status: 'error', tips: '请输入操作名称' };
    }
    if (/[\u4e00-\u9fa5]/.test(name)) {
      return { status: 'error', tips: '操作名称不能包含中文' };
    }
    if (!name.startsWith('/')) {
      return { status: 'error', tips: '操作名称需要以 / 开头' };
    }
    if (name.length < 2) {
      return { status: 'error', tips: '操作名称不完整' };
    }
    if (selectOp?.key === name.substring(1)) {
      return { status: 'success', tips: '' };
    }
    if (promptOp.findIndex((item) => item.key === name.substring(1)) > -1) {
      return { status: 'error', tips: '操作名称重复' };
    }
    return { status: 'success', tips: '' };
  };

  // 跳转到Prmopt工厂
  const jumpToPromptFactory = () => {
    vscode.postMessage({
      type: 'shortcut',
      content: { method: 'jumpToPromptFactory' },
    });
  };

  const footer = (
    <Space size={8} style={{ width: '100%', justifyContent: 'flex-end' }}>
      {(selectOp || addPromptData) && (
        <Button
          type="primary"
          size="small"
          disabled={(!addPromptData && selectOp?.isBuiltin) || selectOp?.isFactory}
          onClick={onFinish}
        >
          保存
        </Button>
      )}
      {selectOp && (
        <Popconfirm
          title="确定删除？"
          placement="topRight"
          onConfirm={onDelete}
          okText="确认"
          cancelText="取消"
        >
          <Button
            type="primary"
            danger
            size="small"
            disabled={selectOp?.isBuiltin || selectOp?.isFactory}
          >
            删除
          </Button>
        </Popconfirm>
      )}
    </Space>
  );

  return (
    <Drawer
      title="快捷操作配置"
      open={visible}
      onClose={handleClose}
      footer={footer}
      maskClosable
      placement="bottom"
      height={'90%'}
      styles={{ body: { padding: '24px 16px 16px 16px' }, header: { padding: 16 } }}
      destroyOnClose
    >
      <div>
        <div className="op-list-wrapper">
          {!isSortable ? (
            <Space size={[8, 8]} wrap>
              {promptOp.map((item: any, index: number) => (
                <CheckableTag
                  key={index}
                  checked={selectOp?.key === item.key}
                  className="click-tag check-tag"
                  style={selectOp?.key === item.key ? { border: '1px solid #1668DC' } : {}}
                  onChange={(checked) => handleTagClick(item, checked)}
                >
                  {item.name}
                </CheckableTag>
              ))}
              {addPromptData && (
                <CheckableTag checked={false} className="click-tag check-tag">
                  {addPromptData.name}
                </CheckableTag>
              )}
            </Space>
          ) : (
            <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragEnd={onDragEnd}>
              <SortableContext
                items={promptOp.map((i) => i.key)}
                strategy={verticalListSortingStrategy}
              >
                <Space size={[8, 8]} direction="vertical" style={{ width: '100%' }}>
                  {promptOp.map((item) => (
                    <SortableItem key={item.key} data={item} />
                  ))}
                </Space>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <Divider orientation="left" dashed orientationMargin={0}>
          <Space size={4}>
            <Tag
              className="click-tag"
              onClick={handleAddPrompt}
              color={addPromptData ? '#f51' : 'default'}
            >
              <PlusOutlined style={{ marginRight: 4 }} />
              {addPromptData ? '退出新增' : '新增'}
            </Tag>
            <Tag
              className="click-tag"
              color={isSortable ? '#f51' : 'default'}
              onClick={handleSortClick}
            >
              <SwapOutlined style={{ marginRight: 4 }} />
              {isSortable ? '退出排序' : '排序'}
            </Tag>
            <Tag
              className="click-tag"
              color={isSortable ? '#f51' : 'default'}
              onClick={getPromptFactory}
            >
              <VerticalAlignBottomOutlined style={{ marginRight: 4 }} />
              同步Prompt工厂
            </Tag>
          </Space>
        </Divider>
        {(selectOp || addPromptData) && (
          <>
            <div className="prompt-factory-tip">
              <div className="item-title">
                提示：插件内新增的Prompt为本地新增，不会上传到云端，如需获取更多自定义Prompt，请前往
                <a onClick={jumpToPromptFactory}>Prompt工厂</a>
              </div>
            </div>
            <Form
              form={form}
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              initialValues={{ remember: true }}
              autoComplete="off"
              disabled={(!addPromptData && selectOp?.isBuiltin) || selectOp?.isFactory}
            >
              <div>
                <div className="item-title">操作名称</div>
                <Form.Item
                  name="name"
                  validateStatus={promptNameCheck()?.status}
                  help={promptNameCheck()?.tips}
                >
                  <Input onChange={handleAddInputChange} />
                </Form.Item>
              </div>
              <div>
                <div className="item-title">操作描述</div>
                <Form.Item
                  name="description"
                  rules={[{ required: true, message: '请输入操作描述' }]}
                >
                  <Input />
                </Form.Item>
              </div>
              <div>
                <div className="item-title">前置prompt</div>
                <Form.Item name="template" rules={[{ required: true, message: '请输入prompt' }]}>
                  <TextArea rows={10} showCount />
                </Form.Item>
              </div>
            </Form>
          </>
        )}
      </div>
    </Drawer>
  );
};

export default ConfigModal;
