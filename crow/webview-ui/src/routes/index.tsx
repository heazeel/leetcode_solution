import Home from '../pages/Home';
import MultiSession from '@/pages/MultiSession';
import DevMind from '../pages/DevMind';
import Test from '../pages/Test';
import UploadFilePage from '../pages/Upload';
import Player from '@/pages/Player';

const routes = [
  { path: '/', element: <Home /> },
  { path: '/chat', element: <MultiSession /> },
  { path: '/devMind', element: <DevMind /> },
  { path: '/upload', element: <UploadFilePage /> },
  { path: '/test', element: <Test /> },
  { path: '/player', element: <Player /> },
];

export default routes;
