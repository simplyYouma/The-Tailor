const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');

function generate() {
    const svgContent = fs.readFileSync(path.join(__dirname, 'public/logo_nobg.svg'), 'utf8');
    const match = svgContent.match(/data:image\/png;base64,([^\"]+)\"/);
    if (!match) {
        console.error("No base64 match found!");
        return;
    }
    const b64Data = match[1];

    const img = new Image();
    img.onload = () => {
        const SIZE = 1024;
        const canvas = createCanvas(SIZE, SIZE);
        const ctx = canvas.getContext('2d');
        
        // Ensure transparent canvas background
        ctx.clearRect(0, 0, SIZE, SIZE);

        // Draw perfect dark circle
        ctx.fillStyle = '#0a0a0a'; // very dark grey/black
        ctx.beginPath();
        ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.clip(); // Ensure nothing goes outside this circle

        // Calculate scaling for scissors
        const scale = 2.5; // Very large scale as requested
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (SIZE - dw) / 2;
        const dy = (SIZE - dh) / 2;

        // Process image to remove white backgrounds
        const tempCanvas = createCanvas(dw, dh);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, dw, dh);
        
        const imgData = tempCtx.getImageData(0, 0, dw, dh);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            // White or near-white removal to clear square backgrounds
            if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) {
                data[i+3] = 0; // set alpha to 0
            }
        }
        tempCtx.putImageData(imgData, 0, 0);

        // Draw the cleaned image on the beautiful circle
        ctx.drawImage(tempCanvas, dx, dy);

        // Save
        const outPath = path.join(__dirname, 'src-tauri/icons/icon.png');
        fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
        console.log("Successfully generated perfect transparent-edged icon with black circular background and larger scissors.");
    };
    img.src = 'data:image/png;base64,' + b64Data;
}

generate();
