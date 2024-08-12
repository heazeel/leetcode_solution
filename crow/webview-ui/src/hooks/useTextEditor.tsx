import { useEffect, useState } from 'react';

type DataType = {
  method?: string;
  result?: string;
  language?: string;
  filePath?: string;
  selection?: any;
};

export default function useTextEditor ():DataType {
  const [data, setData] = useState<DataType>({})

  useEffect(() => {
    const msgHandler = (event: any) => {
      const message = event.data;
      if (message && message.type === 'textEditor') {
        const content:DataType = message.content;
        if (content && content.method && content.result) {
          setData(content);
          return;
        }
      }

      setData({});
    };

    window.addEventListener('message', msgHandler);

    return () => {
      window.removeEventListener('message', msgHandler);
    }
  }, []);


  return data;
}