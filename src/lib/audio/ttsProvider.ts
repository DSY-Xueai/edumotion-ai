import type { ScriptSegment } from "../draft/schema";
import type { SynthesizedSegment } from "./schema";
import type { TtsProviderName } from "./schema";

export type SynthesizeSegmentInput = {
  topicId: string;
  segment: ScriptSegment;
};

export type SynthesizeSegmentsInput = {
  topicId: string;
  segments: ScriptSegment[];
};

export interface TtsProvider {
  name: TtsProviderName;
  synthesizeSegment(
    input: SynthesizeSegmentInput,
  ): Promise<SynthesizedSegment>;
  synthesizeSegments?(
    input: SynthesizeSegmentsInput,
  ): Promise<SynthesizedSegment[]>;
}
