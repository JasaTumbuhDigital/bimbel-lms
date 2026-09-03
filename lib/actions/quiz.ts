"use server"

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";
import { verifyCourseAccess } from "@/lib/data/course-access";
import { reorderSchema } from "../validations/module";
import {
    createQuizSchema,
    updateQuizSchema,
    saveQuizQuestionSchema,
    submitQuizAttemptSchema
} from "@/lib/validations/quiz";

// ==========================================
// QUIZ ACTIONS (ADMIN/TUTOR)
// ==========================================

export async function createQuizAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();

    if (!user?.id) return { success: false, error: "Akses ditolak." };

    const rawData = {
        moduleId: formData.get("moduleId") as string,
        title: formData.get("title") as string,
        passingScorePercent: formData.get("passingScorePercent"),
        isRandomized: formData.get("isRandomized") === "true",
    };

    const validation = createQuizSchema.safeParse(rawData);

    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }
    const { moduleId, title, passingScorePercent, isRandomized } = validation.data;
    try {

        // Cek akses ke modul ini dengan menelusuri course-nya
        const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
        if (!moduleRecord) return { success: false, error: "Modul tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(moduleRecord.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak mengelola kuis di kursus ini." };

        // Pastikan modul belum punya kuis (Constraint: 1 Modul maksimal 1 Kuis)
        const existingQuiz = await prisma.quiz.findUnique({ where: { moduleId } });
        if (existingQuiz) return { success: false, error: "Modul ini sudah memiliki kuis." };

        await prisma.quiz.create({
            data: { moduleId, title, passingScorePercent, isRandomized }
        });

        revalidatePath(`/admin/courses/${moduleRecord.courseId}/edit`);
        revalidatePath(`/tutor/courses/${moduleRecord.courseId}/edit`);
        return { success: true, message: "Kuis berhasil dibuat" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function updateQuizAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();

    if (!user?.id) return { success: false, error: "Akses ditolak." };

    const rawData = {
        id: formData.get("id") as string,
        title: formData.get("title") ? (formData.get("title") as string) : undefined,
        passingScorePercent: formData.get("passingScorePercent") ? formData.get("passingScorePercent") : undefined,
        isRandomized: formData.get("isRandomized") !== null ? formData.get("isRandomized") === "true" : undefined,
    };

    const validation = updateQuizSchema.safeParse(rawData);

    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { id, title, passingScorePercent, isRandomized } = validation.data;

    try {
        const quizRecord = await prisma.quiz.findUnique({
            where: { id },
            include: { module: true }
        });
        if (!quizRecord) return { success: false, error: "Kuis tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(quizRecord.module.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak mengelola kuis ini." };

        await prisma.quiz.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(passingScorePercent !== undefined && { passingScorePercent }),
                ...(isRandomized !== undefined && { isRandomized })
            }
        });

        revalidatePath(`/admin/courses/${quizRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${quizRecord.module.courseId}/edit`);
        return { success: true, message: "Kuis berhasil diubah" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function deleteQuizAction(quizId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user?.id) return { success: false, error: "Akses ditolak." };

    try {
        const quizRecord = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { module: true }
        });
        if (!quizRecord) return { success: false, error: "Kuis tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(quizRecord.module.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak mengelola kuis ini." };

        // Menghapus Quiz otomatis menghapus questions, options, & progress (onDelete: Cascade)
        await prisma.quiz.delete({ where: { id: quizId } });

        revalidatePath(`/admin/courses/${quizRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${quizRecord.module.courseId}/edit`);
        return { success: true, message: "Kuis berhasil dihapus" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

// ==========================================
// QUIZ QUESTION & OPTIONS (BULK ACTIONS)
// ==========================================
export async function saveQuizQuestionAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user?.id) return { success: false, error: "Akses ditolak." };

    // Karena datanya berbentuk array (options), kita akan asumsikan client 
    // mengirimkan JSON string lewat form dengan nama input "payload"
    const payloadString = formData.get("payload") as string;
    if (!payloadString) return { success: false, error: "Data tidak ditemukan." };

    let rawData;
    try {
        rawData = JSON.parse(payloadString);
    } catch {
        return { success: false, error: "Format data tidak valid." };
    }

    const validation = saveQuizQuestionSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { quizId, questionId, questionText, options } = validation.data;
    try {
        const quizRecord = await prisma.quiz.findUnique({
            where: { id: quizId }, include: { module: true }
        });
        if (!quizRecord) return { success: false, error: "Kuis tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(quizRecord.module.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak mengubah kuis ini." };

        await prisma.$transaction(async (tx) => {
            let currentQuestionId = questionId;
            if (!currentQuestionId) {
                // MODE: CREATE BARU
                const lastQuestion = await tx.quizQuestion.findFirst({
                    where: { quizId },
                    orderBy: { sortOrder: "desc" }
                });
                const sortOrder = lastQuestion ? lastQuestion.sortOrder + 1 : 0;
                const newQuestion = await tx.quizQuestion.create({
                    data: { quizId, questionText, sortOrder }
                });
                currentQuestionId = newQuestion.id;
                // Create semua opsinya
                await tx.quizOption.createMany({
                    data: options.map((opt) => ({
                        questionId: currentQuestionId!,
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect,
                    }))
                });
            } else {
                // MODE: UPDATE YANG SUDAH ADA
                await tx.quizQuestion.update({
                    where: { id: currentQuestionId },
                    data: { questionText }
                });
                // Hapus opsi yang tidak ada di payload (berarti dihapus oleh user di UI)
                const optionIdsToKeep = options.map(o => o.id).filter(Boolean) as string[];
                await tx.quizOption.deleteMany({
                    where: {
                        questionId: currentQuestionId,
                        id: { notIn: optionIdsToKeep }
                    }
                });
                // Upsert opsi yang dikirim user
                for (let i = 0; i < options.length; i++) {
                    const opt = options[i];
                    if (opt.id) {
                        await tx.quizOption.update({
                            where: { id: opt.id },
                            data: { optionText: opt.optionText, isCorrect: opt.isCorrect }
                        });
                    } else {
                        await tx.quizOption.create({
                            data: { questionId: currentQuestionId, optionText: opt.optionText, isCorrect: opt.isCorrect }
                        });
                    }
                }
            }
        });

        revalidatePath(`/admin/courses/${quizRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${quizRecord.module.courseId}/edit`);
        return { success: true, message: "Soal beserta opsinya berhasil disimpan!" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function reorderQuizQuestionsAction(
    quizId: string,
    orderedQuestionIds: string[]
): Promise<ActionResult> {
    const rawData = {
        parentId: quizId,
        orderedIds: orderedQuestionIds
    };

    // Kita gunakan ulang reorderSchema dari module karena formatnya persis sama
    const validation = reorderSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Format data urutan tidak valid." };
    }
    const user = await getAuthenticatedUser();
    if (!user?.id) return { success: false, error: "Akses ditolak." };
    try {
        const quizRecord = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { module: true }
        });
        if (!quizRecord) return { success: false, error: "Kuis tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(quizRecord.module.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak mengubah kuis ini." };

        // Eksekusi update secara massal di dalam database transaction
        await prisma.$transaction(
            orderedQuestionIds.map((id, index) =>
                prisma.quizQuestion.update({
                    where: { id },
                    data: { sortOrder: index }
                })
            )
        );
        revalidatePath(`/admin/courses/${quizRecord.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${quizRecord.module.courseId}/edit`);
        return { success: true, message: "Urutan soal berhasil diubah!" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

export async function deleteQuizQuestionAction(questionId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user?.id) return { success: false, error: "Akses ditolak." };

    try {
        const questionRecord = await prisma.quizQuestion.findUnique({
            where: { id: questionId },
            include: { quiz: { include: { module: true } } }
        });
        if (!questionRecord) return { success: false, error: "Pertanyaan tidak ditemukan." };

        const { success: hasAccess } = await verifyCourseAccess(questionRecord.quiz.module.courseId, false);
        if (!hasAccess) return { success: false, error: "Anda tidak berhak menghapus soal." };

        await prisma.quizQuestion.delete({ where: { id: questionId } });

        revalidatePath(`/admin/courses/${questionRecord.quiz.module.courseId}/edit`);
        revalidatePath(`/tutor/courses/${questionRecord.quiz.module.courseId}/edit`);
        return { success: true, message: "Pertanyaan beserta opsi jawabannya berhasil dihapus" };
    } catch (error) {
        return { success: false, error: String(error) || "Terjadi kesalahan" };
    }
}

// ==========================================
// QUIZ SUBMISSION (STUDENT)
// ==========================================
export async function submitQuizAttemptAction(
    prevState: ActionResult | null,
    rawData: any
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "student" || !user.studentProfile) {
        return { success: false, error: "Akses ditolak." };
    }

    const studentId = user.studentProfile.id;

    // Kita asumsikan rawData langsung berupa JSON dari client (bukan FormData), 
    // karena bentuk array of objects lebih mudah dikirim sebagai JSON
    const validation = submitQuizAttemptSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { quizId, answers } = validation.data;
    try {
        // Ambil data kuis beserta SEMUA OPSI dengan isCorrect = true/false untuk pencocokan
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                module: { include: { course: { include: { enrollments: { where: { studentId } } } } } },
                questions: { include: { options: true } }
            }
        });
        if (!quiz) return { success: false, error: "Kuis tidak ditemukan." };

        if (quiz.module.course.enrollments.length === 0) {
            return { success: false, error: "Anda belum terdaftar pada kursus ini." };
        }

        const totalQuestions = quiz.questions.length;
        if (totalQuestions === 0) return { success: false, error: "Kuis belum memiliki soal." };

        let correctCount = 0;

        const feedback: Record<string, boolean> = {}; // Status benar/salah per ID soal (untuk UI)

        // Proses penilaian per soal
        for (const question of quiz.questions) {
            const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.id);
            const studentAnswer = answers.find(a => a.questionId === question.id);
            const studentSelectedIds = studentAnswer?.selectedOptionIds || [];
            // Jawaban Mutlak: Siswa harus memilih SEMUA opsi yang benar, dan JANGAN memilih opsi yang salah
            const isAnswerCorrect =
                correctOptionIds.length > 0 &&
                correctOptionIds.length === studentSelectedIds.length &&
                correctOptionIds.every(id => studentSelectedIds.includes(id));
            if (isAnswerCorrect) {
                correctCount++;
                feedback[question.id] = true;
            } else {
                feedback[question.id] = false;
            }
        }

        // Kalkulasi Persentase
        const score = (correctCount / totalQuestions) * 100;
        const passedThisAttempt = score >= quiz.passingScorePercent;

        // Upsert Progress (Timpa bestScore & isPassed jika lebih baik)
        const existing = await prisma.quizProgress.findUnique({
            where: { studentId_quizId: { studentId, quizId } }
        });

        const newBestScore = Math.max(existing?.bestScore || 0, score);
        const newIsPassed = (existing?.isPassed || false) || passedThisAttempt;

        await prisma.quizProgress.upsert({
            where: { studentId_quizId: { studentId, quizId } },
            update: {
                bestScore: newBestScore,
                isPassed: newIsPassed,
                attemptsCount: { increment: 1 },
                lastAttemptAt: new Date()
            },
            create: {
                studentId,
                quizId,
                bestScore: score,
                isPassed: passedThisAttempt,
                attemptsCount: 1,
                lastAttemptAt: new Date()
            }
        });

        // Revalidate halaman kursus supaya UI badge Kuis ter-update
        revalidatePath(`/student/courses/${quiz.module.courseId}`);
        return {
            success: true,
            message: "Kuis berhasil disubmit!",
            data: {
                score,
                passedThisAttempt,
                newBestScore,
                newIsPassed,
                feedback // Berguna agar client bisa menampilkan (Warna Hijau/Merah) untuk soal yang dijawab 
            }
        };
    } catch (error) {
        console.error("Quiz submission error:", error);
        return { success: false, error: "Terjadi kesalahan sistem." };
    }
}