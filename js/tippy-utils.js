const howToUse = `<div class="how-to">
<h6>How to:</h6>
Play audio on page; Hit the <span id="record">record</span> button to capture it, press the <span id="stop">stop</span> button to finish your recording.
</div>`;

const confirmDelete = `<div class="confirm-delete">
<div id="delete-true">YES</div>
<div id="delete-false">NO</div>
</div>`;

export const elementClassToTooltipConfig = {
  '.stop-recording': {
    placement: 'right',
    content: 'Stop recording',
  },
  '.start-recording': {
    placement: 'left',
    content: 'Start recording',
  },
  '#recording-controls': {
    placement: 'bottom',
    content: howToUse,
    arrow: false,
    theme: 'light',
    distance: 5,
  },
  '.wavesurfer-region': {
    placement: 'top-end',
    content: 'Move and resize to trim your sample',
  },
  '.reverse': {
    placement: 'top',
    content: 'Reverse',
  },
  '.delete': {
    placement: 'bottom',
    content: 'Delete sample',
  },
  '#sample_length': {
    placement: 'bottom',
    content: 'Adjust length',
  },
  '#sample_start': {
    placement: 'bottom',
    content: 'Adjust start point',
  },
};