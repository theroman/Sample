export default class Config {
  
  constructor() {
    this.EXTENSION_PROPERTIES = {
      donationsURL: 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2A4L9MZ4BVBEC',
      devEmail: 'romanwhatwhat@gmail.com',
    };
    this.CAPTURE_PROPERTIES = {audio: true};
    this.WORKER_PROPERTIES = {
      workerDir: './js/external/web-audio-recorder/',
      fullWorkerDir: './js/external/web-audio-recorder/WebAudioRecorderWav.min.js',
      encoding: 'wav',
    };
    this.SAMPLE_PROPERTIES = {
      sampleRate: 44100,
      numChannels: 2,
      timeLimit: 15 * 60,
      mimeType: 'audio/wav',
      maxSampleRate: 96000,
    };
    this.WAVE_PROPERTIES = {
      minPixelsPerSecond: 100,
      pixelsPerStep: 20,
      defaultSkipLength: 2,
    };
  }
}
