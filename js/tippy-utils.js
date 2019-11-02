const howToUse = `<div class="how-to">
<h6>How to:</h6>
Play audio on page; Hit the <span id="record">record</span> button to capture it, press the <span id="stop">stop</span> button to finish your recording.
</div>`;

const menu = `<nav id="menu">
<div class="menu-item p-recording"><i class="fas icon-wave"></i></div>
<div class="menu-item p-preferences"><i class="fas fa-cog"></i></div>
</nav>`;

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

export const menuConfig = {
  content: menu,
  distance: 3,
  offset: '5, 0',
  theme: 'sample',
  interactive: true,
  arrow: false,
  trigger: 'click',
};
