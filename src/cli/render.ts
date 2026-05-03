const message = [
  "The legacy article-based render entry has been retired.",
  "Use the topic-based pipeline instead:",
  "npm run cli -- produce render --topic-id <topic-id>",
].join("\n");

console.error(message);
process.exitCode = 1;
