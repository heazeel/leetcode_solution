import { useState, useEffect, useMemo } from 'react';
import { vscode } from '@/utilities/vscode';
import AddFolderBtn from '@/components/AddFolderBtn';
import { SUPPORT_FILE_TYPE } from '@/constant';
import styles from './index.module.css';

const useWorkSpaceException = (): [
  { name: string; uri: { path: string } },
  boolean,
  boolean,
  JSX.Element,
] => {
  const [addFolderBtnVisible, setAddFolderBtnVisible] = useState(false);
  const [changeFolderBtnVisible, setChangeFolderBtnVisible] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [fileInfo, setFileInfo] = useState({ name: '', uri: { path: '' } });

  // 判断是否是天马模块
  const handleJudgeAliModfile = (fileContent: string) => {
    try {
      const fileObj = JSON.parse(fileContent);

      let isSupportFile = false;
      SUPPORT_FILE_TYPE.forEach((item) => {
        if (fileObj?.name?.includes(item)) {
          isSupportFile = true;
        }
      });

      if (!isSupportFile) {
        setChangeFolderBtnVisible(true);
      }
    } catch (e) {
      setChangeFolderBtnVisible(true);
    }
  };

  const handleReadFile = (filePath: string) => {
    const packageJsonPath = `${filePath}/package.json`;
    vscode.postMessage({
      type: 'file',
      content: { method: 'readFile', fsPath: packageJsonPath },
    });
  };

  // 判断当前根目录文件夹
  const handleJudgeFolder = (workspaceFolders: any[] | undefined) => {
    if (!workspaceFolders?.length) {
      setAddFolderBtnVisible(true);
      return;
    }
    const folderPath = workspaceFolders[0].uri.path;
    setFileInfo(workspaceFolders[0]);
    handleReadFile(folderPath);
  };

  const handleAddFolderSuccess = (folderPath: string) => {
    if (folderPath) {
      setAddFolderBtnVisible(false);
      handleReadFile(folderPath);
    }
  };

  const handleMessage = (event: any) => {
    const message = event.data;
    const { content } = message.content;

    if (message && message.type === 'getWorkspaceFoldersSuccess') {
      handleJudgeFolder(content);
    }
    if (message && message.type === 'readFileSuccess') {
      handleJudgeAliModfile(content);
    }
    setIsChecked(true);
  };

  useEffect(() => {
    vscode.postMessage({
      type: 'file',
      content: {
        method: 'getWorkspaceFolders',
      },
    });

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const Exception: JSX.Element = useMemo(() => {
    return addFolderBtnVisible || changeFolderBtnVisible ? (
      <div className={styles.tips_container}>
        <div className={styles.tips}>
          <span>{addFolderBtnVisible && '尚未添加文件夹到工作区'}</span>
          <span>{changeFolderBtnVisible && '当前文件不是天马模块'}</span>
        </div>
        <div className={styles.btn}>
          <AddFolderBtn
            onSuccess={handleAddFolderSuccess}
            type="primary"
            size="small"
            style={{ width: '300px' }}
          >
            {addFolderBtnVisible ? '添加文件夹' : changeFolderBtnVisible ? '更换文件夹' : ''}
          </AddFolderBtn>
        </div>
      </div>
    ) : (
      <></>
    );
  }, [addFolderBtnVisible, changeFolderBtnVisible]);

  const showException = useMemo(
    () => addFolderBtnVisible || changeFolderBtnVisible,
    [addFolderBtnVisible, changeFolderBtnVisible],
  );

  return [fileInfo, isChecked, showException, Exception];
};

export default useWorkSpaceException;
