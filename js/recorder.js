import Config from './config.js';

export default class Recorder {
  constructor(port, webAudioRecorderConfig) {
    this.CONFIG = new Config();
    this.port = port;
    this.stream = null;
    this.recording = null;
    this.webAudioRecorderConfig = webAudioRecorderConfig;
  }
  async startRecording() {
    let recordingStarted = await chrome.storage.local.get('recording_started');
    recordingStarted = recordingStarted.recording_started;
    if (recordingStarted != true) {
      const audioContext = new AudioContext({sampleRate: this.webAudioRecorderConfig.additional_config.sampleRate,
        latencyHint: 'playback'});
      this.stream = await chrome.tabCapture.capture(this.CONFIG.CAPTURE_PROPERTIES);
      const input = audioContext.createMediaStreamSource(this.stream);
      input.connect(audioContext.destination);
      this.recording = new WebAudioRecorder(input, this.webAudioRecorderConfig);
      this.recording.onComplete = (recorder, blob) => this.storeRecording(blob, 'regular');
      this.recording.startRecording();
      await chrome.storage.local.set({'recording_started': true});
      recordingStarted = true;
    }
    return recordingStarted;
  }

  async storeRecording(blob, eventType) {
    this.stream.getAudioTracks()[0].stop();
    this.recording = null;
    const dataURL = window.URL.createObjectURL(blob);
    await chrome.storage.local.set({'recordingURL': dataURL});
    const data = {'msg': 'recordingFinished', 'recordingURL': dataURL};
    if (eventType == 'reverse') {
      await this.setReverseStatus(data);
    }
    try {
      await chrome.storage.local.set({'recording_started': false});
      this.port.postMessage(data);
    } catch (error) {
      console.log(error);
    }
  }

  async stopRecording() {
    let recordingStarted = await chrome.storage.local.get('recording_started');
    recordingStarted = recordingStarted.recording_started;
    if (recordingStarted == true) {
      if (this.recording) {
        await this.recording.finishRecording();
      }
    }
  }

  async setReverseStatus(data) {
    let wasReversed = await chrome.storage.local.get('was_reversed');
    wasReversed = wasReversed.was_reversed;
    data.wasReversed = !wasReversed;
    await chrome.storage.local.set({'was_reversed': data.wasReversed});
  }

  refreshPort(port) {
    this.port = port;
  }
}
