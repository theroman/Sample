# Sample
A Google Chrome extension for sampling and editing audio from the web.\
The audio is recorded with a sampling rate of 44.1/48/96 kHz in mono/stereo and can be trimmed, reversed and exported in a .WAV format.

## Getting Started

Head over [here](https://chrome.google.com/webstore/detail/sample/kpkcennohgffjdgaelocingbmkjnpjgc) to install Sample on your browser, 
or just clone this repo and follow these steps:
  1. Open the Extension Management page by navigating to `chrome://extensions`.
  2. Enable Developer Mode by clicking the toggle switch next to Developer mode.
  3. Click the LOAD UNPACKED button and select the extension directory.

## Built With

* [wavesurfer.js](https://wavesurfer-js.org/) - Used to produce the pretty waveform
* [WebAudioRecorder.js](https://github.com/higuma/web-audio-recorder-js/) - Used to encode the captured audio
* [Tippy](https://atomiks.github.io/tippyjs/) - Used to display tooltips

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details
