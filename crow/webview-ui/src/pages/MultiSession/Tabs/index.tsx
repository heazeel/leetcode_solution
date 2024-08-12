import { useState, useRef, useEffect } from 'react';
import { Input, InputRef } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import { ISession } from '@/types';
import './index.css';
interface IProps {
  tab: any;
  activeKey: string;
  sessions: ISession[];
  setSessionName: (sessionKey: string, value: string) => void;
}
export default (props: IProps) => {
  const { tab, setSessionName, activeKey, sessions } = props;
  const { key, label } = tab;
  const [edit, setEdit] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const [value, setValue] = useState(label);

  const onblur = () => {
    if (value) {
      setValue(value);
      setSessionName(key, value);
    } else {
      setValue(label);
    }
    setEdit(false);
  };

  useEffect(() => {
    const sessionItem = sessions.find((item) => item.key === key);
    if (sessionItem) {
      setValue(sessionItem.label);
    }
  }, [sessions]);

  return (
    <div className="session-tab-wrapper">
      {edit ? (
        <Input
          ref={inputRef}
          onBlur={onblur}
          className="session-tab-edit-input"
          variant="filled"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
        />
      ) : (
        <div className="session-tab-text">
          {activeKey === key && <span className="active-circle">•</span>}
          {label}
        </div>
      )}
      {key !== 'main' && !edit && (
        <FormOutlined
          onClick={() => {
            if (activeKey === key) {
              setEdit(true);
              setTimeout(() => {
                inputRef.current?.focus();
              });
            }
          }}
        />
      )}
    </div>
  );
};
