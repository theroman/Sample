import Record from './js/recorder.js';
import Config from './js/config.js';
import {getCurrentDatetime} from './js/utils.js';

let recorder;
const CONFIG = new Config();

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.extension.onConnect.addListener( (port) => {
  port.onMessage.addListener( async (message) => {
    if (message.msg == 'init') {
      init(port);
    }
    if (message.msg == 'startRecording') {
      startRecording(port);
    }
    if (message.msg == 'stopRecording') {
      stopRecording();
    }
    if (message.msg == 'downloadSample') {
      downloadSample(message);
    }
    if (message.msg == 'reverseSample') {
      reverseSample(message);
    }
  });
});

const init = async (port) => {
  if (recorder) {
    recorder.stopRecording();
  }
  const data = await chrome.storage.local.get('recordingURL');
  port.postMessage({'msg': 'initFinished', 'recordingURL': data.recordingURL});
  recorder = new Record(port);
}

const startRecording = (port) => {
  chrome.storage.local.clear();
    if (!recorder) {
      recorder = new Record(port);
    }
    port.postMessage({'msg': 'recordingStarted', 'hasWaveSurferLoaded': false});
    recorder.startRecording();
}

const stopRecording = () => {
  if (recorder != undefined) {
    recorder.stopRecording();
  }
}

const reverseSample = async (data) => {
  data.reverse = true;
  const bufferData = await renderSampleAudioBuffer(data);
  const worker = new Worker(CONFIG.WORKER_PROPERTIES.fullWorkerDir);
  encodeBufferToWav(bufferData.buffer, bufferData.bufferLength, worker);
  worker.onmessage = (e) => {
    const data = e.data;
    switch (data.command) {
      case 'complete': recorder.storeRecording(data.blob, 'reverse');
    }
  };
};

const downloadSample = async (data) => {
  const bufferData = await renderSampleAudioBuffer(data);
  const worker = new Worker(CONFIG.WORKER_PROPERTIES.fullWorkerDir);
  encodeBufferToWav(bufferData.buffer, bufferData.bufferLength, worker);
  worker.onmessage = (e) => {
    const data = e.data;
    switch (data.command) {
      case 'complete': download(data.blob);
    }
  };
};

const renderSampleAudioBuffer = async (data) => {
  const audioCtx = new AudioContext();
  const offlineCtx = new OfflineAudioContext(CONFIG.SAMPLE_PROPERTIES.numChannels,
      CONFIG.SAMPLE_PROPERTIES.sampleRate * (data.duration), CONFIG.SAMPLE_PROPERTIES.sampleRate);
  const blob = await fetch(data.recordingURL).then((r) => r.blob());
  const audioData = await new Response(blob).arrayBuffer();
  const source = offlineCtx.createBufferSource();
  const sourceBuffer = await audioCtx.decodeAudioData(audioData);
  if (data.reverse == true) {
    reverseBuffer(sourceBuffer);
  }
  source.buffer = sourceBuffer;
  source.connect(offlineCtx.destination);
  source.start(0, data.start, data.duration);
  const renderedBuffer = await offlineCtx.startRendering();
  const byChannelBuffer = [];
  for (let ch = 0; ch < CONFIG.SAMPLE_PROPERTIES.numChannels; ++ch) {
    byChannelBuffer[ch] = renderedBuffer.getChannelData(ch);
  }
  return {buffer: byChannelBuffer, bufferLength: renderedBuffer.length};
};

const encodeBufferToWav = (buffer, bufferLength, encodingWorker) => {
  encodingWorker.postMessage({command: 'init',
    config: {
      sampleRate: CONFIG.SAMPLE_PROPERTIES.sampleRate,
      numChannels: CONFIG.SAMPLE_PROPERTIES.numChannels,
    },
    options: {
      timeLimit: CONFIG.SAMPLE_PROPERTIES.timeLimit,
      encodeAfterRecord: true,
      progressInterval: 1000,
      wav: {
        mimeType: CONFIG.SAMPLE_PROPERTIES.mimeType,
      },
    },
  });
  encodingWorker.postMessage({command: 'start', bufferSize: bufferLength});
  encodingWorker.postMessage({command: 'record', buffer: buffer});
  encodingWorker.postMessage({command: 'finish'});
};

const reverseBuffer = (buffer) => {
  Array.prototype.reverse.call( buffer.getChannelData(0) );
  Array.prototype.reverse.call( buffer.getChannelData(1) );
};

const download = (blob) => {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = blobUrl;
  a.download = `recording_${getCurrentDatetime()}.wav`;
  a.click();
  URL.revokeObjectURL(blobUrl);
};