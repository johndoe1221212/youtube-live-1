import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByubdnNzRNASPIcswGJqNFd45cDWDs-xI",
  authDomain: "youtuube-43af7.firebaseapp.com",
  databaseURL: "https://youtuube-43af7-default-rtdb.firebaseio.com",
  projectId: "youtuube-43af7",
  storageBucket: "youtuube-43af7.appspot.com",
  messagingSenderId: "129367990971",
  appId: "1:129367990971:web:e95b6c464ffe9cef713f9e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Your YouTube livestream URL and key
const yt_stream = "rtmp://a.rtmp.youtube.com/live2/ffq1-15r3-jdut-ajsq-8auz";

// Variable to hold the FFmpeg process
let ffmpeg = null;

// Function to sanitize and escape special characters for FFmpeg
function escapeText(text) {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/"/g, '\\"').replace(/'/g, "\\'");
}

// Function to restart FFmpeg with the new comment
function startFFmpeg(comment, author) {
  // Kill the previous FFmpeg process if it exists
  if (ffmpeg) {
    console.log("Stopping previous FFmpeg process...");
    ffmpeg.kill('SIGINT');
  }

  // Sanitize the comment and author to prevent errors with special characters
  const sanitizedComment = escapeText(comment);
  const sanitizedAuthor = escapeText(author);

  // Get the path for the fonts located in the same repo
  const fontPathComicSans = path.join(__dirname, 'comic-sans-ms.ttf');
  const fontPathArial = path.join(__dirname, 'ARIAL.TTF');

  // Start a new FFmpeg process with the new comment
  console.log("Starting new FFmpeg process with comment:", sanitizedComment);

  ffmpeg = spawn(ffmpegPath, [
    '-f', 'lavfi',
    '-i', 'anoisesrc=r=44100',  // White noise audio source with sample rate 44100
    '-f', 'lavfi',
    '-i', 'testsrc=s=1280x720',   // Test pattern background
    '-vcodec', 'libx264',
    '-acodec', 'aac',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-g', '50',
    '-filter_complex',
      `[1:v]noise=alls=20:allf=t+u[noise];
       [noise][1:v]overlay,` +
       `drawtext=text='${sanitizedAuthor}':fontfile='${fontPathComicSans}':x=(w-text_w)/2:y=(h-text_h)/2-22:fontsize=43:fontcolor=brown,
       drawtext=text='${sanitizedComment}':fontfile='${fontPathArial}':x=(w-text_w)/2:y=(h+text_h)/2:fontsize=30:fontcolor=gray`,
    '-f', 'flv', // FLV format for RTMP
    yt_stream
  ]);

  // Handle FFmpeg stderr (error messages)
  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data.toString()}`);
  });

  // Handle FFmpeg process closure
  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });

  // Handle FFmpeg stdout (success messages)
  ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data.toString()}`);
  });
}

// Retrieve data from Firebase Realtime Database
const latestCommentRef = ref(db, 'latestComment');
onValue(latestCommentRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.text && data.author) {
    const comment = `${data.text}`;
    const author = `${data.author}`;

    console.log(`New comment from ${author}: ${comment}`);

    // Start or restart FFmpeg with the updated comment
    startFFmpeg(comment, author);
  }
});










