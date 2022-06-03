let canvas = document.getElementById('canvas')
let backgroundCanvas = document.getElementById('background')
let backgroundCanvasCtx = backgroundCanvas.getContext('2d')
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
    console.log(file.type);
    if (file.type.split('/')[0] === 'image') {
        let reader = new FileReader()
        reader.onload = () => {
            let image = new Image()
            image.src = reader.result
            addBackground(image)
        }
        reader.readAsDataURL(file)
    }
    else if (file.type.split('/')[0] === 'video') {
        let reader = new FileReader()
        reader.onload = () => {
            let buffer = reader.result;
            let videoBlob = new Blob([new Uint8Array(buffer)], { type: 'video/mp4' });
            let url = window.URL.createObjectURL(videoBlob);
            let video = document.createElement('video')
            video.src = url
            addBackground(video)
        }
        reader.readAsArrayBuffer(file)
    }
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
    if (backgroundList[currentBackgroundNumber] && backgroundList[currentBackgroundNumber].tagName == 'VIDEO') {
        let video = backgroundList[currentBackgroundNumber]
        video.pause();
        video.currentTime = 0;
    }
    currentBackgroundNumber = backgroundNumber
    updateBackgrounds()
    if (backgroundList[currentBackgroundNumber].tagName == 'VIDEO') {
        let video = backgroundList[currentBackgroundNumber]
        video.muted = true
        video.loop = true
        video.play()
    }
}
function deleteBackground(backgroundNumber) {
    backgroundList.splice(backgroundNumber, 1)
    if (currentBackgroundNumber == backgroundList.length) changeBackground(backgroundList.length - 1)
    else updateBackgrounds()
}
function updateBackgrounds() {
    backgroundListElement.innerHTML = ''
    backgroundList.map((background, index) => {
        if (background.tagName == 'IMG')
            backgroundListElement.innerHTML += `<li><i onclick='deleteBackground(${index})' class="fa-solid fa-circle-xmark"></i><img src='${background.src}' class='bg' onclick='changeBackground(${index})'></li>`
        else if (background.tagName == 'VIDEO')
            backgroundListElement.innerHTML += `<li><i onclick='deleteBackground(${index})' class="fa-solid fa-circle-xmark"></i><video src='${background.src}' class='bg' onclick='changeBackground(${index})'></video></li>`
    })
    let backgrounds = document.querySelectorAll('#background-list .bg')
    for (let background of backgrounds) {
        background.className = 'bg'
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
            backgroundCanvas.width = self.width;
            backgroundCanvas.height = self.height;
            self.timerCallback();
        }, false);
    },

    computeFrame: function () {
        backgroundCanvasCtx.clearRect(0, 0, this.width, this.height)
        if (backgroundList[currentBackgroundNumber])
            backgroundCanvasCtx.drawImage(backgroundList[currentBackgroundNumber], 0, 0, this.width, this.height);
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