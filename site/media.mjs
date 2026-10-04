const YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/;
const SPOTIFY_TRACK = /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})$/;
// An NRK TV programme page; the last path segment is the programme id.
const NRK_TV = /^https:\/\/tv\.nrk\.no\/(?:[\w-]+\/)+([A-Z]{4}\d{8})$/;

/**
 * What a media url embeds as, or null when it is not a kind the pages can embed.
 * YouTube goes through its no-cookie host. The hosts used here must also be in
 * the list pages' frame-src (byjoba-iac, lib/web-stack.ts).
 */
export function mediaEmbed(url) {
  if (typeof url !== 'string') return null;
  const youtube = url.match(YOUTUBE);
  if (youtube) return { kind: 'video', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` };
  const nrk = url.match(NRK_TV);
  if (nrk) return { kind: 'video', src: `https://static.nrk.no/ludo/latest/video-embed.html#id=${nrk[1]}` };
  const track = url.match(SPOTIFY_TRACK);
  if (track) return { kind: 'track', src: `https://open.spotify.com/embed/track/${track[1]}` };
  return null;
}
