const coverWrapper = document.getElementById('coverWrapper');
const videoPlayer = document.getElementById('videoPlayer');

coverWrapper.addEventListener('click', function() {
    coverWrapper.style.display = 'none';
    videoPlayer.style.display = 'block';
    videoPlayer.play();
});
