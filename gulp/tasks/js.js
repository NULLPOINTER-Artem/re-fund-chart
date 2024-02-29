import path from 'path';
import webpack from 'webpack-stream';
import TerserPlugin from 'terser-webpack-plugin';

export const js = () => (app.gulp.src(app.path.src.js, { sourcemaps: app.isDev })
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'JS',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(webpack({
    mode: 'none', // for custom settings
    entry: app.path.src.js,
    output: {
      path: path.resolve(app.path.build.js),
      filename: 'app.min.js',
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/](node_modules)[\\/]/,
            filename: 'vendor.min.js',
          },
        },
      },
      minimize: app.isProd,
      minimizer: [new TerserPlugin()],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader'
          },
        }
      ],
    },
  }))
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.js : app.path.build.js))
  .pipe(app.plugins.browserSync.stream())
)
