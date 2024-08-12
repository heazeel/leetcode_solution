import { Tooltip, Tag } from 'antd';

export default function Queries(props: { rewriteQueries: string[]; id: string }) {
  const { rewriteQueries = [], id } = props;
  if (!rewriteQueries?.length) return null;
  return (
    <div className="rewrite-wrapper">
      <div className="rewrite-title">关键词:</div>
      <div className="rewrite-query-wrapper">
        {rewriteQueries.map((item: string, index: number) => {
          return (
            <Tooltip
              key={`tbStarAnswer-query-${id}-${index}`}
              placement="top"
              title={item}
              overlayClassName="references-tooltip"
              mouseEnterDelay={0.5}
            >
              <Tag className="query-tag">{item}</Tag>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
