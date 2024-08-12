/// <reference types="vite/client" />
declare interface Window {
  initTheme: string;
  userInfo: {
    username?: string;
    userId?: string;
    uuid?: string;
    userNick?: string;
    workId?: string;
  };
  crow_trace: any;
}
