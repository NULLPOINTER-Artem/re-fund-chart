import svgSprite from "gulp-svg-sprite";
import svgmin from 'gulp-svgmin';

export const buildSvgSprite = () => (
  app.gulp.src([app.path.src.svg, `!${app.path.src['svg-icons']}`])
    // minify svg
    .pipe(svgmin({
      js2svg: {
        pretty: true,
      },
    }))
    // build svg sprite
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: '../images/icons/icons.svg',
        },
      },
    }))
    .pipe(app.gulp.dest(`${app.path.srcFolder}/`))
);
