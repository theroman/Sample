import {updateUI} from './js/ui-control.js';
import {WaveSurferControl} from './js/wavesurfer-control.js';
import Config from './js/config.js';

const port = chrome.runtime.connect({name: 'communication'});
let waveSurfer;
let recordingURL;
const CONFIG = new Config();

document.addEventListener('DOMContentLoaded', async () => {
  const data = {'msg': 'init'};
  updateUI(data);
  port.postMessage(data);
});

document.addEventListener('click', (e) => {
  const clickedElementClassList = e.target.classList;
  if (clickedElementClassList.contains('start-recording')) {
    port.postMessage({'msg': 'startRecording'});
    if (waveSurfer && waveSurfer.ws) {
      waveSurfer.ws.destroy();
    }
    waveSurfer = undefined;
  }
  if (clickedElementClassList.contains('stop-recording')) {
    port.postMessage({'msg': 'stopRecording'});
  }
  if (clickedElementClassList.contains('play-pause')) {
    waveSurfer.playPause();
  }
  if (clickedElementClassList.contains('zoom-in')) {
    waveSurfer.zoomIn();
  }
  if (clickedElementClassList.contains('zoom-out')) {
    waveSurfer.zoomOut();
  }
  if (clickedElementClassList.contains('forward')) {
    waveSurfer.ws.skipForward();
  }
  if (clickedElementClassList.contains('backwards')) {
    waveSurfer.ws.skipBackward();
  }
  if (clickedElementClassList.contains('donate')) {
    const donationURL = 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2A4L9MZ4BVBEC';
    chrome.tabs.create({url: donationURL});
  }
  if (clickedElementClassList.contains('contact-me')) {
    const emailTo = `mailto: ${CONFIG.EXTENSION_PROPERTIES.devEmail}`;
    chrome.tabs.create({url: emailTo});
  }

  if (clickedElementClassList.contains('download')) {
    port.postMessage({'msg': 'downloadSample',
      'start': getSampleStart(),
      'duration': getSampleLength(),
      'recordingURL': recordingURL});
  }

  if (clickedElementClassList.contains('reverse')) {
    port.postMessage({'msg': 'reverseSample',
      'start': 0,
      'duration': waveSurfer.ws.getDuration(),
      'recordingURL': recordingURL});
  }
  if (e.target.closest('.delete')) {
    chrome.storage.local.remove('recordingURL');
    waveSurfer = null;
    const data = {'msg': 'init'};
    port.postMessage(data);
    updateUI(data);
  }
});

document.addEventListener('mouseover', async (e) => {
  const clickedElementClassList = e.target.classList;
  if (clickedElementClassList.contains('tutorial')) {
    const data = {'msg': 'showTutorial', 'hasWaveSurferLoaded': await waveSurfer.hasLoaded};
    updateUI(data);
  }
});

document.addEventListener('mouseout', (e) => {
  const clickedElementClassList = e.target.classList;
  if (clickedElementClassList.contains('tutorial')) {
    const data = {'msg': 'hideTutorial'};
    updateUI(data);
  }
});

document.addEventListener('change', (e) => {
  const changedElement = e.target.id;
  if (['sample_start', 'sample_length'].includes(changedElement)) {
    waveSurfer.region.update({'start': getSampleStart(), 'end': getSampleStart() + getSampleLength()});
  }
});

port.onMessage.addListener(async (data) => {
  if (['recordingFinished', 'initFinished'].includes(data.msg)) {
    recordingURL = data.recordingURL;
    if (waveSurfer && waveSurfer.ws) {
      waveSurfer.ws.destroy();
    }
    waveSurfer = new WaveSurferControl(data.recordingURL);
    data.hasWaveSurferLoaded = await waveSurfer.hasLoaded;
  }

  if (data.hasWaveSurferLoaded) {
    waveSurfer.ws.on('ready', async () => {
      data.sampleDerutaion = await waveSurfer.getRegionDuration();
      updateUI(data);
    });
  } else {
    updateUI(data);
  }
});

const getSampleStart = () => {
  return parseFloat(document.querySelector('#sample_start').value);
};

const getSampleLength = () => {
  return parseFloat(document.querySelector('#sample_length').value);
};

