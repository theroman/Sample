var encoder;
const min = Math.min;
const max = Math.max;

class WavEncoder {
    constructor(sampleRate, numChannels) {
        this.sampleRate = sampleRate;
        this.numChannels = numChannels;
        this.numSamples = 0;
        this.dataViews = [];
    }

    encode(buffer, bufferSize) {
        var view = new DataView(new ArrayBuffer(bufferSize * this.numChannels * 2));
        var offset = 0;
        for (var i = 0; i < bufferSize; ++i) {
          for (let ch = 0; ch < this.numChannels; ++ch) {

            var x = buffer[ch][i] * 0x7fff;
            let value = x < 0 ? max(x, -0x8000) : min(x, 0x7fff)
            view.setInt16(offset, value, true);
            offset += 2;
          }
        }
        this.dataViews.push(view); 
        this.numSamples += bufferSize;
    }

    finish() {
        var dataSize = this.numChannels * this.numSamples * 2
        var view = new DataView(new ArrayBuffer(44));
        this.setString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        this.setString(view, 8, 'WAVE');
        this.setString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, this.numChannels, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * 4, true);
        view.setUint16(32, this.numChannels * 2, true);
        view.setUint16(34, 16, true);
        this.setString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        this.dataViews.unshift(view);
        var blob = new Blob(this.dataViews, { type: 'audio/wav' });
        this.cleanup();
        return blob;
    }

    cleanup() {
        delete this.dataViews;
        this.dataViews = []
    }

    setString(view, offset, str) {
        var len = str.length;
        for (var i = 0; i < len; ++i)
          view.setUint8(offset + i, str.charCodeAt(i));
    }
}

self.onmessage = function(event) {
    var data = event.data;
    switch (data.command) {
      case "init":    init(data.config);   break;
      case "record":  record(data.buffer, data.bufferSize); break;
      case "finish":  finish();   break;
    }
  };

function init(config) {
    encoder = new WavEncoder(config.additional_config.sampleRate, config.additional_config.numChannels)
    self.postMessage("Worker loaded")
}

function record(buffer, bufferSize) {
    encoder.encode(buffer, bufferSize)
    self.postMessage({"command": "progress"})
}

function finish() {
    let data = encoder.finish()

    self.postMessage({"command": "recordingComplete", "audioData": data})
}


