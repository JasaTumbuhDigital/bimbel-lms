"use client";

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

export default function DocumentViewer({ url }: { url: string }) {
    const docs = [{ uri: url }];

    return (
        <div className="w-full h-full min-h-175 bg-white relative rounded-xl border border-slate-200 overflow-hidden doc-viewer-wrapper">
            <style dangerouslySetInnerHTML={{
                __html: `
                /* Sembunyikan control bar PDF bawaan agar lebih clean */
                .doc-viewer-wrapper #pdf-controls {
                    display: none !important;
                }
                /* Pastikan iframe PPT/Word mengambil full space dan hapus padding default */
                .doc-viewer-wrapper iframe {
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 700px;
                    background-color: transparent !important;
                }
                .doc-viewer-wrapper {
                    display: flex;
                    flex-direction: column;
                }
                #react-doc-viewer {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                }
            `}} />
            <DocViewer
                documents={docs}
                pluginRenderers={DocViewerRenderers}
                className="border-0 w-full h-full"
                style={{ height: '100%', minHeight: '700px', width: '100%' }}
                config={{
                    header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                    },
                    pdfVerticalScrollByDefault: true,
                    pdfZoom: {
                        defaultZoom: 1.1,
                        zoomJump: 0.2
                    }
                }}
            />
        </div>
    );
}
