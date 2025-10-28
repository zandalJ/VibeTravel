import { memo, useMemo, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const markdownComponents: Components = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-3xl font-semibold text-foreground" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-8 text-2xl font-semibold text-foreground" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 text-xl font-semibold text-foreground" {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="mt-6 text-lg font-semibold text-foreground" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="leading-relaxed text-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="ml-6 list-disc space-y-2" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="ml-6 list-decimal space-y-2" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="rounded bg-muted px-1 py-0.5 text-sm" {...props} />
  ),
  pre: ({ children, ...props }) => (
    <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed" {...props}>
      <code>{children}</code>
    </pre>
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/50" {...props} />
  ),
  tbody: (props: ComponentPropsWithoutRef<"tbody">) => (
    <tbody className="divide-y divide-border" {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => (
    <tr className="border-b border-border last:border-0" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-foreground" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="whitespace-pre-wrap px-4 py-2 align-top text-sm text-muted-foreground" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
};

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const safeContent = useMemo(() => content?.trim() ?? "", [content]);

  if (!safeContent) {
    return <p className="text-sm text-muted-foreground">Brak treści do wyświetlenia.</p>;
  }

  return (
    <div className={cn("prose prose-neutral max-w-none dark:prose-invert", "prose-headings:scroll-mt-24", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
        {safeContent}
      </ReactMarkdown>
    </div>
  );
});

