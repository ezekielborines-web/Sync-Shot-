// The four layouts. `cls` is the CSS class used for previews, `film` adds the film-strip look.
export const FRAMES = {
  vertical:   { name: 'Vertical film strip',   cols: 1, rows: 4, sw: 480, sh: 360, cls: 'fv', film: true },
  horizontal: { name: 'Horizontal film strip', cols: 4, rows: 1, sw: 480, sh: 360, cls: 'fh', film: true },
  window:     { name: 'Windowed',              cols: 2, rows: 2, sw: 480, sh: 360, cls: 'fw' },
  single:     { name: 'One large shot',        cols: 1, rows: 1, sw: 960, sh: 720, cls: 'fs' }
};
