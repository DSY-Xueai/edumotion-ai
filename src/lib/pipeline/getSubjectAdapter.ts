import type { Subject } from "../curriculum/schema";
import {
  chemistrySubjectAdapter,
  mathSubjectAdapter,
  physicsSubjectAdapter,
  type SubjectAdapter,
} from "../rendering/subjectAdapter";

const registry: Record<Subject, SubjectAdapter> = {
  math: mathSubjectAdapter,
  physics: physicsSubjectAdapter,
  chemistry: chemistrySubjectAdapter,
};

export const getSubjectAdapter = (subject: Subject): SubjectAdapter => {
  return registry[subject];
};
