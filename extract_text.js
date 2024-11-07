const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Définissez le chemin vers votre dossier PDF en utilisant path.join
const pdfFolder = path.join('C:', 'Users', 'mariu', 'OneDrive', 'Documents', 'Finopia', 'Projet_IA-PPV', 'Documentation');

const textOutputFolder = path.join(__dirname, 'text_documents');

// Affichez le chemin utilisé pour vérification
console.log(`Chemin du dossier PDF : ${pdfFolder}`);

// Vérifiez si le dossier existe
if (fs.existsSync(pdfFolder)) {
  console.log('Le dossier PDF existe.');
} else {
  console.error('Le dossier PDF n\'existe pas. Veuillez vérifier le chemin.');
  process.exit(1); // Arrêtez le script si le dossier n'existe pas
}

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(textOutputFolder)) {
  fs.mkdirSync(textOutputFolder);
  console.log(`Dossier de sortie créé : ${textOutputFolder}`);
} else {
  console.log(`Dossier de sortie existant : ${textOutputFolder}`);
}

// Lire le contenu du dossier PDF
fs.readdir(pdfFolder, (err, files) => {
  if (err) {
    console.error(`Erreur lors de la lecture du dossier PDF : ${err}`);
    return;
  }

  console.log(`Fichiers trouvés : ${files.join(', ')}`);

  if (files.length === 0) {
    console.log('Aucun fichier trouvé dans le dossier PDF.');
    return;
  }

  files.forEach(file => {
    if (path.extname(file).toLowerCase() === '.pdf') {
      const filePath = path.join(pdfFolder, file);
      console.log(`Traitement du fichier : ${filePath}`);

      // Lire le fichier PDF
      fs.readFile(filePath, (readErr, dataBuffer) => {
        if (readErr) {
          console.error(`Erreur lors de la lecture du fichier ${file} : ${readErr}`);
          return;
        }

        // Extraire le texte du PDF
        pdfParse(dataBuffer).then(data => {
          const text = data.text;
          const outputFilePath = path.join(textOutputFolder, file.replace('.pdf', '.txt'));
          fs.writeFile(outputFilePath, text, writeErr => {
            if (writeErr) {
              console.error(`Erreur lors de l'écriture du fichier texte pour ${file} : ${writeErr}`);
              return;
            }
            console.log(`Texte extrait et sauvegardé dans ${outputFilePath}`);
          });
        }).catch(parseErr => {
          console.error(`Erreur lors de l'extraction du texte de ${file} :`, parseErr);
        });
      });
    } else {
      console.log(`Fichier ignoré (non-PDF) : ${file}`);
    }
  });
});
