import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';

export const images = () => (app.gulp.src(app.path.src.images)
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'IMAGES',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.images : app.path.build.images))

  // convert all images into .webp
  .pipe(
    app.plugins.if(
      app.isProd,
      webp()
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      app.gulp.dest(app.isGitPages ? app.path.docs.images : app.path.build.images)
    )
  )

  // optimization png, jpg and so on images
  .pipe(
    app.plugins.if(
      app.isProd,
      app.gulp.src(app.path.src.images)
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      app.plugins.newer(app.isGitPages ? app.path.docs.images : app.path.build.images)
    )
  )
  .pipe(
    app.plugins.if(
      app.isProd,
      imagemin({
        progressive: true,
        interlaced: true,
        optimizationLevel: 5,
        quality: 90,
        svgoPlugins: [{
          removeViewBox: false
        }]
      })
    )
  )
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.images : app.path.build.images))

  // output everything into server
  .pipe(app.plugins.browserSync.stream())
)
