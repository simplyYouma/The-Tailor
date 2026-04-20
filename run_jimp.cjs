const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function processLogo() {
    try {
        const svgPath = path.join(__dirname, 'public/logo_nobg.svg');
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        const match = svgContent.match(/data:image\/png;base64,([^\"]+)\"/);
        if (!match) {
            console.error("Base64 not found");
            return;
        }
        
        const b64Data = match[1];
        const buffer = Buffer.from(b64Data, 'base64');
        
        let scissors;
        if (typeof Jimp.read === 'function') {
           scissors = await Jimp.read(buffer);
        } else if (typeof Jimp.fromBuffer === 'function') {
           scissors = await Jimp.fromBuffer(buffer);
        } else {
           scissors = await Jimp(buffer); // fallback
        }
        
        // Make white background transparent
        scissors.scan(0, 0, scissors.bitmap.width, scissors.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            // If near white, make transparent
            if (r > 240 && g > 240 && b > 240) {
                this.bitmap.data[idx + 3] = 0;
            }
        });
        
        // We want the scissors to be relatively big inside a 1024x1024 circle
        // The original image width is scissors.bitmap.width. Let's resize it to fill more space.
        // A black circle of 1024x1024 has radius 512.
        // Let's resize scissors to 800x800 maximum bounding box.
        scissors.scaleToFit(800, 800);
        
        // Create 1024x1024 black image
        let finalImage;
        if (typeof Jimp.create === 'function') {
            finalImage = Jimp.create(1024, 1024, 0x000000FF);
        } else {
            finalImage = new Jimp({ width: 1024, height: 1024, color: 0x000000FF });
        }
        
        // Calculate offsets to center the scissors
        const x = (1024 - scissors.bitmap.width) / 2;
        const y = (1024 - scissors.bitmap.height) / 2;
        
        // Composite
        finalImage.composite(scissors, x, y);
        
        // Make the final image a perfect circle (makes corners transparent)
        finalImage.circle();
        
        const outPath = path.join(__dirname, 'src-tauri/icons/icon.png');
        
        if (typeof finalImage.writeAsync === 'function') {
            await finalImage.writeAsync(outPath);
        } else {
            await finalImage.write(outPath);
        }
        
        console.log("SUCCESSFULLY DONE:", outPath);
    } catch(err) {
        console.error("ERROR:", err);
    }
}

processLogo();
