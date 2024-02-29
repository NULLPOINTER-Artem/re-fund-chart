import gulp from 'gulp';
import { path } from './gulp/config/path.js';
import { plugins } from './gulp/config/plugins.js';

global.app = {
  isProd: process.argv.includes('--build'),
  isDev: !process.argv.includes('--build'),
  isGitPages: process.argv.includes('--git-pages'),
  gulp,
  path,
  plugins,
};

import { clean } from './gulp/tasks/clean.js';
import { html } from './gulp/tasks/html.js';
import { server } from './gulp/tasks/dev-server.js';
import { scss } from './gulp/tasks/scss.js';
import { js } from './gulp/tasks/js.js';
import { images } from './gulp/tasks/images.js';
import { otfToTtf, ttfToWoff, fontStyles } from './gulp/tasks/fonts.js';
import { zip } from './gulp/tasks/zip.js';
import { ftp } from './gulp/tasks/ftp.js';
import { buildSvgSprite } from './gulp/tasks/svg-sprite.js';
import { copySprite } from './gulp/tasks/copy-sprite.js';
import { copyRobots } from './gulp/tasks/copyRobots.js';

function watcher() {
  gulp.watch(path.watch.html, html); // html -> gulp.series(html, ftp) -> auto-deploy to the FTP server
  gulp.watch(path.watch.scss, scss);
  gulp.watch(path.watch.js, js);
  gulp.watch(path.watch.images, images);
  gulp.watch([path.watch['svg-icons'], `!${path.src['svg-icons']}`], gulp.series(buildSvgSprite, copySprite));
};

const fonts = gulp.series(otfToTtf, ttfToWoff, fontStyles);
const mainTasks = gulp.series(fonts, gulp.parallel(html, scss, js, gulp.series(images, gulp.series(buildSvgSprite, copySprite))));

const dev = gulp.series(clean, mainTasks, gulp.parallel(watcher, server));
export const build = gulp.series(clean, mainTasks, copyRobots);
export const deployZip = gulp.series(build, zip);
export const deployFtp = gulp.series(build, ftp);
export {
  buildSvgSprite,
  copyRobots,
  fonts
};

export default dev;
