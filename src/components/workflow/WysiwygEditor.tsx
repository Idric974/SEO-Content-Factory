"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkdownFromEditor(editor: any): string {
  return editor.storage.markdown.getMarkdown() as string;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  label?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

export default function WysiwygEditor({
  value,
  onChange,
  readOnly = false,
  label = "Résultat",
}: WysiwygEditorProps) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true;
      const md = getMarkdownFromEditor(ed);
      onChange(md);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  // Sync readOnly state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync external content changes (e.g. streaming generation)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentMd = getMarkdownFromEditor(editor);
    if (value !== currentMd) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  const toggleHeading = useCallback(
    (level: 1 | 2 | 3 | 4 | 5 | 6) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  if (!value && !editor?.getText()) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {/* Toolbar */}
        {!readOnly && editor && (
          <div className="flex flex-wrap items-center gap-0.5 border-b px-4 py-2">
            {/* Headings */}
            <ToolbarButton
              onClick={() => toggleHeading(1)}
              isActive={editor.isActive("heading", { level: 1 })}
              title="Titre 1 (H1)"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => toggleHeading(2)}
              isActive={editor.isActive("heading", { level: 2 })}
              title="Titre 2 (H2)"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => toggleHeading(3)}
              isActive={editor.isActive("heading", { level: 3 })}
              title="Titre 3 (H3)"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => toggleHeading(4)}
              isActive={editor.isActive("heading", { level: 4 })}
              title="Titre 4 (H4)"
            >
              <Heading4 className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Gras"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italique"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Liste à puces"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Liste numérotée"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Blockquote */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title="Citation"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Annuler"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Rétablir"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}

        {/* Editor */}
        <div className="px-2 pb-4">
          <EditorContent editor={editor} />
        </div>
      </CardContent>
    </Card>
  );
}
