"use client";

import Modal, { DialogNote } from "./Modal";

export default function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="이용 방법" onClose={onClose}>
      <ol>
        <li>초원에서 헤드폰을 낀 붉은 양을 찾아 눌러 주세요. 못 찾겠으면 ‘못 찾겠어요’를 눌러요.</li>
        <li>붉은 양에게 이름을 알려 주고, 내년에 가장 바라는 1순위 소망을 고르면 복주머니가 열려요.</li>
        <li>‘첫 곡 듣기’로 노래를 듣고 ‘티켓 저장’으로 이름이 담긴 티켓을 간직하세요.</li>
      </ol>
      <DialogNote>
        붉은 양을 찾은 뒤의 장면은 화면을 누르거나 Enter·Space·Esc로 건너뛸 수 있어요. 영상 재생에는 YouTube가 사용돼요.{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube 이용약관
        </a>{" "}
        ·{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google 개인정보처리방침
        </a>
      </DialogNote>
    </Modal>
  );
}
