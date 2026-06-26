/**
 * Tavily API Integration Wrapper
 * Used to discover live sources and retrieve grounded source content.
 */

export interface TavilySearchResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    rawContent?: string;
    score: number;
  }>;
}

/** Single extracted document returned by `extractUrlWithTavily`. */
export interface TavilyExtractedDocument {
  url: string;
  title: string;
  /** Cleaned page content (markdown by default). */
  content: string;
  /** Raw content as returned by Tavily (markdown or plain text). */
  rawContent: string;
  images?: string[];
  favicon?: string;
}

/** Raw shape of a `POST /extract` response (parsed defensively). */
interface TavilyExtractApiResponse {
  results?: Array<{
    url?: string;
    title?: string;
    raw_content?: string;
    content?: string;
    images?: string[];
    favicon?: string;
  }>;
  failed_results?: Array<{ url?: string; error?: string }>;
}

export interface TavilyExtractOptions {
  /** "basic" (fast) or "advanced" (JS-rendered pages, tables, more data). */
  extractDepth?: "basic" | "advanced";
  /** Output format of the extracted content. Defaults to "markdown". */
  format?: "markdown" | "text";
  /** Include extracted image URLs. */
  includeImages?: boolean;
  /** Include the site favicon URL. */
  includeFavicon?: boolean;
}

function getTavilyApiKey(): string {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set in environment variables");
  }
  return apiKey;
}

/**
 * Extract cleaned content from one or more URLs via the Tavily Extract API
 * (`POST https://api.tavily.com/extract`). Tavily removes boilerplate
 * (nav/ads/footers) and returns LLM-ready markdown.
 *
 * Request body: { api_key, urls: string[], extract_depth, format, ... }
 * Response: { results: [{ url, title?, raw_content, images?, favicon? }], failed_results: [...] }
 */
export async function extractUrls(
  urls: string[],
  options?: TavilyExtractOptions
): Promise<TavilyExtractedDocument[]> {
  const apiKey = getTavilyApiKey();

  if (urls.length === 0) return [];

  const response = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      api_key: apiKey,
      urls,
      extract_depth: options?.extractDepth || "basic",
      format: options?.format || "markdown",
      include_images: options?.includeImages || false,
      include_favicon: options?.includeFavicon || false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily Extract API error: ${response.status} - ${errorBody}`);
  }

  const data = (await response.json()) as TavilyExtractApiResponse;
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r) => {
    const url = r.url ?? "";
    const rawContent = r.raw_content ?? r.content ?? "";
    return {
      url,
      title: r.title?.trim() || url,
      content: rawContent,
      rawContent,
      images: r.images,
      favicon: r.favicon,
    };
  });
}

/**
 * Extract cleaned content from a single URL via Tavily Extract.
 * Throws a clear error if the URL could not be extracted.
 */
export async function extractUrlWithTavily(
  url: string,
  options?: TavilyExtractOptions
): Promise<TavilyExtractedDocument> {
  const [doc] = await extractUrls([url], options);
  if (!doc) {
    throw new Error(`Tavily Extract returned no content for URL: ${url}`);
  }
  return doc;
}

export async function searchEventsWithTavily(
  query: string,
  options?: {
    searchDepth?: "basic" | "advanced";
    maxResults?: number;
    includeRawContent?: boolean;
  }
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set in environment variables");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth || "basic",
      max_results: options?.maxResults || 5,
      include_raw_content: options?.includeRawContent || false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}
