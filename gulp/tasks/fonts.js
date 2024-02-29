import fs from 'fs';
import fonter from 'gulp-fonter';
import ttf2woff2 from 'gulp-ttf2woff2';
import ttf2woff from 'gulp-ttf2woff';

const FONT_WEIGHT = {
  thin: 'thin',
  extralight: 'extralight',
  light: 'light',
  medium: 'medium',
  semibold: 'semibold',
  bold: 'bold',
  extrabold: 'extrabold',
  heavy: 'heavy',
  black: 'black',
};

const WEIGHT_CODE = {
  thin: 100,
  extralight: 200,
  light: 300,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  heavy: 800,
  black: 900,
  regular: 400,
};

const CSS_FONT_STYLE = {
  normal: 'normal',
  italic: 'italic',
  oblique: 'oblique',
};

export const otfToTtf = () => (app.gulp.src(`${app.path.srcFolder}/fonts/*.otf`)
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'FONTS - otfToTtf',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(fonter({
    formats: ['ttf'],
  }))
  .pipe(app.gulp.dest(`${app.path.srcFolder}/fonts/`))
)

export const ttfToWoff = () => (app.gulp.src(`${app.path.srcFolder}/fonts/*.ttf`)
  .pipe(app.plugins.plumber(
    app.plugins.notify.onError({
      title: 'FONTS - ttfToWoff',
      message: '<%= error.message %>'
    })
  ))
  .pipe(ttf2woff())
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.fonts : app.path.build.fonts))
  .pipe(app.gulp.src(`${app.path.srcFolder}/fonts/*.ttf`))
  .pipe(ttf2woff2())
  .pipe(app.gulp.dest(app.isGitPages ? app.path.docs.fonts : app.path.build.fonts))
)

export const fontStyles = (done) => {
  const fontsFile = `${app.path.srcFolder}/scss/fonts.scss`;

  if (fs.existsSync(fontsFile)) {
    console.log('\n The file scss/fonts.scss exists.\n if you want to update the fonts.\n then delete this file (scss/fonts.scss)');
    return done();
  }

  const destFolder = app.isGitPages ? app.path.docs.fonts : app.path.build.fonts;

  fs.readdir(destFolder, (err, fontsFiles) => {
    if (fontsFiles) {
      // create fonts style file (CSS-file)
      fs.writeFile(fontsFile, '', () => { });

      let newFileOnly;
      for (let i = 0; i < fontsFiles.length; i++) {
        const fontFileName = fontsFiles[i].split('.')[0];

        if (newFileOnly !== fontFileName) {
          const fontName = fontFileName.split('-')[0] ?
            fontFileName.split('-')[0] : fontFileName;
          let fontWeight = fontFileName.split('-')[1] ?
            fontFileName.split('-')[1].toLowerCase() : fontFileName.toLowerCase();
          let fontStyle = 'normal';

          // determine font style
          if (fontWeight.includes(CSS_FONT_STYLE.italic)) {
            fontStyle = CSS_FONT_STYLE.italic;
          } else if (fontWeight.includes(CSS_FONT_STYLE.oblique)) {
            fontStyle = CSS_FONT_STYLE.oblique;
          }

          // determine font-weight code
          if (FONT_WEIGHT[fontWeight]) {
            fontWeight = WEIGHT_CODE[fontWeight];
          } else {
            fontWeight = WEIGHT_CODE.regular;
          }

          fs.appendFile(
            fontsFile,
            `@font-face {\n\tfont-family: ${fontName}, sans-serif;\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontFileName}.woff2") format("woff2"), url("../fonts/${fontFileName}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: ${fontStyle};\n\t}\r\n`,
            () => { }
          );

          newFileOnly = fontFileName;
        }
      }
    }
  });

  return done();
}
