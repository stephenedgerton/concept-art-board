import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

export async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpeg && ffmpeg.loaded) return ffmpeg;
    if (isLoading) {
        // Simple wait for loading
        while (isLoading) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (ffmpeg && ffmpeg.loaded) return ffmpeg;
    }

    isLoading = true;
    try {
        ffmpeg = new FFmpeg();

        // Load ffmpeg.wasm directly using static paths
        await ffmpeg.load({
            coreURL: '/ffmpeg/ffmpeg-core.js',
            wasmURL: '/ffmpeg/ffmpeg-core.wasm',
        });

        console.log('FFmpeg loaded successfully');
        isLoading = false;
        return ffmpeg;
    } catch (e) {
        isLoading = false;
        ffmpeg = null;
        console.error('Error loading FFmpeg', e);
        throw e;
    }
}

export async function createLowResVideo(videoBlob: Blob, outputFileName = 'output.webm'): Promise<Blob> {
    const ffmpeg = await getFFmpeg();
    if (!ffmpeg.loaded) {
        console.log("FFmpeg was not loaded, forcing load now...");
        await ffmpeg.load({
            coreURL: '/ffmpeg/ffmpeg-core.js',
            wasmURL: '/ffmpeg/ffmpeg-core.wasm',
        });
    }

    // Write the blob to a file in the virtual filesystem
    const inputName = 'input.mp4'; // We assume mp4/webm generically
    await ffmpeg.writeFile(inputName, await fetchFile(videoBlob));

    // Run the compression command
    // Generate a 360p video, 30fps
    const args = [
        '-i', inputName,
        '-vf', 'scale=-2:360', // height 360, relative width
        '-r', '30',            // force 30 fps
        '-c:v', 'libvpx-vp9',  // use vp9 for webm
        '-b:v', '500k',        // 500k bitrate
        '-c:a', 'libopus',     // keep audio but convert to opus
        '-b:a', '64k',         // lower audio bitrate
        outputFileName
    ];

    await ffmpeg.exec(args);

    // Read the output
    const data = await ffmpeg.readFile(outputFileName);

    // Cleanup memory in the virtual filesystem
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputFileName);

    // Return the compressed blob. 
    return new Blob([data as any], { type: 'video/webm' });
}
