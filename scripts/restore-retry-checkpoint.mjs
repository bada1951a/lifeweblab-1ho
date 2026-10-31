import fs from 'node:fs';
import path from 'node:path';

const artifactDir = path.resolve(process.argv[2] || '.retry-checkpoint-artifact');
const artifactFile = path.join(artifactDir, '.publish-retry-queue.json');
const targetFile = path.resolve(process.argv[3] || '.publish-retry-queue.json');

if (!fs.existsSync(artifactFile)) {
  throw new Error('Downloaded artifact does not contain .publish-retry-queue.json.');
}

const raw = fs.readFileSync(artifactFile, 'utf8');
const envelope = JSON.parse(raw);
if (
  !envelope ||
  envelope.version !== 1 ||
  envelope.algorithm !== 'aes-256-gcm' ||
  !['salt', 'iv', 'tag', 'ciphertext'].every((field) => typeof envelope[field] === 'string')
) {
  throw new Error('Downloaded retry checkpoint has an unsupported or invalid envelope.');
}

const temporaryFile = `${targetFile}.${process.pid}.tmp`;
try {
  fs.writeFileSync(temporaryFile, raw, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporaryFile, targetFile);
} catch (error) {
  fs.rmSync(temporaryFile, { force: true });
  throw error;
}
console.log('Restored encrypted locale checkpoint artifact for generator validation.');
