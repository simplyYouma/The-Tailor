const fs = require('fs');
const path = require('path');

const fixSvg = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Zoom in the scissors (change matrix)
    content = content.replace(
        /matrix\([0-9\.\-]+, 0, 0, [0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+\)/,
        'matrix(1.3, 0, 0, 1.3, -635.8, -356.3)'
    );
    
    // Remove the white background rects if they exist
    content = content.replace(/<rect[^>]*fill=\"#ffffff\"[^>]*\/>/g, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
};

fixSvg(path.join(__dirname, 'public/logo.svg'));
fixSvg(path.join(__dirname, 'public/logo_nobg.svg'));
