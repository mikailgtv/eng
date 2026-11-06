import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
const existing = await prisma.listeningExercise.findFirst({ where: { title: "Hello at the station" } });
if (!existing) {
  const row = await prisma.listeningExercise.create({
    data: {
      title: "Hello at the station",
      levelCode: "PRE_A1",
      topic: "Greetings",
      transcript: "Hello. My name is Sam. I work at a fire station.",
      translation: "Bonjour. Je m'appelle Sam. Je travaille dans une caserne.",
      source: "SCRIPT",
      status: "PUBLISHED",
      questions: JSON.stringify([
        { id: "q1", type: "MC", prompt: "What is his name?", options: ["Sam", "Ali", "Sara"], answer: "Sam", explanation: "He says: My name is Sam." },
        { id: "q2", type: "TF", prompt: "He works at a fire station.", options: ["True", "False"], answer: "True", explanation: "The sentence says he works at a fire station." },
      ]),
    },
  });
  console.log("seeded", row.id);
} else {
  console.log("exists", existing.id);
}
}
main().finally(() => prisma.$disconnect());
