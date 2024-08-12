import { memo } from 'react';
import Queries from './Queries';
import References from './References';
import './index.css';

interface ITbStarProps {
  rewriteQueries?: string[];
  references?: any[];
  isTbsearch: boolean;
  id: string;
}

export default memo(function TbStarAnswer(props: ITbStarProps) {
  const { rewriteQueries = [], references = [], isTbsearch, id } = props;
  if (!isTbsearch) return null;
  return (
    <>
      {/* 关键词 */}
      <Queries rewriteQueries={rewriteQueries} id={id} />
      {/* 参考资料 */}
      <References references={references} id={id} />
      {/* AI回答标题 */}
      {rewriteQueries?.length || references?.length ? (
        <div className="rewrite-answer-wrapper">
          <div className="rewrite-title">AI总结:</div>
        </div>
      ) : null}
    </>
  );
});
