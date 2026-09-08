import { z } from "zod";

export const createQuizSchema = z.object({
    moduleId: z.string().uuid(),
    title: z.string().min(3, "Judul kuis minimal 3 karakter").max(150),
    passingScorePercent: z.coerce.number().int().min(1).max(100).default(70),
    isRandomized: z.boolean().default(false),
});

export const updateQuizSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(3, "Judul kuis minimal 3 karakter").max(150).optional(),
    passingScorePercent: z.coerce.number().int().min(1).max(100).optional(),
    isRandomized: z.boolean().optional(),
});

export const saveQuizQuestionSchema = z.object({
    quizId: z.string().uuid(),
    questionId: z.string().uuid().optional(), // Jika ada, berarti ini mode Edit Soal
    questionText: z.string().min(3, "Pertanyaan minimal 3 karakter").max(500),
    options: z.array(
        z.object({
            id: z.string().uuid().optional(), // Jika ada, berarti opsi ini sudah ada di DB
            optionText: z.string().min(1, "Opsi tidak boleh kosong").max(300),
            isCorrect: z.boolean().default(false),
        })
    ).min(2, "Setiap pertanyaan minimal harus memiliki 2 opsi jawaban"),
});

export const submitQuizAttemptSchema = z.object({
    quizId: z.string().uuid(),
    answers: z.array(
        z.object({
            questionId: z.string().uuid(),
            selectedOptionIds: z.array(z.string().uuid()),
        })
    ),
});

export const reorderSchema = z.object({
    parentId: z.string().uuid("ID Induk tidak valid"),
    orderedIds: z.array(z.string().uuid("ID urutan tidak valid")),
});