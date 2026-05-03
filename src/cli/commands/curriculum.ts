import { loadCurriculum } from "../../lib/curriculum/loadCurriculum";
import { subjectSchema } from "../../lib/curriculum/schema";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

export const handleCurriculumList = async (args: string[]) => {
  const subject = subjectSchema.parse(readOption(args, "--subject"));
  const volume = readOption(args, "--volume");
  const curriculum = await loadCurriculum("pep-2019");
  const topics = curriculum.subjects[subject].topics.filter(
    (topic) => !volume || topic.volume === volume,
  );

  console.log(
    JSON.stringify(
      {
        edition: curriculum.edition,
        subject,
        topics,
      },
      null,
      2,
    ),
  );
};
