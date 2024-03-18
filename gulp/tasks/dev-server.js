import fs from 'fs';

// https://browsersync.io/docs/options
export const server = () => {
  app.plugins.browserSync.init({
    server: {
      baseDir: app.path.buildFolder, // base build dir
      // If index.html exist - open it, else show folder
      directory: !fs.existsSync(`${app.path.buildFolder}/index.html`),
      middleware(req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      },
    },
    injectChanges: false, // Don't try to inject CSS changes, just do a page refresh
    notify: false,
    minify: false, // Don't minify the client-side JS
    port: 5500, // localhost:8080
  })
}
