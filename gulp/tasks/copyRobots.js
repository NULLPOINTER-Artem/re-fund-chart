export const copyRobots = () => (
  app.gulp.src('./robots.txt')
    .pipe(app.plugins.plumber(
      app.plugins.notify.onError({
        title: 'COPY ROBOTS',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(app.gulp.dest(`${app.isGitPages ? app.path.githubDocPagesFolder : app.path.buildFolder}/`))
);
