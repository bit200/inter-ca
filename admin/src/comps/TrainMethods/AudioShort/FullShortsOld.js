import React, {useState, useEffect} from 'react';
import _ from 'underscore';
import './AudioShorts.css'
import {
    Link, Outlet
} from "react-router-dom";

let VIDEO_DOMAIN = 'http://localhost:1111'
let interimTranscript = '';
let finalTranscript = '';
let recognition;
let mediaRecorder;
let audioChunks = [];
let audioFile;
let aspectRatio = 1;
let _formData;


function Layout2(props) {

    let [cd, setCd] = useState(new Date());

    useEffect(() => {
        recognitionInit()
        // initWebCam()
        // setTimeout(() => {
        //     _takeShot();
        // }, 500)
    })

    let uploadToServerAudio = (formData) => {
        fetch(VIDEO_DOMAIN + '/api/upload-audio', {
            method: 'POST',
            body: formData,
        });
    }

    let _takeShot = () => {

        let _shots = [];
        let i = 0;
        let FPS = 5;

        function iter() {
            if (++i < 60 * FPS) {
                _shots.push({base: takeShot({})})
                setTimeout(iter, 1)

            } else {
               //console.log('done', _shots)
                uploadImgsToServer(_shots)
            }

        }

        iter()

        // while (i < 100) {
        //     _shots.push({base: takeShot()})
        // }
        // console.log('_shots', _shots)
        // takeShot({}, () => {
        // })
    }
    return <div className='audio-short'>
        Audio Shorts
        <audio controls src={VIDEO_DOMAIN + '/test.wav'}>
        </audio>
        <button onClick={() => {
            recognitionStart((formData, url) => {
                _formData = url;
               //console.log('recognition Start CB!!!', finalTranscript, _formData)
                document.querySelector('#hh').src = _formData
                uploadToServerAudio(formData)
                setTimeout(() => {
                   //console.log('xxxxxx', finalTranscript)
                }, 1000)
                // setCd(new Date())
            })
        }}>
            Start
        </button>
        <button onClick={() => {
            recognitionStop()
        }}>
            Stop
        </button>
        <div>

        </div>
        <div>Audio image 1</div>
        <hr/>
        <audio id="hh" controls></audio>
        <hr/>

        <div>Audio image 2</div>
        <video id="webcam" autoPlay width="300" height="300"></video>
        <canvas id="canvas" style={{"display": "none"}}></canvas>
        <button id="captureButton" onClick={_takeShot}>Capture and Process</button>
        <p>Compressed Image Size: <span id="sizeDisplay"></span> bytes</p>
        <img src="" id="capture"/>
    </div>
}


// const base64Files = [
//     // {
//     //     base64Data: "encoded data 1",
//     //     fileName: "file2.txt",
//     //     mimeType: "text/plain",
//     // },
//     // Add more files as needed
// ];

// const additionalData = {
//     title: "File Upload",
//     desc: "Description of the uploaded files",
//     name: "John Doe",
//     folder: '15125125'
//     // Add more key-value pairs for additional data
// };

// sendBase64FilesWithAdditionalDataToServer(base64Files, additionalData);

function uploadImgsToServer(base64Files, data) {

    base64Files = base64Files.map(it => {
        return {...it, base: (it.base || '').replace('data:image/jpeg;base64,', '')}
    })
    global.http.post('/upload-video-by-images', {
        files: base64Files, data
    }, {domain: VIDEO_DOMAIN}).then(r => {
       //console.log('rrrrrr', r)
    })

}


function takeShot({videoWidth = 300}, cb) {
    const video = document.getElementById('webcam');
    canvas.width = videoWidth;//videoWidth;
    canvas.height = videoWidth / (aspectRatio || 1);//;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the captured image as a data URL
    const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.6); // JPEG format with 80% quality

    // Display the compressed image size
    // const capturedData = atob(capturedDataUrl.split(',')[1]);
    // const sizeBytes = capturedData.length;
    // sizeDisplay.textContent = Math.round(sizeBytes / 1000) + ' Kb';
    // document.querySelector('#capture').setAttribute('src', capturedDataUrl)
    return capturedDataUrl;

}

function initWebCam() {
    const video = document.getElementById('webcam');

    navigator.mediaDevices.getUserMedia({video: true})
        .then(stream => {
            // window.stream = stream;
            video.srcObject = stream;
            aspectRatio = stream.getVideoTracks()[0].getSettings().aspectRatio;
        })
        .catch(error => {
            console.error('Error accessing webcam:', error);
        });

}

function recognitionStart(cb) {

   //console.log('recognitionInit', recognition)
    finalTranscript = ''
    interimTranscript = '';

    recognition.start();

    if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
    }

    navigator.mediaDevices
        .getUserMedia({audio: true})
        .then((stream) => {
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream, {
                //   mimeType: 'audio/ogg; codecs=opus',
                audioBitsPerSecond: 16000, // Adjust as needed (e.g., 32000 for 32 kbps)
                sampleRate: 16000, // Adjust as needed (e.g., 16000 Hz)
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, {type: 'audio/wav'}); // You can change the format if needed
                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.wav');


                audioFile = formData;
                audioChunks = [];
                cb && cb(audioFile, URL.createObjectURL(audioBlob));

               //console.log('ON STOP MEDIA RECORDER11!!!!!!', audioFile)
            };

            mediaRecorder.start();
            // startRecordingButton.disabled = true;
            // stopRecordingButton.disabled = false;
        })
        .catch((error) => {
            mediaRecorder = {}
            mediaRecorder.onstop = () => {
                cb && cb(audioFile, 'url');
            };
            console.error('Error accessing microphone:', error);
        });

}

function recognitionInit(cb) {
    recognition = new webkitSpeechRecognition(); // Create a SpeechRecognition object

    recognition.lang = 'ru-EN'; // Set the language for recognition (e.g., 'en-US' for English)
    recognition.interimResults = true; // Enable interim results
    recognition.continuous = true;


    recognition.onresult = (event) => {

        interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        // console.log('stop RECOGNITION!!!', interimTranscript)
        // window.stopRecognition && window.stopRecognition
        // transcriptionDiv.innerHTML = finalTranscript; // Display the final transcription
    };

}

function recognitionStop() {


    mediaRecorder && mediaRecorder.stop && mediaRecorder.stop();
    recognition && recognition.stop && recognition.stop();
    mediaRecorder && mediaRecorder.onstop && mediaRecorder.onstop();
    // wid

    // console.log('STOPPPP finalTranscript!!!', interimTranscript, finalTranscript)

    // setTimeout(() => {
    //    //console.log('STOPPPP finalTranscript', interimTranscript, finalTranscript, audioFile)
    // }, 1000)

    // startRecordingButton.disabled = false;
    // stopRecordingButton.disabled = true;

}


export default Layout2