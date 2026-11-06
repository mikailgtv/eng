'use strict';

// Narrow, offline config repair for EnglishLearning-Offline (Expo SDK 51).
// Does not install packages, change dependency manifests, contact EAS,
// edit database files, or remove any existing file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ICON = './assets/icon-square-v1.png';
const ICON_SHA256 = '360e01b31c255d3108b4cd221f4e26f1fd0095b4bb068cd795006c33d7da22a3';
const EXPECTED_NAME = 'englishlearning-offline';

function stop(message) {
  const error = new Error('Repair stopped');
  error.publicMessage = message;
  throw error;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRegular(filePath, label) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') stop(label + ' is missing. Stop and ask for help.');
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    stop(label + ' must be a regular file, not a link.');
  }
  return fs.readFileSync(filePath);
}

function parseJson(bytes, label) {
  try {
    const value = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (!isObject(value)) stop(label + ' must contain a JSON object.');
    return value;
  } catch (error) {
    if (error.publicMessage) throw error;
    stop(label + ' is not valid JSON. Its contents have not been printed.');
  }
}

function run() {
  const projectRoot = path.resolve(process.cwd());
  for (const file of ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs']) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      stop('A dynamic app config exists. This repair only supports the supplied app.json project.');
    }
  }

  // Snapshot exact bytes before making any change.
  const originals = new Map();
  for (const file of ['app.json', 'package.json', 'package-lock.json', 'eas.json']) {
    originals.set(file, readRegular(path.join(projectRoot, file), file));
  }
  const config = parseJson(originals.get('app.json'), 'app.json');
  const manifest = parseJson(originals.get('package.json'), 'package.json');
  parseJson(originals.get('package-lock.json'), 'package-lock.json');
  parseJson(originals.get('eas.json'), 'eas.json');

  if (manifest.name !== EXPECTED_NAME) {
    stop('This is not the expected EnglishLearning-Offline project folder.');
  }
  const installedExpo = parseJson(
    readRegular(path.join(projectRoot, 'node_modules', 'expo', 'package.json'), 'Installed Expo package'),
    'Installed Expo package'
  );
  if (!/^51\./.test(String(installedExpo.version))) {
    stop('Installed Expo is not SDK 51. Do not apply this version-specific repair.');
  }
  if (!isObject(config.expo) || !isObject(config.expo.android) ||
      !isObject(config.expo.android.adaptiveIcon)) {
    stop('The expected Android icon configuration is missing.');
  }
  const acceptedPaths = new Set(['./assets/icon.png', ICON]);
  if (!acceptedPaths.has(config.expo.icon) ||
      !acceptedPaths.has(config.expo.android.adaptiveIcon.foregroundImage)) {
    stop('A different icon is configured. The repair will not replace a custom icon.');
  }

  const image = readRegular(path.join(projectRoot, 'assets', 'icon-square-v1.png'), 'Square repair icon');
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (image.length < 33 || !image.subarray(0, 8).equals(pngSignature) ||
      image.toString('ascii', 12, 16) !== 'IHDR' ||
      image.readUInt32BE(16) !== 1024 || image.readUInt32BE(20) !== 1024 ||
      crypto.createHash('sha256').update(image).digest('hex') !== ICON_SHA256) {
    stop('The square repair icon is missing, modified, or not the expected 1024 x 1024 PNG.');
  }

  const stamp = new Date().toISOString().replace(/[-:.]/g, '') + '-' +
    process.pid + '-' + crypto.randomBytes(3).toString('hex');
  const backupName = 'EnglishLearning-Offline-before-doctor-v1-' + stamp;
  const backupRoot = path.join(path.dirname(projectRoot), backupName);

  // A new sibling directory keeps backups outside the EAS project upload.
  // Non-recursive mkdir and 'wx' writes never replace an existing backup.
  fs.mkdirSync(backupRoot);
  for (const [file, bytes] of originals) {
    const destination = path.join(backupRoot, file);
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    if (!fs.readFileSync(destination).equals(bytes)) {
      stop('Backup verification failed. Do not continue.');
    }
  }

  // Do not overwrite an editor or npm change made during backup preparation.
  for (const [file, bytes] of originals) {
    if (!readRegular(path.join(projectRoot, file), file).equals(bytes)) {
      stop('A project file changed during preparation. The backup is retained; stop here.');
    }
  }

  const alreadyConfigured = config.expo.icon === ICON &&
    config.expo.android.adaptiveIcon.foregroundImage === ICON;
  config.expo.icon = ICON;
  config.expo.android.adaptiveIcon.foregroundImage = ICON;

  if (!alreadyConfigured) {
    const updated = Buffer.from(JSON.stringify(config, null, 2) + '\n', 'utf8');
    const temporary = path.join(projectRoot, 'app.doctor-v1-' + stamp + '.tmp');
    fs.writeFileSync(temporary, updated, { flag: 'wx' });
    if (!fs.readFileSync(temporary).equals(updated)) {
      stop('Temporary config verification failed. The original config and backup are retained.');
    }
    if (!fs.readFileSync(path.join(projectRoot, 'app.json')).equals(originals.get('app.json'))) {
      stop('app.json changed during preparation. The repair will not replace it.');
    }
    // Rename is the only replacement operation, after verified versioned backup.
    fs.renameSync(temporary, path.join(projectRoot, 'app.json'));
    if (!fs.readFileSync(path.join(projectRoot, 'app.json')).equals(updated)) {
      stop('Final config verification failed. Keep the verified backup and ask for help.');
    }
  }

  for (const file of ['package.json', 'package-lock.json', 'eas.json']) {
    if (!fs.readFileSync(path.join(projectRoot, file)).equals(originals.get(file))) {
      stop('Another process changed a project file. Keep the backup and ask for help.');
    }
  }

  console.log('OK - square icon ready; backup verified.');
  console.log('Backup folder is beside the project folder: ' + backupName);
  console.log('Only the two icon paths in app.json were updated (or already correct).');
  console.log('Package versions and database files were NOT changed by this script.');
  console.log('Next: run the dependency commands in FIX_EXPO_DOCTOR_FA_v1.md, one at a time.');
}

try {
  run();
} catch (error) {
  const systemCode = typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? ' (' + error.code + ')'
    : '';
  console.error('STOP - ' + (error.publicMessage || 'A file operation failed' + systemCode + '.'));
  console.error('Do not continue to installation or build. Keep any backup that was created.');
  // Do not print raw exception messages, paths, config contents, or account data.
  process.exitCode = 1;
}
