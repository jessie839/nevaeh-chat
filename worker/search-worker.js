// Nevaeh Chat — Search Worker
// Deploy this to Cloudflare Workers (free tier)
// Set environment variable: TAVILY_API_KEY = your key from tavily.com

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { query } = await request.json();

      if (!query || query.trim().length === 0) {
        return jsonResponse({ error: "No query provided" }, 400);
      }

      // Call Tavily Search API
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query: query.trim(),
          search_depth: "basic",       // "basic" is free tier
          include_answer: true,         // Tavily gives a pre-summarized answer too
          include_raw_content: false,
          max_results: 5,
        }),
      });

      if (!tavilyRes.ok) {
        const err = await tavilyRes.text();
        return jsonResponse({ error: `Tavily error: ${err}` }, 500);
      }

      const data = await tavilyRes.json();

      // Return clean, minimal payload to the browser
      return jsonResponse({
        answer: data.answer || null,
        results: (data.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 400) || "",
          published_date: r.published_date || null,
        })),
      });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
