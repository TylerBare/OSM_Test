/* eslint-disable no-console */
import chalk from 'chalk';
import concat from 'concat-files';
import { glob } from 'glob';
import fs from 'node:fs';
import postcss from 'postcss';
import prepend from 'postcss-selector-prepend';
import autoprefixer from 'autoprefixer';


let _currBuild = null;

// if called directly, do the thing.
if (process.argv[1].indexOf('build_css.js') > -1) {
  buildCSS();
}

export function buildCSS() {
  if (_currBuild) return _currBuild;

  const START = '🏗   ' + chalk.yellow('Building css...');
  const END = '👍  ' + chalk.green('css built');

  console.log('');
  console.log(START);
  console.time(END);

  return _currBuild = glob('css/**/*.css')
    .then(files => doConcat(files.sort(), 'dist/rapid.css'))
    .then(() => {
      const css = fs.readFileSync('dist/rapid.css', 'utf8');
      return postcss([ autoprefixer, prepend({ selector: '.ideditor ' }) ])
        .process(css, { from: 'dist/rapid.css', to: 'dist/rapid.css' });
    })
    .then(result => fs.writeFileSync('dist/rapid.css', result.css))
    .then(() => {
      console.timeEnd(END);
      console.log('');
      _currBuild = null;
    })
    .catch(err => {
      console.error(err);
      console.log('');
      _currBuild = null;
      process.exit(1);
    });
}


function doConcat(files, output) {
  return new Promise((resolve, reject) => {
    concat(files, output, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
