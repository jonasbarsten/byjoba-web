const YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/;
const SPOTIFY_TRACK = /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})$/;

/**
 * What a media url embeds as, or null when it is not a kind the pages can embed.
 * YouTube goes through its no-cookie host.
 */
export function mediaEmbed(url) {
  if (typeof url !== 'string') return null;
  const video = url.match(YOUTUBE);
  if (video) return { kind: 'video', src: `https://www.youtube-nocookie.com/embed/${video[1]}` };
  const track = url.match(SPOTIFY_TRACK);
  if (track) return { kind: 'track', src: `https://open.spotify.com/embed/track/${track[1]}` };
  return null;
}
