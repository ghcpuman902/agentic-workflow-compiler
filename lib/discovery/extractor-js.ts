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

  // Skip site chrome: nav/header/footer/aside menus are repeated DOM groups too,
  // but they are boilerplate, not the page's core records.
  const BOILERPLATE_TAGS = new Set(["NAV", "HEADER", "FOOTER", "ASIDE"]);
  const BOILERPLATE_ROLES = /^(navigation|banner|contentinfo|search|menu|menubar|tablist)$/i;
  const isBoilerplate = (el) => {
    let cur = el;
    while (cur && cur !== document.body) {
      if (BOILERPLATE_TAGS.has(cur.tagName)) return true;
      const role = cur.getAttribute && cur.getAttribute("role");
      if (role && BOILERPLATE_ROLES.test(role)) return true;
      cur = cur.parentElement;
    }
    return false;
  };

  // A group is "nav-like" when its items are mostly bare links with short text
  // and no real content (heading / time / image / paragraph) — i.e. menu items,
  // breadcrumbs or tag clouds rather than article/product/event records.
  const isNavLike = (nodes) => {
    let linkish = 0;
    for (const node of nodes) {
      const hasHeading = node.querySelector("h1,h2,h3,h4,h5,h6");
      const hasMedia = node.querySelector("img,time");
      const hasParagraph = node.querySelector("p");
      const anchor =
        node.tagName === "A" ? node : node.querySelector("a[href]");
      const text = (node.textContent || "").replace(/\\s+/g, " ").trim();
      if (anchor && !hasHeading && !hasMedia && !hasParagraph && text.length <= 40) {
        linkish++;
      }
    }
    return nodes.length > 0 && linkish / nodes.length >= 0.8;
  };

  const groups = [];
  const groupKeys = new Set();
  for (const parent of document.querySelectorAll("body *")) {
    if (isBoilerplate(parent)) continue;
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
      if (isNavLike(nodes)) continue;
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
