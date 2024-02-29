import webpHtmlNoSvg from 'gulp-webp-html-nosvg';
import versionNumber from 'gulp-version-number';
import pug from 'gulp-pug';

export const html = () => (app.gulp.src(app.path.src.html)
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'HTML',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(pug({
    pretty: app.isDev,
    verbose: true
  }))
  .pipe(app.plugins.replace(/@images\//g, 'images/'))
  .pipe(
    app.plugins.if(
      app.isProd,
      webpHtmlNoSvg()
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      versionNumber({
        value: '%DT%',
        append: {
          key: '_v',
          cover: 0,
          to: [
            'css',
            'js'
          ]
        },
        output: {
          file: 'gulp/version.json'
        }
      })
    )
  )
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.html : app.path.build.html))
  .pipe(app.plugins.browserSync.stream())
)
