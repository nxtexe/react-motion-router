import React, {createContext} from 'react';
import AnimationProvider from './AnimationProvider';
import { clamp } from './common/utils';
import AnimationKeyframePresets from './Animations';

export default class AnimationLayerData {
    private _progress: number = 0;
    private _play: boolean = true;
    private _isPlaying: boolean = false;
    private _currentScreen: AnimationProvider | null = null;
    private _nextScreen: AnimationProvider | null = null;
    private _onExit: Function | undefined;
    private _progressUpdateID: number = 0;
    private _duration: number = 0;
    private _inAnimation: Animation | null = null;
    private _outAnimation: Animation | null = null;
    private _playbackRate: number = 1;
    private _gestureNavigating: boolean = false;
    private _onEnd: Function | null = null;
    private _onProgress: ((progress: number) => void) | null = null;
    private _shouldAnimate: boolean = true;

    private updateProgress() {
        if (this._gestureNavigating && !this._play) {
            // update in set progress() instead
            window.cancelAnimationFrame(this._progressUpdateID);
            return;
        }
        const update = () => {
            const currentTime = this._outAnimation?.currentTime || 0;
            const progress = clamp((currentTime / this._duration) * 100, 0, 100);

            this._progress = progress;

            if (this._onProgress) {
                this._onProgress(this._progress);
            }
        }

        update();

        this._progressUpdateID = window.requestAnimationFrame(this.updateProgress.bind(this));
        this._outAnimation?.finished.then(() => {
            window.cancelAnimationFrame(this._progressUpdateID);
            if (this._progress !== 100) {
                update();
            }
        });
    }

    reset() {
        this._onEnd = null;
        this._playbackRate = 1;
        this._play = true;
        this._progress = 0;
        this._gestureNavigating = false;
    }

    finish() {
        if (this._inAnimation && this._outAnimation) {
            this._inAnimation.finish();
            this._outAnimation.finish();
        }
    }

    cancel() {
        if (this._inAnimation && this._outAnimation) {
            this._inAnimation.cancel();
            this._outAnimation.cancel();
        }
    }

    async animate() {
        if (this._isPlaying) {
            // cancel playing animation
            this.finish();
            if (this._onEnd) this._onEnd();
            if (this._nextScreen) await this._nextScreen.mounted(true);
            return;
        }
        if (this._currentScreen && this._nextScreen && this._shouldAnimate) {
            if (this._gestureNavigating) {
                await this._currentScreen.mounted(true);
            } 

            // failing to call _onExit to disable SETs
            if (this._onExit && this._shouldAnimate) this._onExit();
            await this._nextScreen.mounted(true);

            let easingFunction = this._gestureNavigating ? 'linear' : 'ease-out';
            let inKeyframes: Keyframe[] | PropertyIndexedKeyframes | null;
            let outKeyframes: Keyframe[] | PropertyIndexedKeyframes | null;
            if (Array.isArray(this._currentScreen.outAnimation)) { // predefined animation
                const [animation, userDefinedEasingFunction] = this._currentScreen.outAnimation;
                this._outAnimation = this._currentScreen.animate(AnimationKeyframePresets[animation], {
                    fill: 'both',
                    duration: this._duration,
                    easing: userDefinedEasingFunction || easingFunction
                });
                outKeyframes = AnimationKeyframePresets[animation];
            } else { // user provided animation
                let {keyframes, options} = this._currentScreen.outAnimation;
                if (typeof options === "number") {
                    options = {
                        duration: options,
                        easing: easingFunction,
                        fill: 'both'
                    };
                } else {
                    options = {
                        ...options,
                        easing: options?.easing || easingFunction,
                        duration: options?.duration || this.duration,
                        fill: options?.fill || 'both'
                    };
                }
                this._outAnimation = this._currentScreen.animate(keyframes, options);
                outKeyframes = keyframes;
            }
            if (Array.isArray(this._nextScreen.inAnimation)) { // predefined animation
                const [animation, userDefinedEasingFunction] = this._nextScreen.inAnimation;
                this._inAnimation = this._nextScreen.animate(AnimationKeyframePresets[animation], {
                    fill: 'both',
                    duration: this._duration,
                    easing: userDefinedEasingFunction || easingFunction
                });
                outKeyframes = AnimationKeyframePresets[animation];
            } else { // user provided animation
                let {keyframes, options} = this._nextScreen.inAnimation;
                if (typeof options === "number") {
                    options = {
                        duration: options,
                        easing: easingFunction,
                        fill: 'both'
                    };
                } else {
                    options = {
                        ...options,
                        fill: options?.fill || 'both',
                        duration: options?.duration || this.duration,
                        easing: options?.easing || easingFunction
                    };
                }
                this._inAnimation = this._nextScreen.animate(keyframes, options);
                outKeyframes = keyframes;
            }

            this._isPlaying = true;
            
            const startAnimationEvent = new CustomEvent('page-animation-start');
            window.dispatchEvent(startAnimationEvent);

            if (this._inAnimation && this._outAnimation) {
                if (!this._shouldAnimate) {
                    this.finish();
                    this._isPlaying = false;
                    this._shouldAnimate = true;
                    return;
                }

                this._inAnimation.playbackRate = this._playbackRate;
                this._outAnimation.playbackRate = this._playbackRate;
                
                if (this._gestureNavigating) {
                    this._inAnimation.currentTime = this._duration;
                    this._outAnimation.currentTime = this._duration;
                }

                if (!this._play) {
                    this._inAnimation.pause();
                    this._outAnimation.pause();
                    this._isPlaying = false;
                }

                this._outAnimation.ready.then(() => {
                    this.updateProgress();
                });
                this._outAnimation.onfinish = async () => {
                    if (this._outAnimation) {
                        this._outAnimation.commitStyles();
                        this._outAnimation.cancel();
                        this._outAnimation.onfinish = null;
                        this._outAnimation = null;
                    }
                    if (this._inAnimation) {
                        this._inAnimation.commitStyles();
                        this._inAnimation.cancel();
                        this._inAnimation = null;
                    }
                    // if playback rate is 2 then gesture navigation was aborted
                    if (!this._gestureNavigating || this._playbackRate === 0.5) {
                        if (this._currentScreen)
                            this._currentScreen.mounted(false);
                    } else {
                        if (this._nextScreen)
                            await this._nextScreen.mounted(false);
                    }
                    if (this._onEnd) {
                        this._onEnd();
                    }

                    this._isPlaying = false;

                    const endAnimationEvent = new CustomEvent('page-animation-end');
                    window.dispatchEvent(endAnimationEvent);
                }
            }
        } else {
            this._shouldAnimate = true;
        }
    }

    set onProgress(_onProgress: ((progress: number) => void) | null) {
        this._onProgress = _onProgress;
    }

    set onEnd(_onEnd: Function | null) {
        this._onEnd = _onEnd;
    }

    set shouldAnimate(_shouldAnimate: boolean)  {
        this._shouldAnimate = _shouldAnimate;
    }

    set playbackRate(_playbackRate: number) {
        this._playbackRate = _playbackRate;
        if (this._inAnimation && this._outAnimation) {
            this._inAnimation.playbackRate = this._playbackRate;
            this._outAnimation.playbackRate = this._playbackRate;
        }
    }

    set gestureNavigating(_gestureNavigating: boolean) {
        this._gestureNavigating = _gestureNavigating;
    }

    set play(_play: boolean) {
        if (this._play !== _play) {
            this._play = _play;

            if (this._play && this._gestureNavigating) {
                this.updateProgress();
            }

            if (this._inAnimation && this._outAnimation) {
                if (_play) {
                    this._inAnimation.play();
                    this._outAnimation.play();
                } else {
                    this._inAnimation.pause();
                    this._outAnimation.pause();
                }
            }
        }
    }

    set progress(_progress: number) {
        this._progress = _progress;
        if (this._onProgress) {
            this._onProgress(this._progress);
        }
        const currentTime = (this._progress / 100) * this._duration;
        if (this._inAnimation && this._outAnimation) {
            this._inAnimation.currentTime = currentTime;
            this._outAnimation.currentTime = currentTime;
        }
    }

    set currentScreen(_screen: AnimationProvider) {
        this._currentScreen = _screen;
    }

    set nextScreen(_screen: AnimationProvider) {
        this._nextScreen = _screen;
        if (!this._currentScreen) {
            _screen.mounted(true, false);
            this._nextScreen = null;
        }
    }

    set onExit(_onExit: Function | undefined) {
        this._onExit = _onExit;
    }

    set duration(_duration: number) {
        this._duration = _duration || 1;
    }
    get progress() {
        return this._progress;
    }

    get gestureNavigating() {
        return this._gestureNavigating;
    }
}

export const AnimationLayerDataContext = createContext<AnimationLayerData>(new AnimationLayerData());