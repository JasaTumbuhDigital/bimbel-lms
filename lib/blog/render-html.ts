import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";

// Custom node 'image' agar saat dirender ke HTML publik menghasilkan wrapper flexbox dan style valid
const ResizableImage = ImageResize.extend({
    name: "image",
    renderHTML({ HTMLAttributes }) {
        const { containerStyle, wrapperStyle, style, ...rest } = HTMLAttributes;

        // Deteksi perataan (alignment) dari containerStyle yang disimpan tiptap-extension-resize-image
        const targetStyle = `${containerStyle || ""} ${style || ""}`.toLowerCase();
        let justify = "flex-start";
        let wrapperCss = "display: flex; width: 100%; margin: 1.5rem 0;";

        if (targetStyle.includes("margin: 0 auto") || targetStyle.includes("margin: 0px auto")) {
            justify = "center";
            wrapperCss += " justify-content: center;";
        } else if (targetStyle.includes("0 0 0 auto") || targetStyle.includes("0px 0px 0px auto")) {
            justify = "flex-end";
            wrapperCss += " justify-content: flex-end;";
        } else if (wrapperStyle?.includes("float: left") || targetStyle.includes("float: left")) {
            wrapperCss = "float: left; margin-right: 1.5rem; margin-bottom: 1rem;";
        } else if (wrapperStyle?.includes("float: right") || targetStyle.includes("float: right")) {
            wrapperCss = "float: right; margin-left: 1.5rem; margin-bottom: 1rem;";
        } else {
            wrapperCss += " justify-content: flex-start;";
        }

        // Gabungkan style asli (width, dsb) ke style standar tag <img>
        const imgStyleParts: string[] = [];
        if (containerStyle) imgStyleParts.push(containerStyle);
        if (style) imgStyleParts.push(style);
        imgStyleParts.push("max-width: 100%; height: auto;");

        return [
            "div",
            { class: "article-image-container", style: wrapperCss },
            [
                "img",
                {
                    ...rest,
                    style: imgStyleParts.join("; "),
                },
            ],
        ];
    },
});

const blogTipTapExtensions = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
            autolink: true,
            HTMLAttributes: {
                class: "text-blue-600 underline hover:text-blue-800 transition-colors",
                target: "_blank",
                rel: "noopener noreferrer",
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
];

/**
 * Render JSON TipTap ke HTML aman untuk halaman publik.
 * TSD §5.3 & Edge Case §6 poin 8 (dibungkus try-catch fallback).
 */
export function renderArticleContentToHtml(contentJson: any): string {
    if (!contentJson || typeof contentJson !== "object" || Object.keys(contentJson).length === 0) {
        return "<p class='text-slate-400 italic'>Konten belum ditulis.</p>";
    }

    try {
        return generateHTML(contentJson, blogTipTapExtensions);
    } catch (error) {
        console.error("Error generating HTML from TipTap JSON:", error);
        return "<div class='bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm italic'>Konten tidak dapat ditampilkan karena format tidak valid.</div>";
    }
}
