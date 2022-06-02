let videoStream = null
let useFrontCamera = true; //camera trước
const constraints = {
    video: true
};
async function init() {
    constraints.video.facingMode = useFrontCamera ? "user" : "environment";
    try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        camera.srcObject = videoStream;
        processor.doLoad();
        camera.muted = true
        camera.play()
    } catch (error) {
        console.log(error)
    }
}
init();