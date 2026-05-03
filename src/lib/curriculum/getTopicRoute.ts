import type { CurriculumEdition, Subject } from "./schema";

type TopicRouteInput = {
  edition: CurriculumEdition;
  subject: Subject;
  topicId: string;
};

export const getTopicRoute = ({
  edition,
  subject,
  topicId,
}: TopicRouteInput) => `/curriculum/${edition}/${subject}/${topicId}`;
