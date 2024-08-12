import { useEffect, memo } from 'react';
import { Button, ButtonProps } from 'antd';
import { vscode } from '@/utilities/vscode';

interface AddFolderBtnProps extends ButtonProps {
  onSuccess?: (folderPath: string) => void;
}

const AddFolderBtn = memo((props: AddFolderBtnProps) => {
  const { children, onSuccess, ...resetProps } = props;

  const handleAdd = () => {
    vscode.postMessage({
      type: 'file',
      content: { method: 'addFolderToWorkspace' },
    });
  };

  useEffect(() => {
    window.addEventListener('message', (event: any) => {
      const message = event.data;
      const { content } = message.content;
      if (message && message.type === 'addFolderToWorkspaceSuccess') {
        onSuccess && onSuccess(content);
      }
    });
  }, []);

  return (
    <Button onClick={handleAdd} {...resetProps}>
      {children}
    </Button>
  );
});

export default AddFolderBtn;
