export const copySprite = () => (
  app.gulp.src(app.path.src['svg-icons'])
    .pipe(app.plugins.plumber(
      app.plugins.notify.onError({
        title: 'COPY SPRITE',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(app.gulp.dest(`${app.isGitPages ? app.path.docs.images : app.path.build.images}icons/`))
    .pipe(app.plugins.browserSync.stream())
);
