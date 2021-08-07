import { BasicVideo } from './media'

export interface OpencvFlowPlayerMedia extends BasicVideo {
    /**
     * If true, the video file is assumed to include an optical flow video stacked horizontally, such that:
     * - the left half of the video contains the video to be displayed
     * - the right half of the video contains the optical flow video (hidden)
     */
    hasFlow?: boolean
    /**
     * Video fps. Required to obtain frame number from time (since frame number is not directly accesible in browsers).
     */
    fps: number
}

export interface OpencvFlowPlayerOptions {
    /**
     * If true, a countdown is shown before the video plays
     */
    countdown?: boolean
}

