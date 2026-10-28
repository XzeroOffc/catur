import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/vendor',{recursive:true});
await copyFile('node_modules/chess.js/dist/esm/chess.js','public/vendor/chess.js');
