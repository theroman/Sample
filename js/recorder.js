import Config from './config.js';

export default class Recorder {
  constructor(port) {
    this.CONFIG = new Config();
    this.port = port;
    this.stream = null;
    this.recording = null;
  }
  async startRecording() {
    if (sessionStorage.getItem('recording_started') != 'true') {
      const audioContext = new AudioContext;
      this.stream = await chrome.tabCapture.capture(this.CONFIG.CAPTURE_PROPERTIES);
      const input = audioContext.createMediaStreamSource(this.stream);
      input.connect(audioContext.destination);
      this.recording = new WebAudioRecorder(input, this.CONFIG.WORKER_PROPERTIES);
      this.recording.onComplete = (recorder, blob) => this.storeRecording(blob, 'regular');
      this.recording.startRecording();
      sessionStorage.setItem('recording_started', true);
    }
  }

  storeRecording = async (blob, eventType) => {
    const dataURL = window.URL.createObjectURL(blob);
    await chrome.storage.local.set({'recordingURL': dataURL});
    const data = {'msg': 'recordingFinished', 'recordingURL': dataURL};
    if (eventType == 'reverse') {
      await this.setReverseStatus(data);
    }
    try {
      this.port.postMessage(data);
    } catch (error) {
      //
    }
  }

  async stopRecording() {
    if (sessionStorage.getItem('recording_started') === 'true') {
      if (this.recording) {
        await this.recording.finishRecording();
        this.stream.getAudioTracks()[0].stop();
        this.recording = null;
      }
      sessionStorage.setItem('recording_started', false);
    }
  }

  setReverseStatus = async (data) => {
    let wasReversed = await chrome.storage.local.get('was_reversed');
    wasReversed = wasReversed.was_reversed;
    data.wasReversed = !wasReversed;
    chrome.storage.local.set({'was_reversed': data.wasReversed});
  }
}
