import {updateStartPoint, updateLength} from './ui-control.js';
import Config from './config.js';
import {formatTimeCallback, timeInterval, primaryLabelInterval, secondaryLabelInterval} from './external/wavesurfer/timeline-formatting.js';
import TimelinePlugin from './external/wavesurfer/plugin/timeline.js';
import RegionsPlugin from './external/wavesurfer/plugin/regions.js';


export class WaveSurferControl {
  constructor(recordingURL) {
    this.recordingURL = recordingURL;
    this.hasLoaded = this.init();
    this.hasRegion = false;
    this.CONFIG = new Config().WAVE_PROPERTIES;
  }

  async init() {
    try {
      const blob = await fetch(this.recordingURL).then((r) => r.blob());
      this.ws = WaveSurfer.create({
        container: document.querySelector('#waveform'),
        height: 150,
        normalize: true,
        skipLength: 0.5,
        interact: false,
        waveColor: '#53acac',
        progressColor: '#1f5c7a',
        barWidth: 4,
        barHeight: 1,
        minPxPerSec: this.CONFIG.minPixelsPerSecond,
        plugins: [
          RegionsPlugin.create({createRegion: true}),
          WaveSurfer.cursor.create({
            showTime: true,
            opacity: 1,
            customShowTimeStyle: {
              'background-color': '#000',
              'color': '#fff',
              'padding': '2px',
              'font-size': '10px',
            },
          }),
          TimelinePlugin.create({
            container: '#wave-timeline',
            formatTimeCallback: formatTimeCallback,
            timeInterval: timeInterval,
            primaryLabelInterval: primaryLabelInterval,
            secondaryLabelInterval: secondaryLabelInterval,
          }),
        ],
      });
      this.ws.loadBlob(blob);
      this.ws.on('ready', async () => {
        this.fixPixelPerSecond();
        await this.addRegion();
        this.setStartPoint();
        this.setLength();
      });
      this.ws.on('region-updated', async () => {
        this.ws.seekAndCenter(this.region.start / this.ws.getDuration());
        this.setSkipLength();
        this.setRegionStartAndDuration(this.region.start, this.getRegionDuration());
        this.getRegionStartAndDuration();
        this.setStartPoint();
        this.setLength();
      });
      this.ws.on('region-out', () => {
        this.ws.pause();
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  addRegion = async () => {
    if (!this.hasRegion) {
      const positionData = await this.getRegionStartAndDuration();
      this.region = this.ws.addRegion({
        start: positionData.start,
        end: positionData.start + positionData.duration,
        color: 'hsla(213, 82%, 61%, 0.19)',
      });
      this.hasRegion = true;
      this.ws.seekAndCenter(this.region.start / this.ws.getDuration());
    }
  }

  async playPause() {
    const ready = await this.hasLoaded;
    if (ready == true) {
      if (this.ws.isPlaying()) {
        this.ws.pause();
      } else {
        let currentTime = this.ws.getCurrentTime();
        if (currentTime >= this.region.end || currentTime < this.region.start) {
          currentTime = this.region.start;
        }
        this.region.play(currentTime);
      }
    }
  };

  zoomIn = () => {
    if (this.currentPixelsPerSecond < this.initialPixelsPerSecond) {
      this.currentPixelsPerSecond = this.initialPixelsPerSecond + this.CONFIG.pixelsPerStep;
    } else {
      this.currentPixelsPerSecond += this.CONFIG.pixelsPerStep;
    }
    this.ws.zoom(this.currentPixelsPerSecond);
  }

  zoomOut = () => {
    if (this.currentPixelsPerSecond > 0) {
      this.currentPixelsPerSecond -= this.CONFIG.pixelsPerStep;
      this.ws.zoom(this.currentPixelsPerSecond);
    }
  }

  fixPixelPerSecond = () => {
    this.initialPixelsPerSecond = this.ws.timeline.params.pixelsPerSecond;
    this.currentPixelsPerSecond = this.initialPixelsPerSecond;
  }

  setSkipLength = () => {
    const duration = this.getRegionDuration();
    let skipLength = this.CONFIG.defaultSkipLength;
    if (duration <= skipLength * 4) {
      skipLength = duration / 4;
    }
    if (duration >= 60) {
      skipLength = this.CONFIG.defaultSkipLength * 2;
    }
    this.ws.params.skipLength = skipLength;
  }

  setStartPoint = () => {
    let start = this.region.start;
    if (start < 0) {
      start = 0;
    }
    updateStartPoint(start);
  }

  getRegionDuration = () => {
    let regionDuration;
    if (this.hasRegion) {
      regionDuration = this.region.end - this.region.start;
    } else if (!regionDuration) {
      regionDuration = this.ws.getDuration();
      if (regionDuration > 1) {
        regionDuration = regionDuration - 0.1;
      }
    }
    return regionDuration;
  }

  setLength = () => {
    updateLength(this.getRegionDuration());
  }

  getRegionStartAndDuration = async () => {
    const result = {};
    let start = await chrome.storage.local.get('sample_start');
    start = start.sample_start || 0;
    let duration = await chrome.storage.local.get('sample_duration');
    duration = duration.sample_duration || 0;
    result.start = parseFloat(start) || 0.1;
    result.duration = parseFloat(duration) || this.getRegionDuration();
    return result;
  }

  setRegionStartAndDuration = (start, duration) => {
    chrome.storage.local.set({'sample_start': start});
    chrome.storage.local.set({'sample_duration': duration});
  }
}