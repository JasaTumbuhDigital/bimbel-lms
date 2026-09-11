"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { STORAGE_BUCKET, getPublicUrl } from "@/lib/supabase-storage";
import {
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    ImageIcon,
    Loader2
} from "lucide-react";

interface TipTapEditorProps {
    content: any;
    onChange?: (json: any) => void;
    editable?: boolean;
    articleId: string;
}

export default function TipTapEditor({
    content,
    onChange,
    editable = true,
    articleId,
}: TipTapEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const supabase = createClient();

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            ImageExtension.configure({
                inline: false,
                HTMLAttributes: {
                    class: "rounded-lg max-w-full my-4 shadow-sm border border-slate-200",
                },
            }),
        ],
        content: content || { type: "doc", content: [] },
        editable,
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getJSON());
            }
        },
        editorProps: {
            attributes: {
                class: "prose prose-slate max-w-none min-h-[350px] p-4 focus:outline-none",
            },
        },
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            alert("Hanya file JPG, PNG, WEBP, atau GIF yang didukung.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Ukuran file maksimal adalah 2MB.");
            return;
        }

        setIsUploadingImage(true);
        try {
            const ext = file.name.split(".").pop();
            const filePath = `blog/${articleId}/${crypto.randomUUID()}.${ext}`;

            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file);

            if (error) {
                alert(`Gagal upload gambar: ${error.message}`);
            } else if (data) {
                const url = getPublicUrl(data.path);
                if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                }
            }
        } catch (err: any) {
            alert(err.message || "Gagal mengunggah gambar");
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (!editor) {
        return (
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 text-center text-slate-400 text-sm">
                Memuat editor...
            </div>
        );
    }

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
            {editable && (
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("bold")
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Tebal (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("italic")
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Miring (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("heading", { level: 2 })
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("heading", { level: 3 })
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("bulletList")
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Daftar Poin"
                    >
                        <List className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("orderedList")
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Daftar Angka"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`p-1.5 rounded text-xs font-medium transition-colors ${editor.isActive("blockquote")
                                ? "bg-blue-100 text-blue-800"
                                : "text-slate-600 hover:bg-slate-200"
                            }`}
                        title="Kutipan (Quote)"
                    >
                        <Quote className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                    />

                    <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                        title="Sisipkan Gambar (Maks. 2MB)"
                    >
                        {isUploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                            <ImageIcon className="w-4 h-4" />
                        )}
                        <span className="text-xs hidden sm:inline">Sisipkan Gambar</span>
                    </button>
                </div>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}
