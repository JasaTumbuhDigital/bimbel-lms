"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
    createArticleSchema,
    updateArticleContentSchema,
    updateArticleMetadataSchema
} from "@/lib/validations/blog";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { ActionResult } from "@/types/action";

function generateSlug(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function verifyBlogAccess(articleId: string, userId: string, role: string) {
    const article = await prisma.blogArticle.findUnique({
        where: { id: articleId },
        include: { coAuthors: true }
    });

    if (!article) return { success: false, error: "Artikel tidak ditemukan" };

    if (role === "admin") return { success: true, isAuthor: true, isCoAuthor: true, article };
    const isAuthor = article.authorId === userId;
    const isCoAuthor = article.coAuthors.some(co => co.userId === userId);

    if (isAuthor || isCoAuthor) {
        return { success: true, isAuthor, isCoAuthor, article };
    }

    return { success: false, error: "Akses ditolak. Anda bukan penulis artikel ini." };
}

/**
 * 1. Action Create Empty Draft (Admin & Tutor)
 * Membuat draft artikel kosong dan mengembalikan ID-nya agar bisa langsung masuk ke Editor.
 */
export async function createEmptyDraftAction(): Promise<ActionResult<{ articleId: string; slug: string }>> {
    const user = await getAuthenticatedUser();
    // Hanya admin dan tutor yang boleh membuat artikel
    if (!user || (user.role !== "admin" && user.role !== "tutor")) {
        return { success: false, error: "Akses ditolak. Hanya Admin atau Tutor yang diizinkan." };
    }

    const title = "Untitled Document";
    const baseSlug = generateSlug(title);
    let slug = baseSlug;

    try {
        // Hindari bentrok slug untuk "untitled-document"
        let counter = 1;
        while (true) {
            const existingSlug = await prisma.blogArticle.findUnique({ where: { slug } });
            if (!existingSlug) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Insert Artikel kosong
        const newArticle = await prisma.blogArticle.create({
            data: {
                title,
                slug,
                content: {},
                status: "draft",
                authorId: user.id,
            }
        });

        revalidatePath("/admin/blog");
        revalidatePath("/tutor/blog");
        
        return { success: true, message: "Draft berhasil dibuat", data: { articleId: newArticle.id, slug: newArticle.slug } };
    } catch (error) {
        console.error("Error createEmptyDraftAction:", error);
        return { success: false, error: "Gagal membuat draft artikel." };
    }
}

/**
 * 2. Action Update Isi Artikel (Admin, Author Utama, Co-Author)
 * TSD §4.2: updateArticleContent
 */
export async function updateArticleContentAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const rawData = {
        articleId: formData.get("articleId") as string,
        title: formData.get("title") as string || undefined,
        // TipTap JSON biasanya diubah jadi string saat dikirim via FormData
        content: formData.get("content") ? JSON.parse(formData.get("content") as string) : undefined,
        excerpt: formData.get("excerpt") as string || undefined,
        coverImageUrl: formData.get("coverImageUrl") as string || undefined,
    };

    const validation = updateArticleContentSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { articleId, title, content, excerpt, coverImageUrl } = validation.data;
    const actionType = formData.get("actionType") as string;

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    // Proses perubahan status jika ada actionType dan user berhak (Author Utama/Admin)
    let newStatus = access.article?.status;
    let submittedAt = access.article?.submittedAt;
    let publishedAt = access.article?.publishedAt;

    if (actionType && access.isAuthor) {
        if (actionType === "draft") {
            newStatus = "draft";
        } else if (actionType === "review") {
            newStatus = "pending_review";
            submittedAt = new Date();
        } else if (actionType === "publish" && user.role === "admin") {
            newStatus = "published";
            if (!publishedAt) publishedAt = new Date();
        }
    }

    // Jika admin mengedit artikel milik orang lain (bukan pemilik asli),
    // daftarkan admin sebagai co-author secara otomatis.
    const article = access.article!;
    const isAdminEditingOthersArticle = user.role === "admin" && article.authorId !== user.id;

    try {
        await prisma.blogArticle.update({
            where: { id: articleId },
            data: { 
                title, 
                content, 
                excerpt, 
                coverImageUrl,
                status: newStatus,
                submittedAt,
                publishedAt
            }
        });

        // Tambahkan admin sebagai co-author jika bukan pemilik artikel
        if (isAdminEditingOthersArticle) {
            const alreadyCoAuthor = article.coAuthors.some(co => co.userId === user.id);
            if (!alreadyCoAuthor) {
                await prisma.blogArticleCoAuthor.create({
                    data: { articleId, userId: user.id }
                });
            }
        }

        let message = "Isi artikel berhasil diperbarui";
        if (actionType === "review") message = "Artikel berhasil diajukan untuk direview.";
        if (actionType === "publish") message = "Artikel berhasil dipublikasikan.";
        if (actionType === "draft") message = "Draft berhasil disimpan.";

        revalidatePath(`/admin/blog/${articleId}/edit`);
        revalidatePath(`/tutor/blog/${articleId}/edit`);
        return { success: true, message };
    } catch (error) {
        console.error("Error updateArticleContentAction:", error);
        return { success: false, error: "Gagal memperbarui isi artikel." };
    }
}

/**
 * 3. Action Update Metadata Artikel (Admin & Author Utama)
 * TSD §4.3: updateArticleMetadata
 */
export async function updateArticleMetadataAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const rawTagNames = formData.getAll("tagNames") as string[];

    const rawData = {
        articleId: formData.get("articleId") as string,
        slug: formData.get("slug") as string || undefined,
        categoryId: formData.get("categoryId") as string || undefined,
        tagNames: rawTagNames.length > 0 ? rawTagNames.filter(Boolean) : undefined,
        seoTitle: formData.get("seoTitle") as string || undefined,
        seoDescription: formData.get("seoDescription") as string || undefined,
        seoImageUrl: formData.get("seoImageUrl") as string || undefined,
    };

    const validation = updateArticleMetadataSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: "Validasi gagal", fieldErrors: validation.error.flatten().fieldErrors };
    }

    const { articleId, slug, categoryId, tagNames, seoTitle, seoDescription, seoImageUrl } = validation.data;

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    if (!access.isAuthor) {
        return { success: false, error: "Akses ditolak. Co-Author tidak diizinkan mengubah metadata." };
    }

    try {
        // Jika slug diubah secara manual, pastikan tidak bentrok dengan artikel lain
        if (slug) {
            const existing = await prisma.blogArticle.findFirst({ where: { slug, id: { not: articleId } } });
            if (existing) return { success: false, error: "Slug sudah digunakan oleh artikel lain." };
        }

        await prisma.$transaction(async (tx) => {
            const updateData: any = { slug, categoryId, seoTitle, seoDescription, seoImageUrl };

            // Jika tagNames dikirim ulang, kita replace seluruh relasi tag-nya
            if (tagNames) {
                await tx.blogArticleTag.deleteMany({ where: { articleId } });

                if (tagNames.length > 0) {
                    updateData.tags = {
                        create: tagNames.map(name => {
                            const tagName = name.trim();
                            const tagSlug = generateSlug(tagName);
                            return {
                                tag: {
                                    connectOrCreate: {
                                        where: { name: tagName },
                                        create: { name: tagName, slug: tagSlug }
                                    }
                                }
                            };
                        })
                    };
                }
            }

            await tx.blogArticle.update({
                where: { id: articleId },
                data: updateData
            });
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        revalidatePath(`/tutor/blog/${articleId}/edit`);
        return { success: true, message: "Metadata artikel berhasil diperbarui" };
    } catch (error) {
        console.error("Error updateArticleMetadataAction:", error);
        return { success: false, error: "Gagal memperbarui metadata artikel." };
    }
}


/**
 * 5. Action Approve & Reject Artikel (Admin Only)
 * TSD §4.5
 */
export async function approveArticleAction(articleId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") return { success: false, error: "Akses ditolak. Khusus Admin." };

    try {
        const article = await prisma.blogArticle.findUnique({ where: { id: articleId } });
        if (!article) return { success: false, error: "Artikel tidak ditemukan." };

        await prisma.blogArticle.update({
            where: { id: articleId },
            data: {
                status: "published",
                publishedAt: article.publishedAt ? article.publishedAt : new Date()
            }
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        return { success: true, message: "Artikel disetujui dan dipublish." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menyetujui artikel." };
    }
}

export async function rejectArticleAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") return { success: false, error: "Akses ditolak. Khusus Admin." };

    const articleId = formData.get("articleId") as string;
    const reviewNote = formData.get("reviewNote") as string || null;

    if (!articleId) return { success: false, error: "ID Artikel diperlukan." };

    try {
        await prisma.blogArticle.update({
            where: { id: articleId },
            data: { status: "draft", reviewNote }
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        return { success: true, message: "Artikel ditolak (dikembalikan ke draft)." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menolak artikel." };
    }
}

/**
 * 6. Action Unpublish
 * TSD §4.6
 */

export async function unpublishArticleAction(articleId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    if (!access.isAuthor) {
        return { success: false, error: "Co-Author tidak bisa unpublish artikel." };
    }

    try {
        await prisma.blogArticle.update({
            where: { id: articleId },
            data: { status: "draft" }
            // Kita tidak reset publishedAt, biarkan jadi history
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        revalidatePath(`/tutor/blog/${articleId}/edit`);
        return { success: true, message: "Publikasi dibatalkan (kembali menjadi draft)." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal membatalkan publikasi." };
    }
}

/**
 * 7. Action Kelola Co-Author (Admin & Author Utama)
 * TSD §4.7
 */
export async function addCoAuthorAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const articleId = formData.get("articleId") as string;
    const coAuthorId = formData.get("userId") as string;

    if (!articleId || !coAuthorId) return { success: false, error: "ID Artikel dan User wajib diisi." };

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    if (!access.isAuthor) {
        return { success: false, error: "Akses ditolak. Co-Author tidak bisa mengelola co-author lain." };
    }

    try {
        await prisma.blogArticleCoAuthor.create({
            data: { articleId, userId: coAuthorId }
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        revalidatePath(`/tutor/blog/${articleId}/edit`);
        return { success: true, message: "Co-Author berhasil ditambahkan." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menambah co-author. Mungkin sudah terdaftar?" };
    }
}

export async function removeCoAuthorAction(articleId: string, coAuthorId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    if (!access.isAuthor) {
        return { success: false, error: "Akses ditolak. Co-Author tidak bisa mengelola co-author lain." };
    }

    try {
        await prisma.blogArticleCoAuthor.delete({
            where: { articleId_userId: { articleId, userId: coAuthorId } }
        });

        revalidatePath(`/admin/blog/${articleId}/edit`);
        revalidatePath(`/tutor/blog/${articleId}/edit`);
        return { success: true, message: "Co-Author berhasil dihapus." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menghapus co-author." };
    }
}

/**
 * 8. Action Hapus Artikel (Admin & Author Utama)
 * TSD §4.8
 */
export async function deleteArticleAction(articleId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Belum login." };

    const access = await verifyBlogAccess(articleId, user.id, user.role);
    if (!access.success) return { success: false, error: access.error };

    if (!access.isAuthor) {
        return { success: false, error: "Akses ditolak. Co-Author tidak bisa menghapus artikel." };
    }

    try {
        await prisma.blogArticle.delete({ where: { id: articleId } });

        revalidatePath("/admin/blog");
        revalidatePath("/tutor/blog");
        return { success: true, message: "Artikel berhasil dihapus." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menghapus artikel." };
    }
}

/**
 * 9. Action Manajemen Kategori (Admin Only)
 * TSD §4.12
 */
export async function createBlogCategoryAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") return { success: false, error: "Hanya admin yang bisa menambah kategori." };

    const name = formData.get("name") as string;

    if (!name || name.length < 2) return { success: false, error: "Nama kategori minimal 2 karakter." };

    const slug = generateSlug(name);

    try {
        await prisma.blogCategory.create({ data: { name, slug } });
        revalidatePath("/admin/blog/categories");
        return { success: true, message: "Kategori berhasil dibuat." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal membuat kategori. Mungkin nama sudah terpakai." };
    }
}

export async function deleteBlogCategoryAction(categoryId: string): Promise<ActionResult> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "admin") return { success: false, error: "Hanya admin yang bisa menghapus kategori." };

    try {
        await prisma.blogCategory.delete({ where: { id: categoryId } });
        revalidatePath("/admin/blog/categories");
        return { success: true, message: "Kategori berhasil dihapus." };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Gagal menghapus kategori." };
    }
}

export async function searchBlogTagsAction(query: string) {
    try {
        const { searchBlogTags } = await import("@/lib/data/blog");
        const tags = await searchBlogTags(query);
        return { success: true, data: tags };
    } catch (error) {
        console.error("Error searching tags:", error);
        return { success: false, error: "Gagal mencari tag", data: [] };
    }
}
