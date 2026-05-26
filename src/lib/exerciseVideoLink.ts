/** YouTube (and youtu.be) links open as "Watch video"; other URLs are informational resources. */
export function isYoutubeVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

export function exerciseVideoLinkLabel(url: string): "Watch video" | "Resource" {
  return isYoutubeVideoUrl(url) ? "Watch video" : "Resource";
}
