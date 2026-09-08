import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  SearchYouTubeQueryParams,
  SearchYouTubeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type VideoItem = {
  id?: string;
  statistics?: { viewCount?: string };
};

const cleanTitle = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

router.get("/youtube/search", async (req, res) => {
  const parsed = SearchYouTubeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "A song search query is required." });
    return;
  }

  const { q, artist, hookStep } = parsed.data;
  const query = [q, artist, hookStep].filter(Boolean).join(" ");

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "12");
    searchUrl.searchParams.set("order", "relevance");

    const searchResponse = await connectors.proxy(
      "youtube",
      `${searchUrl.pathname}${searchUrl.search}`,
      { method: "GET" },
    );
    if (!searchResponse.ok) {
      const body = await searchResponse.text();
      req.log.error({ status: searchResponse.status, body }, "YouTube search failed");
      res.status(502).json({ error: "YouTube search is temporarily unavailable." });
      return;
    }

    const searchPayload = (await searchResponse.json()) as { items?: SearchItem[] };
    const searchItems = (searchPayload.items ?? []).filter(
      (item): item is SearchItem & { id: { videoId: string } } =>
        Boolean(item.id?.videoId && item.snippet?.title),
    );
    const ids = searchItems.map((item) => item.id.videoId);

    let viewCounts = new Map<string, number>();
    if (ids.length > 0) {
      const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      detailsUrl.searchParams.set("part", "statistics");
      detailsUrl.searchParams.set("id", ids.join(","));
      const detailsResponse = await connectors.proxy(
        "youtube",
        `${detailsUrl.pathname}${detailsUrl.search}`,
        { method: "GET" },
      );
      if (detailsResponse.ok) {
        const detailsPayload = (await detailsResponse.json()) as { items?: VideoItem[] };
        viewCounts = new Map(
          (detailsPayload.items ?? []).map((item) => [
            item.id ?? "",
            Number(item.statistics?.viewCount ?? 0),
          ]),
        );
      }
    }

    const candidates = searchItems
      .map((item, index) => {
        const title = cleanTitle(item.snippet?.title ?? "");
        const channelTitle = item.snippet?.channelTitle ?? "YouTube";
        const lower = `${title} ${channelTitle}`.toLowerCase();
        const officialBoost = /official|vevo|music video|audio/.test(lower) ? 25 : 0;
        const viewCount = viewCounts.get(item.id.videoId) ?? 0;
        const popularityBoost = Math.min(25, Math.log10(viewCount + 1) * 2.4);
        const positionPenalty = index * 1.8;
        const relevanceScore = Math.max(
          0,
          Math.min(99.9, 50 + officialBoost + popularityBoost - positionPenalty),
        );

        return {
          videoId: item.id.videoId,
          title,
          channelTitle,
          thumbnailUrl:
            item.snippet?.thumbnails?.high?.url ??
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
          publishedAt: item.snippet?.publishedAt ?? new Date(0).toISOString(),
          viewCount,
          relevanceScore: Number(relevanceScore.toFixed(1)),
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 6);

    if (candidates.length === 0) {
      res.status(502).json({ error: "No matching YouTube videos were found." });
      return;
    }

    res.json(
      SearchYouTubeResponse.parse({
        query,
        source: "YouTube Data API",
        selected: candidates[0],
        candidates,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "YouTube integration error");
    res.status(502).json({ error: "YouTube search is temporarily unavailable." });
  }
});

export default router;