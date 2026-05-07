import { describe, expect, it } from "vitest";
import { loadCurriculum } from "../../src/lib/curriculum/loadCurriculum";

describe("loadCurriculum", () => {
  it("loads PEP 2019 topic nodes in stable order", async () => {
    const curriculum = await loadCurriculum("pep-2019");

    expect(curriculum.subjects.math.topics[0].title).toBeTruthy();
    expect(curriculum.subjects.math.topics[0].nextTopicId).toBeDefined();
    expect(curriculum.subjects.math.topics.map((topic) => topic.orderIndex)).toEqual(
      [0, 1],
    );
    expect(curriculum.subjects.physics.topics[0]?.id).toBe("physics-b1-ch1-topic-001");
    expect(curriculum.subjects.chemistry.topics[0]?.id).toBe(
      "chemistry-b1-ch1-topic-001",
    );
  });

  it("loads a deduplicated English vocabulary curriculum in stable word order", async () => {
    const curriculum = await loadCurriculum("pep-2019");
    const englishGroup = (curriculum.subjects as Record<
      string,
      { topics: Array<{ id: string; title: string; nextTopicId?: string; prevTopicId?: string }> }
    >).english;

    expect(englishGroup.topics.length).toBeGreaterThan(0);
    expect(englishGroup.topics[0]?.id).toBe("english-word-00001");
    expect(englishGroup.topics[0]?.title).toBe("a");
    expect(englishGroup.topics[0]?.prevTopicId).toBeUndefined();
    expect(englishGroup.topics[0]?.nextTopicId).toBeDefined();
    expect(
      new Set(englishGroup.topics.map((topic) => topic.title.toLowerCase())).size,
    ).toBe(englishGroup.topics.length);
  });
});
