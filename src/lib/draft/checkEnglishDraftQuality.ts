import type { LessonDraftPayload } from "./schema";
import type { TopicResearch } from "../research/schema";

const splitMeaningTokens = (definitions: string[]) =>
  definitions
    .flatMap((definition) => definition.split(/[；;，,、。.!！?？\s]+/u))
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const mnemonicScriptText = (draft: LessonDraftPayload) =>
  draft.scriptSegments
    .filter(
      (segment) =>
        !["hook", "definition", "pronunciation"].includes(segment.kind) &&
        !segment.id.endsWith("-seg-recap"),
    )
    .map((segment) => segment.text)
    .join("\n");

export const checkEnglishDraftQuality = ({
  draft,
  research,
}: {
  draft: LessonDraftPayload;
  research: TopicResearch;
}) => {
  const issues: string[] = [];
  const allDraftText = [
    draft.hook,
    draft.summary,
    ...draft.scriptSegments.map((segment) => segment.text),
    ...draft.subtitleDraft.map((subtitle) => subtitle.text),
    ...draft.visualPlan,
  ].join("\n");
  const scriptText = mnemonicScriptText(draft);
  const primaryTokens = splitMeaningTokens(research.definitions).slice(0, 2);

  if (/[?？]{3,}/u.test(allDraftText)) {
    issues.push(
      "Draft copy contains replacement-marker text, which usually means the Chinese script was corrupted before TTS.",
    );
  }

  if (/[\\](?:u[0-9a-fA-F]{2,6}|x[0-9a-fA-F]{2})/u.test(allDraftText)) {
    issues.push(
      "Draft copy contains literal escape text, which usually means Unicode was not decoded before TTS.",
    );
  }

  for (const token of primaryTokens) {
    if (!scriptText.includes(token)) {
      issues.push(`Mnemonic copy must include the primary meaning token: ${token}`);
    }
  }

  if (
    /清晰的画面|对应着|脑子里立刻有一个场景|放进一个画面|画面里只有一件事|和一个画面焊在一起|那个画面就是/u.test(
      scriptText,
    )
  ) {
    issues.push(
      "Mnemonic copy uses generic picture wording instead of a concrete action, state, or result.",
    );
  }

  if (/先抓中文义项|不靠空想|这一轮只记.+核心意思|画面只服务|直接对上[：:，,]/mu.test(scriptText)) {
    issues.push("Mnemonic copy exposes meta instructions instead of teaching the learner.");
  }

  if (/纸箱|没人再碰|没人碰|放在那里|搁置|旧东西|不再继续[，,、\s]*就是/u.test(scriptText)) {
    issues.push("Mnemonic copy uses a weak abandoned-object scene.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
};
