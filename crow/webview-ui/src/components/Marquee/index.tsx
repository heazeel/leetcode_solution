import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { Typography } from 'antd';

interface MarqueeProps {
  data: string[];
  onContainerClick?: () => void;
  className?: string;
  itemHeight: number;
}

const Marquee = memo((props: MarqueeProps) => {
  const { data, onContainerClick, className, itemHeight } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout>();

  const renderData = useMemo(() => {
    return [...data, data[0]];
  }, [data]);

  const maxPoint = renderData.length;

  useEffect(() => {
    let step = 0;
    const animFunc = (dom: HTMLDivElement) => {
      if (step >= maxPoint - 1) {
        const newTimer = setTimeout(() => {
          clearTimeout(newTimer);
          dom.style.transition = `none`;
          dom.style.transform = 'translateY(0)';
          step = 0;
        }, 1000);
      }

      timer.current = setTimeout(() => {
        step++;
        clearTimeout(timer.current);
        dom.style.transition = 'all 1s ease';
        dom.style.transform = `translateY(-${step * itemHeight}px)`;
        animFunc(dom);
      }, 5000);
    };
    const placeholderDom = containerRef.current;
    if (placeholderDom) {
      animFunc(placeholderDom);
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      onClick={onContainerClick}
      ref={containerRef}
      className={className}
      style={{
        height: itemHeight * maxPoint + 'px'
      }}
    >
      {renderData.map((item, index) => {
        return (
          <Typography.Text
            key={index}
            type="secondary" 
            style={{
              height: itemHeight + 'px',
              display: "flex",
              alignItems: "center",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              padding: 0,
              margin: 0
            }}
          >
            {item}
          </Typography.Text>
        );
      })}
    </div>
  );
});
export default Marquee;