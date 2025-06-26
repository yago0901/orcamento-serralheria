const fs = require('fs');
const path = require('path');

function deleteOldPdf(folder) {
  const files = fs.readdirSync(folder)
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(folder, f)).mtime.getTime()
    }))
    .sort((a, b) => a.time - b.time); // mais antigo primeiro

  if (files.length > 0) {
    const oldestPath = path.join(folder, files[0].name);
    fs.unlinkSync(oldestPath);
    console.log('Arquivo mais antigo removido:', files[0].name);
  }
}

module.exports = deleteOldPdf;
