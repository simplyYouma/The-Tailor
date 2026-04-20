const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function generate() {
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
        
        let scissors = await Jimp.read(buffer);
        
        // Remove white background (make transparent)
        scissors.scan(0, 0, scissors.bitmap.width, scissors.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            // If near white, make transparent
            if (r > 240 && g > 240 && b > 240) {
                this.bitmap.data[idx + 3] = 0;
            }
        });
        
        // Resize scissors to be larger (user wants it bigger)
        scissors.scale(1.8);
        
        // Create a 1024x1024 transparent image
        let finalImage = new Jimp(1024, 1024, 0x00000000);
        
        // Create a black circle
        let blackCircle = new Jimp(1024, 1024, 0x000000FF);
        blackCircle.circle();
        
        // Composite black circle onto final image
        finalImage.composite(blackCircle, 0, 0);
        
        // Composite scissors onto the center
        const x = (1024 - scissors.bitmap.width) / 2;
        const y = (1024 - scissors.bitmap.height) / 2;
        finalImage.composite(scissors, x, y);
        
        // Ensure perfect outer transparency
        finalImage.circle();
        
        const outPath = path.join(__dirname, 'src-tauri/icons/icon.png');
        await finalImage.writeAsync(outPath);
        console.log("Saved perfect icon.png to", outPath);
        
    } catch (e) {
        console.error(e);
    }
}

generate();
