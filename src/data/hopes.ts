// 내년 1순위 소망. 고른 소망에 어울리는 곡과 덕담 중에서 추첨합니다.
// songs / blessings 값은 src/data/songs.ts, blessings.ts 배열의 인덱스입니다.
export const hopes = [
  { key: "health", label: "건강", desc: "아프지 않고 씩씩하게", songs: [7, 22, 18, 24], blessings: [2, 8, 13, 14, 19, 23] },
  { key: "love", label: "사랑", desc: "설레는 사랑이 찾아오길", songs: [9, 19, 23, 1], blessings: [0, 7, 11, 24] },
  { key: "success", label: "성공", desc: "애쓴 만큼 좋은 결과를", songs: [0, 20, 8, 6], blessings: [3, 10, 16, 21] },
  { key: "travel", label: "여행", desc: "새로운 곳으로 훌쩍", songs: [10, 2, 15, 26], blessings: [5, 10, 18, 22] },
  { key: "growth", label: "성장", desc: "나답게 한 뼘 더", songs: [5, 11, 12, 25], blessings: [0, 6, 13, 17, 21] },
  { key: "rest", label: "쉼", desc: "마음 편히 푹 쉬기", songs: [13, 14, 16, 21], blessings: [5, 12, 17, 23, 25] },
  { key: "fresh", label: "새출발", desc: "새로운 시작과 행운", songs: [3, 4, 15, 6], blessings: [1, 16, 22, 24, 26] },
  { key: "together", label: "함께", desc: "소중한 사람들과 웃기", songs: [17, 21, 18, 26, 1], blessings: [4, 7, 9, 15, 19, 20] },
] as const;

export type HopeKey = (typeof hopes)[number]["key"];

export function findHope(key: unknown) {
  return typeof key === "string" ? hopes.find((h) => h.key === key) : undefined;
}
