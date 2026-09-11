import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requirePageAuth } from "@/lib/session";
import { toClientQuestion } from "@/lib/questions";
import { MockRunner } from "@/components/mock/mock-runner";

export default async function MockRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAuth();
  const { id } = await params;
  const prisma = await getDb();

  const test = await prisma.mockTest.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { question: true } },
    },
  });
  if (!test) notFound();

  const questions = test.questions.map((mq) => toClientQuestion(mq.question));

  return (
    <MockRunner
      mockTestId={test.id}
      title={test.title}
      questions={questions}
    />
  );
}
