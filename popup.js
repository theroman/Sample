import {updateUI} from './js/ui-control.js';
import {WaveSurferControl} from './js/wavesurfer-control.js';
import Config from './js/config.js';

const port = chrome.runtime.connect({name: 'communication'});
let waveSurfer;
let recordingURL;
let currentPage;
const CONFIG = new Config();

document.addEventListener('DOMContentLoaded', async () => {
  currentPage = 'recording';
  const data = {'msg': 'init', 'page': currentPage};
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
    const donationURL = CONFIG.EXTENSION_PROPERTIES.donationsURL;
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
    waveSurfer.ws.destroy();
    waveSurfer = null;
    const data = {'msg': 'init', 'page': currentPage};
    port.postMessage(data);
    updateUI(data);
  }
  if (e.target.closest('.p-preferences')) {
    if (currentPage != 'preferences') {
      currentPage = 'preferences';
      const data = {'msg': 'init', 'page': currentPage};
      updateUI(data);
      port.postMessage(data);
    }
  }
  if (e.target.closest('.p-recording')) {
    if (currentPage != 'recording') {
      const sampleConfig = getSampleConfig();
      currentPage = 'recording';
      const data = {'msg': 'init', 'page': currentPage, 'sampleConfig': sampleConfig};
      updateUI(data);
      port.postMessage(data);
    }
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

const getSampleConfig = () => {
  return {sampleRate: getPreferencesSampleRate(),
    sampleChannels: getPreferencesSampleChannels()}
}

const getPreferencesSampleRate = () => {
  return parseInt(document.querySelector('#sample-rate').selectedOptions[0].value);
}

const getPreferencesSampleChannels = () => {
  return parseInt(document.querySelector('#sample-type').selectedOptions[0].value);
}