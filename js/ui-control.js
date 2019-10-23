import {elementClassToTooltipConfig} from './tippy-utils.js';
let reverseButtonStatus = '';

export const updateUI = (data) => {
  if (data.msg == 'init') {
    initState();
  }
  if (data.msg == 'initFinished') {
    initFinishedState(data);
  }
  if (data.msg == 'recordingStarted') {
    recordingStartedState(data);
  }
  if (data.msg == 'recordingFinished') {
    recordingFinishedState(data);
  }
  if (data.msg == 'showTutorial') {
    showTutorial(data);
  }
  if (data.msg == 'hideTutorial') {
    hideTutorial(data);
  }
  initTooltips();
};

const initState = () => {
  document.querySelector('body').innerHTML = getPopupInit();
};

const initFinishedState = async (data) => {
  data.recordButtonStatus = 'active';
  data.stopButtonStatus = 'not-active';
  reverseButtonStatus = await getReverseButtonStatus();
  updateRecodringControls(data);
  updateSampleControl(data);
  updateFooter(data);
};

const recordingStartedState = (data) => {
  data.recordButtonStatus = 'recording';
  data.stopButtonStatus = 'active';
  resetWaveform(data);
  updateRecodringControls(data);
  updateSampleControl(data);
  updateFooter(data);
};

const recordingFinishedState = async (data) => {
  reverseButtonStatus = await getReverseButtonStatus(data);

  updateRecodringControls(data);
  updateSampleControl(data);
  updateFooter(data);
};

const updateRecodringControls = async (data) => {
  await setRecodringControlsStatus(data);
  const html = `<div class="${data.recordButtonStatus} start-recording"></div>
                <div class="${data.stopButtonStatus} stop-recording"></div>`;
  document.querySelector('#recording-controls').innerHTML = html;
};

const setRecodringControlsStatus = async (data) => {
  let recordingStarted = await chrome.storage.local.get('recording_started');
  recordingStarted = recordingStarted.recording_started;
  if (recordingStarted) {
    data.recordButtonStatus = 'recording';
    data.stopButtonStatus = 'active';
  } else {
    data.recordButtonStatus = 'active';
    data.stopButtonStatus = 'not-active';
  }
};

const updateSampleControl = (data) => {
  let html = '';
  if (data.hasWaveSurferLoaded) {
    html = `<section id="player-control">
              <button class="btn btn-black delete">
              <i class="far fa-trash-alt del"></i>
              </button>
              <button class="btn btn-outline-warning zoom-out">
                <i class="fas fa-search-minus zoom-out"></i>
              </button>
              <button class="btn btn-outline-warning zoom-in">
                <i class="fas fa-search-plus zoom-in"></i>
              </button>
              <button class="btn btn-primary backwards">
                <i class="fa fa-step-backward backwards"></i>
              </button>
              <button class="btn btn-primary play-pause">
                <i class="fa fa-play play-pause"></i>/<i class="fa fa-pause play-pause"></i>
              </button>
              <button class="btn btn-primary forward">
                <i class="fa fa-step-forward forward"></i>
              </button>
              <button id="reverse-button" data-tippy-content="Reverse" class="ttb btn btn-outline-info reverse ${reverseButtonStatus}">
                <i class="fas fa-undo reverse ${reverseButtonStatus}"></i>
              </button>
            </section>
            <section id="start-end-control">
              <label>Sample start: </label>
              <input id="sample_start" type="number" min="0" max="${data.sampleDerutaion}" step="0.1" value="0"/>
              <label>Length: </label>
              <input id="sample_length" type="number" min="0" step="0.1" max="${data.sampleDerutaion}" value="${data.sampleDerutaion}"/>
            </section>
            `;
  }
  document.querySelector('#sample-controls').innerHTML = html;
};

const resetWaveform = () => {
  document.querySelector('#waveform').innerHTML = '';
  document.querySelector('#wave-timeline').innerHTML = '';
};

const updateExport = () => {
  const html = `<button id="downloadButton" class="download btn btn-success"><i class="download fas fa-download"></i>    
     Download</button>`;
  document.querySelector('#export').innerHTML = html;
};

const updateDonate = () => {
  const html = `<h5 id="donateMsg">Having fun?</h5>
    <button id="donateButton" class="donate btn btn-info btn-sm">Help me afford a Synthstrom Deluge</button>`;
  document.querySelector('#donate').innerHTML = html;
};

const updateFooter = (data) => {
  const modalFooter = document.querySelector('.modal-footer');
  if (data.hasWaveSurferLoaded) {
    modalFooter.classList.remove('display-false');
    updateExport();
    updateDonate();
  } else {
    modalFooter.classList.add('display-false');
  }
};

const getReverseButtonStatus = async () => {
  let wasReversed = await chrome.storage.local.get('was_reversed');
  wasReversed = wasReversed.was_reversed;
  if (wasReversed == true) {
    return 'reversed-pressed';
  }
  return '';
};

const getPopupInit = () => {
  return `
  <div class="modal-header">
    <h2>Sample</h2>
    <div id="extension-control">
    <i data-tippy-content="Contact me" class="tt contact-me fas fa-envelope"></i>
    <i class="fas tutorial fa-question-circle"></i>  
    </div>
  </div>
  <div class="modal-body">
    <div id="recording-controls"></div>
    <div id="waveform"></div>
    <div id="wave-timeline"></div>
    <div id="sample-controls"></div>
  </div>
  <div class="modal-footer display-false">
    <div id="export"></div>
    <div id="donate"></div>
  </div>`;
};

const initTooltips = () => {
  tippy('.tt');
};

export const updateStartPoint = (newStartPoint) => {
  const startPoint = newStartPoint.toFixed(3);
  const sampleStartElement = document.querySelector('#sample_start');
  if (sampleStartElement && startPoint) {
    sampleStartElement.value = startPoint;
  }
};

export const updateLength = (newLength) => {
  const length = newLength.toFixed(3);
  const sampleLengthElement = document.querySelector('#sample_length');
  if (sampleLengthElement && length) {
    sampleLengthElement.value = length;
  }
};

const showTutorial = (data) => {
  for (const [elementClass, config] of Object.entries(elementClassToTooltipConfig)) {
    const elementRef = document.querySelector(elementClass);
    if (elementRef) {
      let tippyInstance;
      if (elementRef._tippy) {
        tippyInstance = elementRef._tippy;
        tippyInstance.enable();
      } else {
        tippyInstance = tippy(elementRef, config);
      }
      if (shouldShowToolip(elementClass, data.hasWaveSurferLoaded)) {
        tippyInstance.show();
      }
    }
  }
};

const shouldShowToolip = (elementName, hasWaveSurferLoaded) => {
  if (elementName == '#recording-controls' && hasWaveSurferLoaded == true) {
    return false;
  }
  return true;
};

const hideTutorial = () => {
  for (const [elementClass, config] of Object.entries(elementClassToTooltipConfig)) {
    const elementRef = document.querySelector(elementClass);
    if (elementRef._tippy) {
      elementRef._tippy.hide();
      elementRef._tippy.disable();
    }
  }
};
