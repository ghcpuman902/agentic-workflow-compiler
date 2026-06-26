/**
 * In-page JS run via agent-browser eval during deep inspect.
 * Returns JSON string; parsed server-side into semantic RepeatedGroups.
 */
export const EXTRACTOR_JS = `(() => {
  const types = new Set();
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const parsed = JSON.parse(s.textContent || "null");
      const walk = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (obj["@type"]) {
          const t = obj["@type"];
          if (Array.isArray(t)) t.forEach((x) => types.add(String(x)));
          else types.add(String(t));
        }
        for (const v of Object.values(obj)) {
          if (v && typeof v === "object") walk(v);
        }
      };
      if (Array.isArray(parsed)) parsed.forEach(walk);
      else walk(parsed);
    } catch {}
  });

  const groups = [];
  const groupKeys = new Set();
  for (const parent of document.querySelectorAll("body *")) {
    const children = [...parent.children];
    if (children.length < 3) continue;
    const byTag = new Map();
    for (const child of children) {
      const cls =
        child.className && typeof child.className === "string"
          ? child.className.split(/\\s+/).slice(0, 2).join(".")
          : "";
      const sig = child.tagName + (cls ? "." + cls : "");
      if (!byTag.has(sig)) byTag.set(sig, []);
      byTag.get(sig).push(child);
    }
    for (const [sig, nodes] of byTag.entries()) {
      if (nodes.length < 3) continue;
      const key = parent.tagName + ">" + sig + ":" + nodes.length;
      if (groupKeys.has(key)) continue;
      groupKeys.add(key);
      const sample = nodes[0];
      const fields = [];
      const heading = sample.querySelector("h1,h2,h3,h4,h5,h6");
      if (heading?.textContent?.trim()) {
        fields.push({
          name: "title",
          inferredType: "string",
          examples: [heading.textContent.trim().slice(0, 80)],
        });
      }
      const link = sample.querySelector("a[href]");
      if (link) {
        fields.push({
          name: "link",
          inferredType: "url",
          examples: [link.getAttribute("href") || ""],
        });
      }
      const timeEl = sample.querySelector("time");
      if (timeEl) {
        fields.push({
          name: "date",
          inferredType: "date",
          examples: [
            timeEl.getAttribute("datetime") || timeEl.textContent?.trim() || "",
          ],
        });
      }
      const img = sample.querySelector("img[alt]");
      if (img) {
        fields.push({
          name: "image",
          inferredType: "string",
          examples: [img.getAttribute("alt") || ""],
        });
      }
      const text = sample.textContent?.replace(/\\s+/g, " ").trim().slice(0, 120);
      if (text && !heading) {
        fields.push({
          name: "summary",
          inferredType: "string",
          examples: [text],
        });
      }
      groups.push({ count: nodes.length, sampleFields: fields.slice(0, 6) });
    }
  }

  groups.sort((a, b) => b.count - a.count);

  return JSON.stringify({
    title: document.title || undefined,
    structuredDataTypes: [...types],
    repeatedGroups: groups.slice(0, 5),
    headingCount: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
    paragraphCount: document.querySelectorAll("p").length,
    linkCount: document.querySelectorAll("a[href]").length,
    imageCount: document.querySelectorAll("img").length,
    textLength: (document.body?.innerText || "").replace(/\\s+/g, " ").trim().length,
    htmlLength: document.documentElement.outerHTML.length,
  });
})()`;
