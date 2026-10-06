const YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/;
const SPOTIFY_TRACK = /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})$/;
// An NRK TV programme page; the last path segment is the programme id.
const NRK_TV = /^https:\/\/tv\.nrk\.no\/(?:[\w-]+\/)+([A-Z]{4}\d{8})$/;

/**
 * How a media url shows, or null when it is not a kind the pages know: its kind
 * (video or track), the service it is on, and for YouTube a poster image. The
 * pages link to the url itself; nothing is embedded. The poster host must be in
 * the list pages' img-src (byjoba-iac, lib/web-stack.ts).
 */
export function mediaEmbed(url) {
  if (typeof url !== 'string') return null;
  const youtube = url.match(YOUTUBE);
  if (youtube) return { kind: 'video', service: 'YouTube', poster: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg` };
  if (NRK_TV.test(url)) return { kind: 'video', service: 'NRK TV' };
  if (SPOTIFY_TRACK.test(url)) return { kind: 'track', service: 'Spotify' };
  return null;
}
