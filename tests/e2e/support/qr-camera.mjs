// Supply the actual email attachment as video frames. The app still runs its
// real qr-scanner decoder, authenticated check-in API and database transaction.
// Only the physical camera is replaced; no application requests are mocked.
export async function installQrCamera(page, png) {
  await page.addInitScript(({ imageUrl }) => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const image = new Image();
        image.src = imageUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 720;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Test camera canvas unavailable");
        // QR scanner uses the centered 2/3 of the frame by default.
        const draw = () => {
          context.fillStyle = "white";
          context.fillRect(0, 0, 720, 720);
          context.drawImage(image, 180, 180, 360, 360);
        };
        draw();
        const stream = canvas.captureStream(8);
        const timer = window.setInterval(draw, 125);
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => { window.clearInterval(timer); stop(); };
        }
        return stream;
      },
    });
  }, { imageUrl: `data:image/png;base64,${png.toString("base64")}` });
}
