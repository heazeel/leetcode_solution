import { useEffect, useState, memo } from 'react';
import { Tooltip, Card } from 'antd';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { vscode } from '@/utilities/vscode';
import { ChatMode } from '@/types';
import { logClkTbStarUrl, logClkTbStarExpand } from '@/utilities/common';

interface IReferenceProps {
  title: string;
  hostName: string;
  url: string;
  time?: string;
  [propName: string]: any;
}

export default memo(function References(props: { references: any[]; id: string }) {
  const { references = [], id } = props;
  const [isShrink, setIsShrink] = useState(true);
  const [liteReferences, setLiteReferences] = useState(references.slice(0, 4));

  useEffect(() => {
    const list = references.slice(0, 4);
    setLiteReferences(list);
  }, [references]);

  if (!references?.length) return null;

  // 跳转外部链接
  const jumpToPage = (url: string, item: IReferenceProps) => {
    if (url) {
      // 埋点上报
      logClkTbStarUrl({
        page: ChatMode.Free,
        operator: '点击参考资料跳转',
        eventType: 'CLK',
        extData: {
          title: item?.title,
          url,
        },
      });
      vscode.postMessage({
        type: 'dealTbstarMsg',
        content: {
          type: 'openUrl',
          url,
        },
      });
    }
  };

  // 展开更多
  const expland = () => {
    const status = !isShrink;
    setIsShrink(status);
    // 埋点上报
    logClkTbStarExpand({
      page: ChatMode.Free,
      operator: status ? '收拢' : '展开',
      eventType: 'CLK',
    });
    if (status) {
      const lite = references.slice(0, 4);
      setLiteReferences([...lite]);
    } else {
      setLiteReferences([...references]);
    }
  };

  return (
    <div className="references-wrapper">
      <div className="rewrite-title">参考资料:</div>
      <div className="references-card-wrapper">
        {liteReferences.map((item: IReferenceProps, index: number) => {
          const { title = '', hostName = '', url, time } = item || {};
          return (
            <Tooltip
              key={`tbStarAnswer-references-${id}-${index}`}
              placement="top"
              overlayClassName="references-tooltip"
              title={title}
              mouseEnterDelay={0.5}
            >
              <Card
                onClick={() => {
                  jumpToPage(url, item);
                }}
                className="references-item-wrapper"
                styles={{
                  body: {
                    padding: '0',
                    position: 'relative',
                    height: '100%',
                  },
                }}
              >
                <div className="references-item-title">{title}</div>
                <div className="references-item-host">
                  <span className="references-item-span">
                    {hostName ? `${index + 1} · ${hostName}` : index + 1}
                  </span>
                  <span className="references-item-span-right">{time}</span>
                </div>
              </Card>
            </Tooltip>
          );
        })}
        {references.length > 4 ? (
          <div className="references-shrink-btn" onClick={expland}>
            {isShrink ? <CaretDownOutlined /> : <CaretUpOutlined />}
          </div>
        ) : null}
      </div>
    </div>
  );
});
