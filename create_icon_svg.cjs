const fs = require('fs');
const path = require('path');

const srcSvgPath = path.join(__dirname, 'public/logo_nobg.svg');
const outSvgPath = path.join(__dirname, 'src-tauri/icons/icon.svg');

if (fs.existsSync(srcSvgPath)) {
    let content = fs.readFileSync(srcSvgPath, 'utf8');
    
    // Extrait le contenu interne de <svg>
    const match = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (match) {
        let innerContent = match[1];
        
        // Agrandir un peu plus (si ce n'est pas déjà assez grand). La matrice précédente était 1.3, on peut passer à 1.45 pour bien remplir
        innerContent = innerContent.replace(
            /matrix\([0-9\.\-]+, 0, 0, [0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+\)/,
            'matrix(1.5, 0, 0, 1.5, -800, -500)'
        );
        
        // Supprimer d'éventuels fonds blancs restants (au cas où)
        innerContent = innerContent.replace(/<rect[^>]*fill=\"#ffffff\"[^>]*\/>/g, '');

        // Crée le nouveau SVG avec un fond noir parfait
        const newSvg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"1500\" height=\"1500\" viewBox=\"0 0 1500 1500\">
    <!-- Fond noir en cercle parfait -->
    <circle cx=\"750\" cy=\"750\" r=\"750\" fill=\"#000000\"/>
    <g transform=\"translate(50, 50) scale(0.95)\">
        ${innerContent}
    </g>
</svg>`;
        
        fs.writeFileSync(outSvgPath, newSvg);
        console.log(`Created ${outSvgPath}`);
    } else {
        console.log('Could not find SVG match');
    }
} else {
    console.log('Source file not found');
}
