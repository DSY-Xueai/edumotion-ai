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
});
