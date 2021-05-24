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
        for (var i = 0; i < bufferSize; ++i)
          for (var ch = 0; ch < this.numChannels; ++ch) {
            var x = buffer[ch][i] * 0x7fff;
            let value = x < 0 ? max(x, -0x8000) : min(x, 0x7fff)
            view.setInt16(offset, value, true);
            offset += 2;
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
        console.log(this.dataViews[0])
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