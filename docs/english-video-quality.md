# English Video Quality Notes

## Preview audio
- Do not use `TTS_PROVIDER=mock` for user-facing preview videos. Mock audio is only a test fallback and can be perceived as silent or broken.
- For visual-only checks, label the output as mock-audio. For reviewable videos, use `TTS_PROVIDER=qwen-local` or another real TTS provider.
- Keep mock audio available for tests and visual-only previews, but treat it as a quality-check failure for reviewable videos.

## TTS speech reliability
- Do not split embedded English words out of normal Chinese narration just to avoid mixed-language text. For English vocabulary videos, ordinary narration should stay in Chinese/default TTS chunks, so short embedded words such as `able` do not become unstable standalone English-mode clips.
- Only the pronunciation segment should be treated as a standalone word-reading segment. With local Qwen fallback, prefer a Chinese instruction that asks it to clearly read the single English word once; Qwen English mode can weak-read or stretch very short words.
- Every real preview must pass per-segment audio checks: each TTS file must decode, have audible volume, and match the manifest duration. A segment that is technically present but near-silent should be treated as a failed preview.
- If a subtitle line appears but the voice is missing, weak, or skipped, inspect the source TTS segment first. Do not hide the problem by changing learner-facing copy or by accepting mock/near-silent audio.

## Pacing
- Avoid standalone ultra-short Chinese TTS segments such as `怎么记？`; local TTS may stretch them into long pauses.
- Qwen may insert long internal pauses inside a valid WAV, especially around spaces, punctuation, question prompts, and mixed Chinese/English narration. Generated TTS chunks should run through internal silence compression so long waits are shortened while natural short pauses remain.
- English-video subtitles must use learner-facing vocabulary-lesson copy, for example `一秒钟记一个单词。今天要记的单词是 X，意思是...`.
- Never expose batch/order/debug wording in subtitles, including `第2个词`, `第 N 个单词`, topic ids, render indexes, or other internal placeholders. The viewer should hear the lesson, not the pipeline.
- Keep Chinese narration segments short, but do not remove the target word from learner-facing subtitle sentences just to avoid TTS issues.
- Cap only pronunciation segments defensively. For ordinary narration, prevent long subtitle exposure by splitting before TTS and by using the real processed audio chunk timings, not by clipping spoken content.
- Keep English vocabulary videos around 20 seconds unless the user asks for a longer lesson.
- Check generated `audio/manifest.json` for unexpectedly long single cues before sharing a preview.

## Vocabulary lesson copy
- Required cadence for the default English word template:
  1. `一秒钟记一个单词。`
  2. `今天要记的单词是 <word>，意思是：<meaning>。`
  3. A concrete scene/action that explains the meaning.
  4. A short wrap line that reconnects `<word>` to the meaning.
- Do not replace learner-facing copy with batch uniqueness tricks. If uniqueness is needed, make the meaning scene and wrap line word-specific; keep the opening cadence human-readable.
- TTS problems must be solved in audio generation, splitting, capping, or quality checks. Do not degrade the teaching script to work around TTS behavior.

## Phonetics
- Every English vocabulary card must show a phonetic cue. The approved lesson and render payload should both carry `phonetic`.
- The CET source wordbank often omits phonetics. When the source value is missing, the mock research provider resolves the word through `cmu-pronouncing-dictionary` and converts CMU ARPABET to IPA.
- Treat the generated IPA as a North American pronunciation fallback. For words outside CMU or words that need a specific UK pronunciation, add a verified source phonetic instead of leaving the card blank.
- The visible phonetic cue and the spoken word should stay aligned. If a provider can reliably use phonetic hints, use the resolved phonetic; if local Qwen weak-reads short English words in English mode, use the stable single-word fallback instruction instead.

## Mnemonic copy
- Mnemonics must explain or guide the target meaning. The problem is not a specific sentence being forbidden; the problem is copy that could apply to any word and does not help the viewer understand this word.
- Each mnemonic should contain meaning anchors from the current word's Chinese definitions, or a concrete action/state that clearly leads to those meanings.
- Mnemonic wording must keep the primary displayed meaning consistent. If the card says `不正常的；变态的`, the mnemonic and wrap line should keep `不正常的、变态的` instead of swapping in another secondary wording such as `不正常的、反常的`.
- The scene action must logically prove the meaning. Reject weak links such as `没人再碰`, `放在那里`, `搁置起来`, or `不再继续就是...` when they do not show a clear actor, decision, action, or state.
- Reject generic picture-copy templates such as `一个清晰的画面闪过眼前`, `它就对应着...`, `放进一个画面`, or `和一个画面焊在一起`. Repeating the Chinese meaning is not enough; the copy must show a concrete or funny/abstract fact that proves the meaning.
- Do not reuse a previous word video's explanation scenario for a related word. Related forms such as `abnormal` and `abnormally` may share a meaning family, but the mnemonic bridge should use a fresh concrete scene instead of replaying the same body-temperature example.
- For noun words, especially `-ment` words, frame the mnemonic as an action, decision, result, or state instead of forcing the meaning onto a random object.
- If a word has multiple Chinese meanings, make the memory line explicitly connect the meanings, for example `abide = 忍受 + 遵守`.
- Prefer meaning-led copy over decorative story copy when the word does not have a strong custom mnemonic.
- In batch runs, mnemonic, definition, pronunciation, and wrap segments must be unique across the batch. A shared opening catchphrase is acceptable only if it is intentionally part of the template and not reused as a cached audio substitute for word-specific content.

## Verification
- Run `npm run cli -- quality english --topic-id <topic-id>` before sharing an English preview video.
- The quality command checks audio provider, phonetic presence, rendered audio track, video volume, per-segment audio decodability/volume/duration, total duration, subtitle cue duration, render/audio manifest consistency, word-entrance cue alignment, and whether mnemonic-only copy both explains and logically supports the current word meaning.
- Before batch generation, inspect at least one approved English script and confirm it contains learner-facing cadence, not internal order labels.
- Before saying a video has sound, verify the rendered MP4 audio stream with `ffprobe`.
- When possible, run `ffmpeg -af volumedetect` to confirm non-silent audio.
- When pacing sounds delayed, run `ffmpeg -af silencedetect` on the affected WAV segment. Long internal pauses are a TTS-generation/audio-postprocessing issue, not a Remotion scheduling issue, if render `audioTracks` are continuous.
- Keep regression tests for draft copy and mock preview pacing when changing English video generation.
