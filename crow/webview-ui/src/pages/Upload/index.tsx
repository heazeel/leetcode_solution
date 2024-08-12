import { useRef, useEffect, useState } from 'react';
import { Button, Upload, UploadProps, message, Form, Input, InputRef, UploadFile } from 'antd';
import { vscode } from '@/utilities/vscode';
import './index.css';

const { TextArea } = Input;

interface IStatus {
  (res: any, file: any): void;
}

export default function UploadFilePage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [latestVersion, setLatestVersion] = useState<string>();
  const onSuccess = useRef<IStatus>();
  const onError = useRef<IStatus>();
  const textAreaRef = useRef<any>(null);
  const inputRef = useRef<InputRef>(null);
  const fileInfo = useRef<any>({});
  const validateStatus = useRef<boolean>(true);

  const compareVersions = (version1: string, version2: string) => {
    // 将版本号字符串分割成多个部分，并转换为整数数组
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    // 比较每个部分的值，直到找到不相等的部分或遍历完所有部分为止
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      if (i >= v1Parts.length) {
        // 如果v1的部分数量少于v2，则v1小于v2
        return -1;
      } else if (i >= v2Parts.length) {
        // 如果v2的部分数量少于v1，则v2小于v1
        return 1;
      } else {
        if (v1Parts[i] > v2Parts[i]) {
          return 1;
        } else if (v1Parts[i] < v2Parts[i]) {
          return -1;
        }
      }
    }

    // 如果所有部分都相等，则认为两个版本号相等
    return 0;
  };

  const validateVersion = (version: string) => {
    const reg = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/g;
    return reg.test(version);
  };

  // 校验表单
  const validateForm = () => {
    const currentVersion = inputRef.current?.input?.value || '';
    const validVersion = validateVersion(currentVersion);
    if (!validVersion) {
      validateStatus.current = false;
      message.error('请输入正确的版本号: xx.xx.xx');
      return false;
    }
    if (latestVersion !== undefined) {
      const compareVersion = compareVersions(currentVersion, latestVersion);
      if (compareVersion !== 1) {
        message.error('当前版本号必须大于历史最新版本');
        return false;
      }
    }
    return true;
  };
  // 校验文件合法性
  const validateFile = (name: string) => {
    const splitArr = name.split('.');
    if (splitArr.length < 2 || splitArr[splitArr.length - 1] !== 'vsix') {
      message.error('请上传.visx文件');
      return false;
    }
    splitArr.splice(splitArr.length - 1);
    const fullName = splitArr.join('.').split('-');
    const version = fullName[1];
    const validVersion = validateVersion(version);
    if (fullName.length !== 2 || !validVersion) {
      message.error('请上传crow-x.x.x.vsix格式文件');
      return false;
    }
    return true;
  };
  const uploadProps: UploadProps = {
    name: 'file',
    maxCount: 1,
    onRemove: () => true,
    progress: {
      strokeColor: {
        '0%': '#108ee9',
        '100%': '#87d068',
      },
      strokeWidth: 3,
      format: () => {
        return (progress * 100).toFixed(2);
      },
    },
    beforeUpload: async (file) => {
      validateStatus.current = true;
      const { name } = file;
      if (!validateFile(name)) {
        validateStatus.current = false;
        return false;
      }
      if (!validateForm()) {
        validateStatus.current = false;
        return false;
      }
    },
    onChange(info) {
      const { fileList } = info;
      if (validateStatus.current) {
        setFileList([...fileList]);
      }
    },
    customRequest(info: any) {
      onSuccess.current = info.onSuccess;
      onError.current = info.onError;
      const { file } = info;
      fileInfo.current = file;

      const versionInfo = {
        name: file.name,
        version: inputRef.current?.input?.value,
        description: textAreaRef.current?.resizableTextArea?.textArea?.value,
      };

      vscode.postMessage({
        type: 'upload',
        content: { type: 'uploadFile', path: file.path, versionInfo },
      });
    },
  };

  // 监听文件上传进度
  useEffect(() => {
    const event = (event: any) => {
      const eventMessage = event.data;
      const { type, content } = eventMessage || {};
      if (type === 'upload') {
        const { status, index, total } = content;
        if (index !== undefined) {
          setProgress(index / total);
        } else {
          if (status) {
            message.success('文件上传成功');
            onSuccess.current && onSuccess.current({ success: true }, fileInfo.current);
          } else {
            message.error('文件上传失败');
            onError.current && onError.current({ success: false }, fileInfo.current);
          }
        }
      } else if (type === 'versionInfo') {
        const { version } = content;
        if (version.version) {
          setLatestVersion(version.version);
        }
      }
    };
    window.addEventListener('message', event);
    return () => {
      window.removeEventListener('message', event);
    };
  }, []);

  useEffect(() => {
    // 获取历史版本
    vscode.postMessage({
      type: 'upload',
      content: { type: 'getVersion' },
    });
  }, []);
  return (
    <div className="upload-wrapper">
      <Form form={form}>
        <Form.Item className="upload-form-item" label="历史最新版本">
          <Input value={latestVersion} disabled />
        </Form.Item>
        <Form.Item className="upload-form-item" label="当前更新版本">
          <Input ref={inputRef} placeholder="请输入最新版本号(格式: 1.0.1):" />
        </Form.Item>
        <Form.Item className="upload-form-item" label="请输入当前版本更新日志">
          <TextArea ref={textAreaRef} placeholder="新版本插件更新内容..." allowClear />
        </Form.Item>
        <Form.Item className="upload-form-item" label="上传文件">
          <Upload fileList={fileList} {...uploadProps}>
            <Button>上传文件</Button>
          </Upload>
        </Form.Item>
      </Form>
    </div>
  );
}
