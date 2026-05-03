import type { ScriptSegment } from "../draft/schema";
import type { SynthesizedSegment } from "./schema";

export type SynthesizeSegmentInput = {
  topicId: string;
  segment: ScriptSegment;
};

export interface TtsProvider {
  synthesizeSegment(
    input: SynthesizeSegmentInput,
  ): Promise<SynthesizedSegment>;
}
