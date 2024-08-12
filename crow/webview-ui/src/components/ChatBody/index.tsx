import { ReactNode, memo, useRef, useEffect } from 'react';
import { Skeleton } from 'antd';
import { Virtuoso } from 'react-virtuoso';
import './index.css';

interface ChatBodyProps {
  chatList: ReactNode[];
  chatInput: ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
}

// interface scrollBehaviorType {
//   top: number;
//   behavior?: string;
// }

const ChatBody = memo((props: ChatBodyProps) => {
  const { chatList, chatInput, loading = false, style } = props || {};
  // 记录chatRef
  const chatListRef = useRef<any>([]);
  const scrollerElement = useRef<any>(null);
  // 虚拟列表ref
  const virtuosoRef = useRef<any>(null);
  const lastScrollTop = useRef(0);
  const toBottom = useRef(true);

  // 滚动元素ref
  const scrollerRef = (ref: any) => {
    scrollerElement.current = ref;
  };

  // 滚动监听
  const onscroll = (e: any) => {
    const { target } = e || {};
    const scrollTop = target.scrollTop; // 滚动条滚动高度
    const scrollHeight = target.scrollHeight; // 滚动内容总高度
    const clientHeight = target.clientHeight; // 视口高度
    const distanceToBottom = scrollHeight - clientHeight - scrollTop; // 当前位置距离底部的距离
    if (scrollTop >= lastScrollTop.current && distanceToBottom < 20) {
      toBottom.current = true;
    } else {
      toBottom.current = false;
    }
  };

  // 渲染虚拟列表Item
  const virtualizedListRender = (index: number, item: any) => {
    return <div key={index}>{item}</div>;
  };

  const scrollBottom = () => {
    if (chatList && chatList.length && virtuosoRef.current) {
      const time = setTimeout(() => {
        clearTimeout(time);
        virtuosoRef.current?.scrollToIndex({ index: chatList.length - 1, align: 'end' });
      }, 50);
    }
    // if (!scrollerElement.current) return;
    // scrollerElement.current.scrollTop = scrollerElement.current.scrollHeight;
  };

  // 监听滚动
  useEffect(() => {
    if (
      (toBottom.current && chatList && chatList.length === chatListRef.current.length) ||
      chatList.length > chatListRef.current.length
    ) {
      scrollBottom();
    }
    chatListRef.current = chatList || [];
  }, [chatList]);

  // 监听重试事件
  useEffect(() => {
    const redoAnswerEvent = () => {
      toBottom.current = true;
    };
    window.addEventListener('redoAnswer', redoAnswerEvent);
    return () => {
      window.removeEventListener('redoAnswer', redoAnswerEvent);
    };
  }, []);

  return (
    <div className="chat-container" style={style}>
      <div className="chat-body">
        <div className="chat-content">
          <Skeleton className="skelekon-wrapper" active loading={loading}>
            {!!chatList.length && (
              <Virtuoso
                ref={virtuosoRef}
                data={chatList}
                itemContent={virtualizedListRender}
                scrollerRef={scrollerRef}
                followOutput={true}
                defaultItemHeight={86}
                onScroll={onscroll}
              />
            )}
          </Skeleton>
        </div>
        {chatInput}
      </div>
    </div>
  );
});

export default ChatBody;
