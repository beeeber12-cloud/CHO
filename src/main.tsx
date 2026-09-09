import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FontSizeProvider } from './context/FontSizeContext.tsx';
import { installApiInterceptor } from './lib/session.ts';
import { bootTheme } from './lib/theme.ts';
import { applyInviteFromUrl, readInviteCode } from './lib/invite.ts';

// 서버로 가는 모든 요청에 로그인 증표와 공동체 표시를 자동으로 붙인다.
// (화면 곳곳의 fetch 를 하나하나 고치지 않아도 되고, 빠뜨릴 자리도 없다)
installApiInterceptor();

// 이 기기에 기억해 둔 앱 색을 먼저 입힌다 (서버 값을 기다리면 기본색이 한 번 번쩍인다)
bootTheme();

function start() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <FontSizeProvider>
        <App />
      </FontSizeProvider>
    </StrictMode>,
  );
}

/*
  초대 링크(.../?join=코드)로 들어오셨으면, 화면을 그리기 **전에** 그 공동체를 정한다.
  그래야 로그인 화면이 처음부터 초대받은 공동체로 열린다 (코드를 옮겨 적을 일이 없다).
  초대가 아니면 곧바로 그린다 — 평소 접속이 늦어지지 않게.
*/
if (readInviteCode()) {
  applyInviteFromUrl().finally(start);
} else {
  start();
}
