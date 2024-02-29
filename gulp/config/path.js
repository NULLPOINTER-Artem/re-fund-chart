import * as nodePath from 'path';

const rootFolder = nodePath.basename(nodePath.resolve())

const buildFolder = './dist';
const srcFolder = './src';
const githubDocPagesFolder = './docs';

export const path = {
  build: {
    js: `${buildFolder}/js/`,
    css: `${buildFolder}/css/`,
    html: `${buildFolder}/`,
    images: `${buildFolder}/images/`,
    fonts: `${buildFolder}/fonts/`,
  },
  docs: {
    js: `${githubDocPagesFolder}/js/`,
    css: `${githubDocPagesFolder}/css/`,
    html: `${githubDocPagesFolder}/`,
    images: `${githubDocPagesFolder}/images/`,
    fonts: `${githubDocPagesFolder}/fonts/`,
  },
  src: {
    js: `${srcFolder}/js/app.js`,
    scss: `${srcFolder}/scss/styles.scss`,
    html: `${srcFolder}/html/*.pug`,
    images: `${srcFolder}/images/*.{jpg,jpeg,png,gif,webp,ico}`,
    svg: `${srcFolder}/images/**/*.svg`,
    'svg-icons': `${srcFolder}/images/icons/icons.svg`,
  },
  watch: {
    js: `${srcFolder}/js/**/*.js`,
    scss: `${srcFolder}/scss/**/*.scss`,
    html: `${srcFolder}/html/**/*.pug`,
    images: `${srcFolder}/images/**/*.{jpg,jpeg,png,gif,webp,ico}`,
    'svg-icons': `${srcFolder}/images/**/*.svg`,
  },
  buildFolder,
  githubDocPagesFolder,
  srcFolder,
  rootFolder,
  ftp: '', // a folder on FTP server (may be empty)
};
