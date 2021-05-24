class Recorder {
  constructor(port, recordingProps) {
    this.port = port;
    this.stream = null;
    this.recording = null;
    this.recordingProps = recordingProps;
    this.audioContext = null;
    this.tabAudioInput
    this._initWorker();
  }

  async startRecording() {
    this.audioContext = new AudioContext({sampleRate: this.recordingProps.additional_config.sampleRate});
    await this._initRecorderNode()
    this.tabAudioInput = await this._getTabInputNode()
    this.tabAudioInput.connect(this.recorderNode);
    this.recorderNode.connect(this.audioContext.destination);
    this._startRecorderWorklet();
    this.recordingStartTime = Date.now()
    await chrome.storage.local.set({'recording_started': true});
    return true;
   }

   async stopRecording() {
     console.log('recording stops')
    if (this.recorderNode) {
      this._stopRecorderWorklet()
    }
   }

   _onComplete(blob) {
     this.storeRecording(blob, 'recording')
   }

  _initWorker() {
      this.worker = new Worker('./js/external/recorder/recorderMessagesWorker.js');
      this.worker.onmessage = (event) => {
          let data = event.data;
          switch (data.command) {
            case "progress": this._measureTime(); break;
            case "recordingComplete": this._onComplete(data.audioData); break;
          }
      }
      this.worker.postMessage({"command": "init", "config": this.recordingProps})
    }

  _startRecorderWorklet() {
    let isRecording = this.recorderNode.parameters.get('isRecording')
    isRecording.setValueAtTime(1, this.audioContext.currentTime);
  }

  _stopRecorderWorklet() {
    let isRecording = this.recorderNode.parameters.get('isRecording')
    isRecording.setValueAtTime(0, this.audioContext.currentTime);
  } 

  async _getTabInputNode() {
    this.stream = await chrome.tabCapture.capture({audio: true})
    this.audioContext.createMediaStreamSource(this.stream).connect(this.audioContext.destination)
    var input = this.audioContext.createMediaStreamSource(this.stream);
    return input
  }

  async _initRecorderNode() {
    await this.audioContext.audioWorklet.addModule(this.recordingProps.recorderWorkletPath)
    this.recorderNode = new window.AudioWorkletNode(this.audioContext, 'recorder-worklet', {parameterData: {numberOfChannels: this.recordingProps.additional_config.numChannels}});
    this._handleRecorderNodeEvents()
  }

  _handleRecorderNodeEvents() {
    this.recorderNode.port.onmessage = (event) => {
      var data = event.data
      switch(data.eventType) {
        case "data": 
        this.worker.postMessage({"command": "record", "buffer": data.audioBuffer, "bufferSize": data.bufferSize}); break;
        case "stop": this.worker.postMessage({"command": "finish"}); break;
        } 
      }    
  }

  _measureTime() {
    let now = Date.now()
    if ((now - this.recordingStartTime) / 1000 > this.recordingProps.additional_config.timeLimit) {
      this.stopRecording();
    }
  }

  async storeRecording(blob, eventType) {
    if (this.stream) {
      this.stream.getAudioTracks()[0].stop();
    }
    let dataURL = window.URL.createObjectURL(blob);
    await chrome.storage.local.set({'recordingURL': dataURL});
    const data = {'msg': 'recordingFinished', 'recordingURL': dataURL, 'blob': blob};
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
