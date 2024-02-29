import vinylFTP from 'vinyl-ftp';
import util from 'gulp-util';

import { configFTP } from '../config/ftp.js';

export const ftp = () => {
  configFTP.log = util.log;
  const ftpConnect = vinylFTP.create(configFTP);

  return app.gulp.src(`${app.path.buildFolder}/**/*.*`)
    .pipe(app.plugins.plumber(
      app.plugins.notify.onError({
        title: 'FTP',
        message: 'Error: <%= error.message %>',
      })
    ))
    .pipe(
      app.plugins.if(
        app.path.ftp && app.path.ftp.length, ftpConnect.dest(`/${app.path.ftp}/${app.path.rootFolder}`),
        ftpConnect.dest(`/${app.path.rootFolder}`)
      )
    );
}
