import { useState, useEffect } from 'react';
import { Steps, Popover } from 'antd';
import { throttle } from 'lodash';
import styles from './index.module.css';

export interface StepAreaProps {
  status: number;
}

const allItems = [
  {
    title: '模块初始化',
    description: '根据描述进行模块初始化操作',
  },
  {
    title: '数据配置',
    description: '生成模块schema和mock数据',
  },
  {
    title: '代码生成',
    description: '生成模块的核心逻辑&UI代码',
  },
];

const simpleItems = [
  {
    title: (
      <Popover
        content={
          <>
            <span>根据描述进行模块初始化操作</span>
          </>
        }
      >
        初始化
      </Popover>
    ),
  },
  {
    title: (
      <Popover
        content={
          <>
            <span>生成模块schema和mock数据</span>
          </>
        }
      >
        数据
      </Popover>
    ),
  },
  {
    title: (
      <Popover
        content={
          <>
            <span>生成模块的核心逻辑&UI代码</span>
          </>
        }
      >
        代码
      </Popover>
    ),
  },
];

const StepArea = (props: StepAreaProps) => {
  const { status } = props || {};
  const [renderItems, setRenderItems] = useState<any[]>(simpleItems);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [expand, setExpand] = useState(true);

  useEffect(() => {
    const resize = throttle(() => {
      if (window.innerWidth >= 390) {
        setRenderItems(allItems);
      } else {
        setRenderItems(simpleItems);
      }

      if (window.innerWidth >= 220) {
        setDirection('horizontal');
      } else {
        setDirection('vertical');
      }
    }, 100);

    resize();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={styles.step_warpper}>
      <div style={!expand ? { height: 2 } : {}}>
        <Steps
          type="navigation"
          size="small"
          direction={direction}
          responsive={false}
          current={status}
          labelPlacement="horizontal"
          items={renderItems}
          style={{ transform: expand ? 'translateY(0)' : 'translateY(calc(-100% + 2px))' }}
        />
      </div>
      <div className={`css-var-crow ${styles.expand_btn}`} onClick={() => setExpand(!expand)}>
        {expand ? '收起' : '展开'}
      </div>
    </div>
  );
};

export default StepArea;
