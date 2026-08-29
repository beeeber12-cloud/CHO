import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FontSizeProvider } from './context/FontSizeContext.tsx';
import { installApiInterceptor } from './lib/session.ts';

// 서버로 가는 모든 요청에 로그인 증표와 공동체 표시를 자동으로 붙인다.
// (화면 곳곳의 fetch 를 하나하나 고치지 않아도 되고, 빠뜨릴 자리도 없다)
installApiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FontSizeProvider>
      <App />
    </FontSizeProvider>
  </StrictMode>,
);
