import { memo, useEffect, useRef, useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import './index.css';

const OpBtn = memo((props: any) => {
  let { item, onClick, disabled, promptOp, setPromptOp, isConfiging } = props;

  const btnRef = useRef<HTMLButtonElement>(null);

  const style = useMemo(() => {
    if (item.show !== false) {
      return { opacity: 1, pointerEvents: 'all' };
    } else {
      return { opacity: 0, pointerEvents: 'none' };
    }
  }, [item.show]);

  useEffect(() => {
    if (btnRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!isConfiging) {
              if (entry.isIntersecting) {
                item.show = true;
                setPromptOp([...promptOp]);
              } else {
                item.show = false;
                setPromptOp([...promptOp]);
              }
            }
          });
        },
        { threshold: 1 },
      );

      observer.observe(btnRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [isConfiging]);

  return (
    <div style={style as React.CSSProperties}>
      <Tooltip
        key={item.key}
        placement="top"
        title={disabled ? '' : item.description}
        mouseEnterDelay={0}
      >
        <Button
          ref={btnRef}
          className="chat-quick-op"
          size="small"
          onClick={() => {
            onClick(item);
          }}
          disabled={disabled}
        >
          {item.name}
        </Button>
      </Tooltip>
    </div>
  );
});

export default OpBtn;
