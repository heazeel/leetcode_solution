import React from 'react';
import { Space, Typography } from 'antd';
import { TBStartMode } from '@/types';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';

const { Text } = Typography;
interface MOptions {
  prefix?: string;
  value: string;
  name: string;
  type: string;
  label: React.ReactNode;
  parent?: string;
  children?: MOptions[];
}

interface IPrefix {
  [propName: string]: MOptions[];
}

abstract class Base<MOptions> {
  public abstract prefix: string;
  public mentions: MOptions[] = [];
  public abstract getMentions(): MOptions[];
}

const style: any = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const subTextStyle: any = {
  fontSize: '12px',
};

export class AtPrefix extends Base<MOptions> {
  public prefix = '@';
  public mentions: MOptions[] = [];
  constructor(readonly reducePanel: boolean = false) {
    super();
    this.mentions = this.getMentions();
  }

  public getMentions(): MOptions[] {
    const config: any = this.reducePanel
      ? { direction: 'vertical', size: 0, style: { ...style, alignItems: 'flex-start' } }
      : { direction: 'horizontal', size: 10, style };

    return [
      {
        prefix: '@',
        value: 'DeveloperAssistant',
        name: '@DeveloperAssistant',
        type: 'DeveloperAssistant',
        label: (
          <Space {...config}>
            <Text>@DeveloperAssistant</Text>
            <Text type="secondary" style={subTextStyle}>
              开发小助手
            </Text>
          </Space>
        ),
      },
      {
        prefix: '@',
        value: 'RealTimeSearch',
        name: '@RealTimeSearch',
        type: 'RealTimeSearch',
        label: (
          <Space {...config}>
            <Text>@RealTimeSearch</Text>
            <Text type="secondary" style={subTextStyle}>
              使用实时搜索进行问答
            </Text>
          </Space>
        ),
        children: [
          {
            prefix: '@',
            parent: 'RealTimeSearch',
            value: TBStartMode.Group,
            name: `/${TBStartMode.Group}`,
            type: 'RealTimeSearch',
            label: (
              <Space {...config}>
                <Text>/Group</Text>
                <Text type="secondary" style={subTextStyle}>
                  使用集团内部模型
                </Text>
              </Space>
            ),
          },
          {
            prefix: '@',
            parent: 'RealTimeSearch',
            value: TBStartMode.GPT,
            name: `/${TBStartMode.GPT}`,
            type: 'RealTimeSearch',
            label: (
              <Space {...config}>
                <Text>/GPT</Text>
                <Text type="secondary" style={subTextStyle}>
                  使用GPT模型
                </Text>
              </Space>
            ),
          },
        ],
      },
    ];
  }
}

export class MentionsDelegate {
  mentionsArr: Base<MOptions>[] = [];
  mentionObj: IPrefix = {};
  mentions: MOptions[] = [];
  constructor(
    mentions: MOptions[],
    readonly reducePanel: boolean = false,
  ) {
    this.mentions = mentions;
    this.mentionsArr = [new AtPrefix(reducePanel)];
    this.mentionsArr.map((item) => {
      const { prefix } = item || {};
      this.mentionObj[prefix] = item.mentions;
    });
  }

  public getPromptMentions = () => {
    const promptOp: any = VSCodeStorage.getItem(StorageKey.PromptStore) || [];
    const config: any = this.reducePanel
      ? { direction: 'vertical', size: 0, style: { ...style, alignItems: 'flex-start' } }
      : { direction: 'horizontal', size: 10, style };

    return promptOp.map((item: any) => {
      return {
        value: item.key,
        name: item.name,
        type: 'quickOp',
        label: (
          <Space {...config}>
            <Text>{item.name}</Text>
            <Text type="secondary" style={subTextStyle}>
              {item.description}
            </Text>
          </Space>
        ),
      };
    });
  };

  public getPartitionMentions() {
    const promptOptions = this.getPromptMentions();
    const prefixObj = this.mentions[0] || {};
    const { name = '', value, children, prefix } = prefixObj;
    // 获取当前已输入的mention prefix
    const mentionTypes = this.mentionsArr.map((item) => item.prefix);
    mentionTypes.unshift('/');
    const filterMentions = mentionTypes.filter((item) => {
      return name.indexOf(item) > -1;
    });
    const filterMention = filterMentions[0] || '';
    // 首次输入
    if (filterMention === '') {
      const newMentions: MOptions[] = [];
      this.mentionsArr.map((mentionItem) => {
        const { mentions } = mentionItem || {};
        mentions.map((item) => {
          const children = item.children || [];
          newMentions.push(item);
          newMentions.push(...children);
        });
      });
      return [...promptOptions, ...newMentions];
    } else if (this.mentions.length === 1) {
      // 二级mention
      if (children && children.length) {
        if (prefix) {
          const mentionsOptions = this.mentionObj[prefix] || [];
          const mentionItem = mentionsOptions.find((item) => {
            return item.value === value;
          });
          return mentionItem?.children || [];
        }
      }
      return [];
    }
    return [];
  }

  public getMentions(): IPrefix {
    const partitionMentions = this.getPartitionMentions();
    const prefixObj: IPrefix = {
      '/': partitionMentions || [],
    };
    this.mentionsArr.map((item) => {
      const { prefix } = item || {};
      const mention = this.mentions?.[0];
      if (mention) {
        prefixObj[prefix] = [];
      } else {
        prefixObj[prefix] = item.mentions;
      }
    });
    return prefixObj;
  }
}
