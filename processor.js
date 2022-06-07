let canvas = document.getElementById('canvas')
let camera = document.createElement('video')
camera.width = 480
camera.height = 320

let greenScreenCheckbox = document.getElementById('green-screen')
let mirrorCheckbox = document.getElementById('mirror')
mirrorCheckbox.onchange = () => {
    if (mirrorCheckbox.checked)
        canvas.style.transform = 'rotateY(180deg)'
    else
        canvas.style.transform = ''
}

let colorPicker = document.getElementById('color')
let colorArr = hexToRgb(colorPicker.value)
let blurBackground = document.getElementById('blur')
colorPicker.onclick = (event) => {
    event.preventDefault()
    let hasMirrored = mirrorCheckbox.checked
    canvas.style.transform = ''
    blurBackground.style.display = 'block'
    colorPicker.dataset.active = 'true'
    canvas.style.cursor = 'crosshair'
    window.onclick = (event) => {
        if (event.target == canvas && canvas.style.cursor == 'crosshair') {
            canvas.style.cursor = ''
            let eventLocation = getEventLocation(canvas, event);
            let context = canvas.getContext('2d');
            let pixelData = context.getImageData(eventLocation.x, eventLocation.y, 1, 1).data;
            let hex = "#" + ("000000" + rgbToHex(pixelData[0], pixelData[1], pixelData[2])).slice(-6);
            colorPicker.value = hex
            colorArr = hexToRgb(colorPicker.value)
            function getElementPosition(obj) {
                let curleft = 0, curtop = 0;
                if (obj.offsetParent) {
                    do {
                        curleft += obj.offsetLeft;
                        curtop += obj.offsetTop;
                    } while (obj = obj.offsetParent);
                    return { x: curleft, y: curtop };
                }
                return undefined;
            }

            function getEventLocation(element, event) {
                let pos = getElementPosition(element);

                return {
                    x: (event.pageX - pos.x),
                    y: (event.pageY - pos.y)
                };
            }
        }

        if (event.target !== colorPicker) {
            if (hasMirrored)
                canvas.style.transform = 'rotateY(180deg)'
            blurBackground.style.display = 'none'
            colorPicker.dataset.active = 'false'
            canvas.style.cursor = ''
        }
    }
}
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}
function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

let backgroundInput = document.getElementById('upload-background')
backgroundInput.onchange = () => {
    if (!backgroundInput.value) return
    let file = backgroundInput.files[0]
    let reader = new FileReader()
    reader.onload = () => {
        addBackground(reader.result)
    }
    reader.readAsDataURL(file)
    backgroundInput.value = ''
}

// let rotateButton = document.getElementById('rotate')
// rotateButton.onclick = () => {
//     let canvasRotatedDegree = getRotatedDegree(canvas)
//     canvas.style.transform = `rotate(${canvasRotatedDegree - 90}deg)`
//     backgroundCanvas.style.transform = `rotate(${canvasRotatedDegree - 90}deg)`
//     function getRotatedDegree(element) {
//         let transform = element.style.transform || false
//         if (transform)
//             return Number(transform.slice(7).split('deg')[0])
//         return 0
//     }
// }

let backgroundList = []
let backgroundListElement = document.getElementById('background-list')
let currentBackgroundNumber

function addBackground(background) {
    backgroundList.push(background)
    changeBackground(backgroundList.length - 1)
}
function changeBackground(backgroundNumber) {
    currentBackgroundNumber = backgroundNumber
    canvas.style.backgroundImage = `url(${backgroundList[backgroundNumber]})`
    updateBackgrounds()
}
function deleteBackground(backgroundNumber) {
    backgroundList.splice(backgroundNumber, 1)
    if (currentBackgroundNumber == backgroundList.length) changeBackground(backgroundList.length - 1)
    else updateBackgrounds()
}
function updateBackgrounds() {
    backgroundListElement.innerHTML = ''
    backgroundList.map((url, index) => {
        backgroundListElement.innerHTML += `<li>
            <i onclick='deleteBackground(${index})' class="fa-solid fa-circle-xmark"></i>
            <img src='${url}' onclick='changeBackground(${index})'>
            </li>`
    })
    let backgrounds = document.querySelectorAll('#background-list img')
    for (let background of backgrounds) {
        background.className = ''
    }
    if (backgrounds[currentBackgroundNumber])
        backgrounds[currentBackgroundNumber].classList.add('active')
}

let processor = {
    timerCallback: function () {
        if (this.video.paused || this.video.ended) {
            return;
        }
        this.computeFrame();
        let self = this;
        setTimeout(function () {
            self.timerCallback();
        }, 0);
    },

    doLoad: function () {
        this.video = camera;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        let self = this;
        this.video.addEventListener("play", function () {
            self.width = self.video.width;
            self.height = self.video.height;
            self.canvas.width = self.width;
            self.canvas.height = self.height;
            self.timerCallback();
        }, false);
    },

    computeFrame: function () {
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height)
        let frame = this.ctx.getImageData(0, 0, this.width, this.height)
        let l = frame.data.length / 4;
        if (greenScreenCheckbox.checked && colorPicker.dataset.active == 'false') {
            for (let i = 0; i < l; i++) {
                let r = frame.data[i * 4 + 0];
                let g = frame.data[i * 4 + 1];
                let b = frame.data[i * 4 + 2];
                if (Math.abs(g - colorArr[1]) < 50 && Math.abs(r - colorArr[0]) < 50 && Math.abs(b - colorArr[2]) < 50)
                    frame.data[i * 4 + 3] = 0;
            }
        }
        this.ctx.putImageData(frame, 0, 0);
        return;
    }
};

let imagesContainer = document.getElementById('images-container')
let captureButton = document.getElementById('capture')
let imagesList = []
let imagesListElement = document.getElementById('images-list')

captureButton.onclick = () => {
    html2canvas(canvas).then(canvas => {
        addImage(canvas.toDataURL())
    });
}

function addImage(url) {
    imagesList.push(url)
    updateImages()
}
function deleteImage(imageNumber) {
    imagesList.splice(imageNumber, 1)
    updateImages()
}
function updateImages() {
    imagesListElement.innerHTML = ''
    imagesContainer.style.display = imagesList.length ? 'block' : 'none'
    imagesList.map((url, index) => {
        imagesListElement.innerHTML += `<li><i onclick='deleteImage(${index})' class="fa-solid fa-circle-xmark"></i><img src='${url}'></li>`
    })
}

let videosContainer = document.getElementById('videos-container')
let recordButton = document.getElementById('record')
let videosList = []
let videosListElement = document.getElementById('videos-list')
let recording = false

let recorder
let canvasStream
let audioStream
recordButton.onclick = () => {
    recording = !recording
    if (recording) {
        recordButton.innerText = 'Stop'
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (_audioStream) {
            audioStream = _audioStream
            canvasStream = canvas.captureStream();

            let finalStream = new MediaStream();
            getTracks(audioStream, 'audio').forEach(function (track) {
                finalStream.addTrack(track);
            });
            getTracks(canvasStream, 'video').forEach(function (track) {
                finalStream.addTrack(track);
            });

            recorder = RecordRTC(finalStream, {
                type: 'video'
            });
            recorder.startRecording();
        });
    } else {
        recordButton.innerText = 'Record video'
        recorder.stopRecording(function () {
            let blob = recorder.getBlob();
            let url = URL.createObjectURL(blob)
            addVideo(url)
            audioStream.stop();
            canvasStream.stop();
        });
    }
}

function addVideo(url) {
    videosList.push(url)
    updateVideos()
}

function updateVideos() {
    videosListElement.innerHTML = ''
    videosContainer.style.display = videosList.length ? 'block' : 'none'
    videosList.map((url, index) => {
        videosListElement.innerHTML += `<li><i onclick='deleteVideo(${index})' class="fa-solid fa-circle-xmark"></i><video src='${url}' controls></video></li>`
    })
}

function deleteVideo(videoNumber) {
    videosList.splice(videoNumber, 1)
    updateVideos()
}