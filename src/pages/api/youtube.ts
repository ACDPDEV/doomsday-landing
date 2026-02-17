import type { APIRoute } from "astro";

// Cache simple en memoria (considera Redis en producción)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Validar formato de videoId de YouTube
function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export const GET: APIRoute = async ({ url }) => {
  const videoId = url.searchParams.get("id");

  console.log("Received videoId:", videoId);
  console.log("Full URL:", url.href);

  if (!videoId) {
    return new Response(JSON.stringify({ error: "No video ID provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validar formato del videoId
  if (!isValidYouTubeId(videoId)) {
    return new Response(JSON.stringify({ error: "Invalid video ID format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verificar caché
  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const apiKey = import.meta.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.warn("YOUTUBE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          views: 0,
          likes: 0,
          error: "API key not configured",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`,
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const stats = data.items[0].statistics;
      const result = {
        views: parseInt(stats.viewCount) || 0,
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0,
      };

      // Guardar en caché
      cache.set(videoId, { data: result, timestamp: Date.now() });

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // 5 min
          "X-Cache": "MISS",
        },
      });
    }

    // Video no encontrado
    return new Response(
      JSON.stringify({
        error: "Video not found",
        views: 0,
        likes: 0,
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("YouTube API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Si el fetch fue abortado por timeout
    if (errorMessage.includes("aborted")) {
      return new Response(
        JSON.stringify({
          error: "Request timeout",
          views: 0,
          likes: 0,
        }),
        {
          status: 504,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Failed to fetch video statistics",
        views: 0,
        likes: 0,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
