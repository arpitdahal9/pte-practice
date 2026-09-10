import { z } from "zod";
import { Section, TaskType } from "@prisma/client";

const sectionEnum = z.enum(
  Object.values(Section) as [Section, ...Section[]],
);
const taskTypeEnum = z.enum(
  Object.values(TaskType) as [TaskType, ...TaskType[]],
);

export const createQuestionSchema = z.object({
  section: sectionEnum,
  taskType: taskTypeEnum,
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(2000).optional().nullable(),
  promptText: z.string().max(20000).optional().nullable(),
  mediaUrl: z.string().max(2000).optional().nullable(),
  mediaType: z.enum(["audio", "image", "video"]).optional().nullable(),
  payload: z.unknown(), // validated against payloadSchemaFor(taskType)
  difficulty: z.number().int().min(1).max(3).default(2),
  tags: z.array(z.string()).default([]),
  isSample: z.boolean().default(true),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
