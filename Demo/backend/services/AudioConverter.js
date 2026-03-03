const { spawn } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static"); // resolves to full path to ffmpeg binary

function webmToWavBuffer(webmBuffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-f", "wav",
      "pipe:1",
    ]);

    const out = [];
    const err = [];

    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => err.push(d));

    ff.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(Buffer.concat(err).toString("utf8") || `ffmpeg exit ${code}`));
      }
      resolve(Buffer.concat(out));
    });

    ff.on("error", reject);
    ff.stdin.end(webmBuffer);
  });
}

module.exports = { webmToWavBuffer };