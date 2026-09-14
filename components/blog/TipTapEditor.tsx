"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import { useRef, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { STORAGE_BUCKET, getPublicUrl } from "@/lib/supabase-storage";
import {
    Undo2,
    Redo2,
    Heading,
    List,
    ListOrdered,
    Quote,
    SquareCode,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Underline as UnderlineIcon,
    Link as LinkIcon,
    Superscript as SuperscriptIcon,
    Subscript as SubscriptIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    ImagePlus,
    ChevronDown,
    Loader2
} from "lucide-react";

// Alias nama extension agar cocok dengan node type 'image' yang sudah tersimpan di database
const ResizableImage = ImageResize.extend({
    name: "image",
});

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
    const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false);
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

    const headingRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Menutup dropdown jika user klik di luar area toolbar dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (headingRef.current && !headingRef.current.contains(event.target as Node)) {
                setIsHeadingDropdownOpen(false);
            }
            if (listRef.current && !listRef.current.contains(event.target as Node)) {
                setIsListDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: {
                    openOnClick: false,
                    autolink: true,
                    HTMLAttributes: {
                        class: "text-blue-600 underline cursor-pointer",
                    },
                },
                underline: {},
            }),
            Superscript,
            Subscript,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            ResizableImage.configure({
                inline: false,
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
                class: "prose prose-slate max-w-none min-h-full p-6 focus:outline-none",
                spellcheck: "false",
            },
        },
    });

    useEffect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    const handleSetLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("Masukkan URL Link (contoh: https://contoh.com):", previousUrl);

        if (url === null) return; // User tekan Cancel

        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };

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

    const btnClass = (isActive: boolean) =>
        `p-1.5 rounded transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ${isActive ? "bg-zinc-700/80 text-white" : ""
        }`;

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 flex flex-col h-187.5 max-h-[85vh]">
            {editable && (
                <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-1 items-center justify-center text-zinc-300 select-none sticky top-0 z-20">
                    {/* Grup 1: Undo & Redo */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-zinc-700/70 mx-1" />

                    {/* Grup 2: Dropdown Heading */}
                    <div className="relative" ref={headingRef}>
                        <button
                            type="button"
                            onClick={() => setIsHeadingDropdownOpen(!isHeadingDropdownOpen)}
                            className={`px-1.5 py-1 rounded flex items-center gap-1 text-xs font-semibold hover:bg-zinc-800 ${editor.isActive("heading") ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                                }`}
                            title="Format Heading"
                        >
                            <Heading className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {isHeadingDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-30 min-w-36">
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().setParagraph().run();
                                        setIsHeadingDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 ${editor.isActive("paragraph") ? "text-blue-400 font-semibold" : "text-zinc-200"
                                        }`}
                                >
                                    Paragraph (Normal)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                                        setIsHeadingDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-sm font-bold hover:bg-zinc-700 ${editor.isActive("heading", { level: 1 }) ? "text-blue-400 font-bold" : "text-zinc-200"
                                        }`}
                                >
                                    Heading 1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                                        setIsHeadingDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-zinc-700 ${editor.isActive("heading", { level: 2 }) ? "text-blue-400 font-bold" : "text-zinc-200"
                                        }`}
                                >
                                    Heading 2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 3 }).run();
                                        setIsHeadingDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 ${editor.isActive("heading", { level: 3 }) ? "text-blue-400 font-bold" : "text-zinc-200"
                                        }`}
                                >
                                    Heading 3
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Grup 2: Dropdown Lists */}
                    <div className="relative" ref={listRef}>
                        <button
                            type="button"
                            onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                            className={`px-1.5 py-1 rounded flex items-center gap-1 text-xs hover:bg-zinc-800 ${editor.isActive("bulletList") || editor.isActive("orderedList")
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:text-white"
                                }`}
                            title="Format Daftar (List)"
                        >
                            <List className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {isListDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-30 min-w-36">
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleBulletList().run();
                                        setIsListDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2 ${editor.isActive("bulletList") ? "text-blue-400 font-semibold" : "text-zinc-200"
                                        }`}
                                >
                                    <List className="w-3.5 h-3.5" /> Bullet List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleOrderedList().run();
                                        setIsListDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2 ${editor.isActive("orderedList") ? "text-blue-400 font-semibold" : "text-zinc-200"
                                        }`}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" /> Numbered List
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Blockquote */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={btnClass(editor.isActive("blockquote"))}
                        title="Kutipan (Quote)"
                    >
                        <Quote className="w-4 h-4" />
                    </button>

                    {/* Code Block */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={btnClass(editor.isActive("codeBlock"))}
                        title="Blok Kode (Code Block)"
                    >
                        <SquareCode className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-zinc-700/70 mx-1" />

                    {/* Grup 3: Formatting Teks */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={btnClass(editor.isActive("bold"))}
                        title="Tebal (Bold)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={btnClass(editor.isActive("italic"))}
                        title="Miring (Italic)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={btnClass(editor.isActive("strike"))}
                        title="Coret (Strikethrough)"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={btnClass(editor.isActive("code"))}
                        title="Kode Baris (Inline Code)"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={btnClass(editor.isActive("underline"))}
                        title="Garis Bawah (Underline)"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleSetLink}
                        className={btnClass(editor.isActive("link"))}
                        title="Tautan / Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-zinc-700/70 mx-1" />

                    {/* Grup 4: Superscript & Subscript */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        className={btnClass(editor.isActive("superscript"))}
                        title="Pangkat Atas (Superscript)"
                    >
                        <SuperscriptIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleSubscript().run()}
                        className={btnClass(editor.isActive("subscript"))}
                        title="Indeks Bawah (Subscript)"
                    >
                        <SubscriptIcon className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-zinc-700/70 mx-1" />

                    {/* Grup 5: Text Align */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign("left").run()}
                        className={btnClass(editor.isActive({ textAlign: "left" }))}
                        title="Rata Kiri"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign("center").run()}
                        className={btnClass(editor.isActive({ textAlign: "center" }))}
                        title="Rata Tengah"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign("right").run()}
                        className={btnClass(editor.isActive({ textAlign: "right" }))}
                        title="Rata Kanan"
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                        className={btnClass(editor.isActive({ textAlign: "justify" }))}
                        title="Rata Kanan-Kiri (Justify)"
                    >
                        <AlignJustify className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-zinc-700/70 mx-1" />

                    {/* Grup 6: Add Image */}
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
                        className="px-2 py-1 rounded text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-1.5"
                        title="Sisipkan Gambar (Maks. 2MB)"
                    >
                        {isUploadingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        ) : (
                            <ImagePlus className="w-3.5 h-3.5" />
                        )}
                        <span>Add</span>
                    </button>
                </div>
            )}

            <div
                className="flex-1 overflow-y-auto min-h-0 bg-white cursor-text"
                onClick={() => {
                    if (editor && !editor.isFocused) {
                        editor.commands.focus();
                    }
                }}
            >
                <EditorContent editor={editor} className="min-h-full" />
            </div>
        </div>
    );
}
