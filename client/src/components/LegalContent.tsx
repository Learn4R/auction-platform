// A deliberately small renderer for the plain-text formatting convention
// legal page content is authored in: "## " headings, "- " bullet lists, and
// blank-line-separated paragraphs. Avoids pulling in a full markdown parser
// for five short static pages.
export function LegalContent({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="mt-4 font-display text-xl font-medium text-royal first:mt-0">
              {block.slice(3)}
            </h2>
          )
        }

        const lines = block.split('\n').map((l) => l.trim())
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-charcoal">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={i} className="text-[14.5px] leading-relaxed text-charcoal">
            {block}
          </p>
        )
      })}
    </div>
  )
}
