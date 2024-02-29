import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import sassGlob from 'gulp-sass-glob';
import rename from 'gulp-rename';

import cleanCss from 'gulp-clean-css';
import webpCss from 'gulp-webpcss';
import autoPrefixer from 'gulp-autoprefixer';
import groupCssMediaQueries from 'gulp-group-css-media-queries';

const sass = gulpSass(dartSass);

export const scss = () => (app.gulp.src(app.path.src.scss, { sourcemaps: app.isDev })
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'CSS',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(sassGlob())
  .pipe(app.plugins.replace(/@images\//g, '../images/'))
  .pipe(sass.sync({
    outputStyle: 'expanded',
    sourceMap: app.isDev
  }))
  .pipe(
    app.plugins.if(
      app.isProd,
      groupCssMediaQueries()
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      webpCss({
        webpClass: '.webp',
        noWebpClass: '.no-webp'
      })
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      autoPrefixer({
        grid: 'autoplace',
        cascade: true
      })
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      cleanCss({
        processImport: true,
      })
    )
  )
  .pipe(rename({
    extname: '.min.css'
  }))
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.css : app.path.build.css))
  .pipe(app.plugins.browserSync.stream())
)
