/**
 * 성경읽기 챌린지 — 진행률 계산과 상태 판정.
 *
 * 진행률은 따로 세지 않는다. **성경통독의 '읽음' 표시를 그대로 읽는다.**
 * 통독에서 완료를 누르면 챌린지 진행률에 바로 반영되고,
 * 두 곳의 숫자가 어긋날 일이 없다.
 */
import { DatabaseSchema, ReadingChallenge, User } from "../src/types";

/** 성경통독이 읽음 표시를 남기는 형식 — "마가복음 3장" */
export function chapterKey(book: string, chapter: number): string {
  return `${book} ${chapter}장`;
}

export interface ParticipantProgress {
  userId: string;
  name: string;
  /** 읽은 장 수 */
  done: number;
  /** 전체 장 수 */
  total: number;
  percent: number;
  /** 다 읽었는지 */
  finished: boolean;
  /** 아직 안 읽은 장 번호들 (앞의 몇 개만) */
  remaining: number[];
}

/** 한 사람이 이 챌린지에서 어디까지 왔는지 */
export function progressOf(
  db: DatabaseSchema,
  challenge: ReadingChallenge,
  userId: string
): ParticipantProgress {
  const user = (db.users || []).find((u) => u.id === userId);
  const done = new Set(db.userBibleProgress?.[userId]?.completedChapters || []);

  const remaining: number[] = [];
  let count = 0;
  for (let ch = 1; ch <= challenge.totalChapters; ch++) {
    if (done.has(chapterKey(challenge.book, ch))) count++;
    else if (remaining.length < 5) remaining.push(ch);
  }

  return {
    userId,
    name: user?.name || "(탈퇴한 지체)",
    done: count,
    total: challenge.totalChapters,
    percent: challenge.totalChapters ? Math.round((count / challenge.totalChapters) * 100) : 0,
    finished: count >= challenge.totalChapters,
    remaining
  };
}

/** 참가자 전원의 진행률. 많이 읽은 사람이 앞으로 */
export function allProgress(db: DatabaseSchema, challenge: ReadingChallenge): ParticipantProgress[] {
  return challenge.participantIds
    .map((id) => progressOf(db, challenge, id))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name, "ko"));
}

/**
 * 챌린지를 끝낼 때가 됐는지 본다.
 * ① 참가자가 모두 다 읽었거나 ② 목표일이 지났으면 끝난 것으로 본다.
 */
export function shouldFinish(
  db: DatabaseSchema,
  challenge: ReadingChallenge,
  today: string
): boolean {
  if (challenge.status !== "active") return false;
  if (today > challenge.endDate) return true;
  if (challenge.participantIds.length === 0) return false;
  return allProgress(db, challenge).every((p) => p.finished);
}

/** 지금 화면에 보여줄 챌린지 (도는 중이거나, 끝난 당일까지) */
export function visibleChallenge(
  db: DatabaseSchema,
  today: string
): ReadingChallenge | null {
  const list = db.challenges || [];
  const active = list.find((c) => c.status === "active");
  if (active) return active;
  // 끝난 날 하루는 남겨 두고 축하한다. 다음 날부터 감사 탭이 돌아온다.
  const justDone = list
    .filter((c) => c.status === "done" && c.completedDate === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return justDone || null;
}

/** 그 사람에게 보낼 챌린지 알림 문구 (참가자가 아니면 null) */
export function challengeAlarmText(
  db: DatabaseSchema,
  challenge: ReadingChallenge,
  userId: string
): { title: string; body: string } | null {
  if (!challenge.participantIds.includes(userId)) return null;
  const p = progressOf(db, challenge, userId);

  if (p.finished) {
    return {
      title: `🎉 ${challenge.title} 완주`,
      body: `${challenge.book} ${p.total}장을 다 읽으셨습니다. 함께 읽어주셔서 고맙습니다.`
    };
  }

  const left = p.total - p.done;
  const next = p.remaining[0];
  return {
    title: `📖 ${challenge.title}`,
    body:
      `${p.done}/${p.total}장 (${p.percent}%) · ${left}장 남았어요.` +
      (next ? ` 오늘은 ${challenge.book} ${next}장부터 어떠세요?` : "")
  };
}
