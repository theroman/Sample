import Record from './js/recorder.js';
import Config from './js/config.js';
import {getCurrentDatetime} from './js/utils.js';

let recorder;
let webAudioRecorderConfig;
const CONFIG = new Config();
let currentSampleRate;
let currentSampleChannels;
let recordedSampleRate;
let recordedSampleChannels;
let wasSampleConfigUpdated;
const channelsToRecordingType = {1: 'mono', 2: 'stereo'};

chrome.runtime.onStartup.addListener(() => {
  clearLocalStorage();
});

chrome.extension.onConnect.addListener( (port) => {
  port.onMessage.addListener( async (message) => {
    if (message.msg == 'init') {
      init(message, port);
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

const init = async (message, port) => {
  wasSampleConfigUpdated = await handleSampleConfig(message.sampleConfig);
  webAudioRecorderConfig = getWebAudioRecorderConfig({timeLimit: CONFIG.SAMPLE_PROPERTIES.timeLimit});
  if (!recorder) {
    recorder = new Record(port, webAudioRecorderConfig);
  } else {
    recorder.refreshPort(port);
  }
  const data = await chrome.storage.local.get('recordingURL');
  const recordingURL = data.recordingURL;
  port.postMessage({'msg': 'initFinished', 'recordingURL': recordingURL, 'currentSampleConfig':
    {sampleRate: currentSampleRate, sampleChannels: currentSampleChannels}});
};

const startRecording = async (port) => {
  clearLocalStorage(['recordingURL']);
  if (!recorder || wasSampleConfigUpdated) {
    recorder = new Record(port, webAudioRecorderConfig);
  }
  recordedSampleRate = currentSampleRate;
  recordedSampleChannels = currentSampleChannels;
  const recordingStarted = await recorder.startRecording();
  if (recordingStarted) {
    port.postMessage({'msg': 'recordingStarted', 'hasWaveSurferLoaded': false});
  }
};

const stopRecording = () => {
  if (recorder != undefined) {
    recorder.stopRecording();
  }
};

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
  const offlineCtx = new OfflineAudioContext(recordedSampleChannels,
      recordedSampleRate * (data.duration), recordedSampleRate);
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
  for (let ch = 0; ch < recordedSampleChannels; ++ch) {
    byChannelBuffer[ch] = renderedBuffer.getChannelData(ch);
  }
  return {buffer: byChannelBuffer, bufferLength: renderedBuffer.length};
};

const encodeBufferToWav = (buffer, bufferLength, encodingWorker) => {
  encodingWorker.postMessage({command: 'init',
    config: {
      sampleRate: recordedSampleRate,
      numChannels: recordedSampleChannels,
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
  if (recordedSampleChannels == 2) {
    Array.prototype.reverse.call( buffer.getChannelData(1) );
  }
};

const download = (blob) => {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = blobUrl;
  a.download = `recording_${getCurrentDatetime()}_${recordedSampleRate / 1000}kHz_${channelsToRecordingType[recordedSampleChannels]}.wav`;
  a.click();
  URL.revokeObjectURL(blobUrl);
};


const clearLocalStorage = async (keysToRemove) => {
  const defaultKeys = ['was_reversed', 'sample_start', 'sample_duration'];
  if (!keysToRemove) keysToRemove = [];
  keysToRemove = keysToRemove.concat(defaultKeys);
  if (!recorder) {
    keysToRemove.push('recording_started');
  }
  chrome.storage.local.remove(keysToRemove);
};

const getWebAudioRecorderConfig = (config) => {
  const webAudioRecorderConfig = CONFIG.WORKER_PROPERTIES;
  config.numChannels = currentSampleChannels;
  config.sampleRate = currentSampleRate;
  webAudioRecorderConfig.additional_config = config || {};
  return webAudioRecorderConfig;
};

const handleSampleConfig = async (sampleConfig) => {
  let wasUpdated = false;
  await getCurrentSampleRate();
  await getCurrentSampleChannels();
  if (sampleConfig) {
    const sampleRate = canonizeSampleRate(sampleConfig.sampleRate);
    const sampleChannels = canonizeSampleChannels(sampleConfig.sampleChannels);
    if (sampleRate != currentSampleRate) {
      currentSampleRate = sampleRate;
      await chrome.storage.local.set({'sample_rate': sampleRate});
      wasUpdated = true;
    }
    if (sampleChannels != currentSampleChannels) {
      currentSampleChannels = sampleChannels;
      await chrome.storage.local.set({'sample_channels': sampleChannels});
      wasUpdated = true;
    }
  }
  return wasUpdated;
};


const canonizeSampleRate = (sampleRate) => {
  if (sampleRate < CONFIG.SAMPLE_PROPERTIES.sampleRate || sampleRate > CONFIG.SAMPLE_PROPERTIES.maxSampleRate) {
    sampleRate = CONFIG.SAMPLE_PROPERTIES.sampleRate;
  }
  return sampleRate;
};

const canonizeSampleChannels = (sampleChannels) => {
  if (![1, 2].includes(sampleChannels)) {
    sampleChannels = 2;
  }
  return sampleChannels;
};

const getCurrentSampleRate = async () => {
  const data = await chrome.storage.local.get('sample_rate');
  currentSampleRate = data.sample_rate || CONFIG.SAMPLE_PROPERTIES.sampleRate;
};

const getCurrentSampleChannels= async () => {
  const data = await chrome.storage.local.get('sample_channels');
  currentSampleChannels = data.sample_channels || CONFIG.SAMPLE_PROPERTIES.numChannels;
};
