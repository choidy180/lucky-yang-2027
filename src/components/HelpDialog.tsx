"use client";

import Modal, { DialogNote } from "./Modal";

export default function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="이용 방법" onClose={onClose}>
      <ol>
        <li>붉은 양의 인사를 보고 이름이나 별명을 입력하세요.</li>
        <li>복주머니 그림이나 ‘복주머니 열기’를 눌러 첫 곡과 새해 덕담을 받으세요.</li>
        <li>‘첫 곡 듣기’로 노래를 듣고 ‘티켓 저장’으로 이름이 담긴 티켓을 간직하세요.</li>
      </ol>
      <DialogNote>
        영상 재생에는 YouTube가 사용돼요.{" "}
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
