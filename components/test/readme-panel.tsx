import { cn } from "@/lib/utils"

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    return <span key={index}>{part}</span>
  })
}

export function ReadmePanel({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const blocks = content.trim().split(/\n{2,}/)

  return (
    <article
      className={cn(
        "space-y-4 rounded-xl border bg-card p-4 text-sm text-card-foreground",
        className
      )}
    >
      {blocks.map((block, index) => {
        const trimmed = block.trim()

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={index} className="text-lg font-semibold">
              {trimmed.slice(2)}
            </h1>
          )
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} className="text-base font-medium">
              {trimmed.slice(3)}
            </h2>
          )
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={index} className="font-medium text-muted-foreground">
              {trimmed.slice(4)}
            </h3>
          )
        }

        if (trimmed.startsWith("```")) {
          const code = trimmed.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "")
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs"
            >
              {code}
            </pre>
          )
        }

        if (trimmed.split("\n").every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {trimmed.split("\n").map((line) => (
                <li key={line}>{renderInline(line.slice(2))}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="text-muted-foreground">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </article>
  )
}
