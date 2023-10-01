import { SharedElement, SharedElementNode, SharedElementScene } from './SharedElement';
import { clamp, interpolate } from './common/utils';
import { EasingFunction, PlainObject } from './common/types';
import { MotionProgressEvent } from './MotionEvents';
import AnimationLayerData, { AnimationLayerDataContext } from './AnimationLayerData';
import NavigationBase from './NavigationBase';
import { Component } from 'react';
import { MAX_PROGRESS, MAX_Z_INDEX, MIN_PROGRESS } from './common/constants';

interface GhostLayerProps {
    instance?: (instance: GhostLayer | null) => any;
    backNavigating: boolean;
    gestureNavigating: boolean;
    navigation: NavigationBase;
    animationLayerData: AnimationLayerData;
}

interface GhostLayerState {
    transitioning: boolean;
    playing: boolean;
}

interface TransitionXYState {
    delay: number;
    duration: number;
    easingFunction: EasingFunction;
    position: number;
    node: HTMLElement;
}

interface TransitionState {
    id: string;
    start: {
        x: TransitionXYState;
        y: TransitionXYState;
    };
    end: {
        x: TransitionXYState;
        y: TransitionXYState;
    }
}

export default class GhostLayer extends Component<GhostLayerProps, GhostLayerState> {
    private ref: HTMLDialogElement | null = null;
    private _currentScene: SharedElementScene | null = null;
    private _nextScene: SharedElementScene | null = null;
    private animationSet = new Set<Animation>();
    static contextType = AnimationLayerDataContext;
    context!: React.ContextType<typeof AnimationLayerDataContext>;
    private onProgressStartListener = this.onProgressStart.bind(this) as EventListener;
    private onProgressListener = this.onProgress.bind(this) as EventListener;
    private onProgressEndListener = this.onProgressEnd.bind(this) as EventListener;
    
    state: GhostLayerState = {
        transitioning: false,
        playing: true
    }

    get currentScene() {
        return this._currentScene;
    }

    get nextScene() {
        return this._nextScene;
    }

    set currentScene(scene: SharedElementScene | null) {
        this._currentScene = scene;
    }

    set nextScene(scene: SharedElementScene | null) {
        this._nextScene = scene;

        if (this._currentScene && this._nextScene) {
            // lets sure async components after this point know transition is impossible
            this._currentScene.canTransition = !this.context!.isStarted;
            this._nextScene.canTransition = !this.context!.isStarted;
            if (!this._currentScene.isEmpty() && !this._nextScene.isEmpty()) {
                this.sharedElementTransition(this._currentScene, this._nextScene);
                return;
            }
        }
    }

    finish() {
        for (const animation of this.animationSet.values()) {
            animation.finish();
        }
    }

    sharedElementTransition(currentScene: SharedElementScene, nextScene: SharedElementScene) {
        if (this.context.duration === 0) return;
        if (this.state.transitioning) {
            this.finish(); // cancel playing animation
            return;
        }
        
        const onEnd = () => {
            this.setState({transitioning: false});
            this.animationSet.clear();
            this._nextScene = null;
            this._currentScene = null;
        };

        const onCancel = () => {
            for (const animation of this.animationSet.values())
                animation.cancel();
            onEnd();
        }
        
        const onFrame = requestAnimationFrame.bind(null, async () => {
            // render ghost layer in top layer
            this.ref?.showModal();
            for (const [id, start] of currentScene.nodes) {
                //if id exists in next scene
                if (nextScene.nodes.has(id)) {
                    const end = nextScene.nodes.get(id) as SharedElementNode;
                    const endInstance = end.instance;
                    const startInstance = start.instance;
                    const transitionType = endInstance.transitionType || startInstance.transitionType || 'morph';
                    const startNode = start.instance.node;
                    const endNode = nextScene.nodes.get(id)!.instance.node;
                    if (!startNode || !endNode) continue;
                    const startChild = startNode.firstElementChild as HTMLElement | undefined;
                    const endChild = endNode.firstElementChild as HTMLElement | undefined;
                    if (!startChild || !endChild) continue;
                    const startRect = startInstance.clientRect;
                    const endRect = endInstance.clientRect;

                    let startCSSText: string;
                    let startCSSObject: PlainObject<string> = {};
                    let endCSSText: string;
                    let endCSSObject: PlainObject<string> = {};

                    // only get css object when transition type is morph
                    if (transitionType === "morph") {
                        [startCSSText, startCSSObject] = startInstance.CSSData;
                        [endCSSText, endCSSObject] = endInstance.CSSData;
                    } else {
                        startCSSText = startInstance.CSSText;
                        endCSSText = endInstance.CSSText;
                    }
                    
                    startChild.style.cssText = startCSSText;
                    if (transitionType !== "morph") {
                        endChild.style.cssText = endCSSText;

                        endNode.style.position = 'absolute';
                        endChild.style.position = 'absolute';
                        endNode.style.zIndex = endChild.style.zIndex;
                        endNode.style.top = '0';
                        endNode.style.left = '0';
                    }
                    
                    startNode.style.position = 'absolute';
                    startChild.style.position = 'absolute';
                    startNode.style.zIndex = startChild.style.zIndex;
                    startNode.style.top = '0';
                    startNode.style.left = '0';
                    
                    const transitionState: TransitionState = {
                        id: startInstance.id,
                        start: {
                            x: {
                                node: startNode,
                                delay: startInstance.props.config?.x?.delay ?? endInstance.props.config?.delay ?? 0,
                                duration: startInstance.props.config?.x?.duration || endInstance.props.config?.duration || this.context.duration,
                                easingFunction: startInstance.props.config?.x?.easingFunction || startInstance.props.config?.easingFunction ||'ease',
                                position: startRect.x - currentScene.x,
                                // position: startRect.x
                                
                            },
                            y: {
                                node: startChild,
                                delay: startInstance.props.config?.y?.delay ?? endInstance.props.config?.delay ?? 0,
                                duration: startInstance.props.config?.y?.duration || endInstance.props.config?.duration || this.context.duration,
                                easingFunction: startInstance.props.config?.y?.easingFunction || startInstance.props.config?.easingFunction || 'ease',
                                position: startRect.y - currentScene.y,
                                // position: startRect.y
                            }
                        },
                        end: {
                            x: {
                                node: endNode,
                                delay: endInstance.props.config?.x?.delay ?? endInstance.props.config?.delay ?? 0,
                                duration: endInstance.props.config?.x?.duration || endInstance.props.config?.duration || this.context.duration,
                                easingFunction: endInstance.props.config?.x?.easingFunction || endInstance.props.config?.easingFunction || 'ease',
                                position: endRect.x - nextScene.x,
                                // position: endRect.x
                            },
                            y: {
                                node: endChild,
                                delay: endInstance.props.config?.y?.delay ?? endInstance.props.config?.delay ?? 0,
                                duration: endInstance.props.config?.y?.duration || endInstance.props.config?.duration || this.context.duration,
                                easingFunction: endInstance.props.config?.x?.easingFunction || endInstance.props.config?.easingFunction || 'ease',
                                position: endRect.y - nextScene.y,
                                // position: endRect.y
                            }
                        }
                    };

                    startNode.style.transform = `translate(${transitionState.start.x.position}px, 0px)`;
                    startChild.style.transform = `translate(0px, ${transitionState.start.y.position}px)`;
                    endNode.style.transform = `translate(${transitionState.end.x.position}px, 0px)`;
                    endChild.style.transform = `translate(0px, ${transitionState.end.y.position}px)`;

                    startNode.style.display = 'unset';

                    this.ref?.appendChild(startNode);
                    startInstance.onCloneAppended(startNode);

                    if (transitionType !== "morph") {
                        const startZIndex = parseInt(startNode.style.zIndex) || 0;
                        const endZIndex = parseInt(endNode.style.zIndex) || 0;
                        endNode.style.zIndex = `${clamp(endZIndex, 0, startZIndex - 1)}`;
                        endNode.style.display = 'unset';
                        this.ref?.appendChild(endNode);
                        endInstance.onCloneAppended(endNode);
                    } else {
                        endInstance.onCloneAppended(startNode);
                    }

                    startInstance.hidden(true);
                    endInstance.hidden(true);
                    
                    let startXAnimation;
                    let startYAnimation;
                    let endXAnimation;
                    let endYAnimation;

                    startNode.style.willChange = 'contents, transform, opacity';
                    if (transitionType !== "morph")
                        endNode.style.willChange = 'contents, transform, opacity';

                    if (transitionType === "morph") {
                        startXAnimation = transitionState.start.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-start`
                        });
                        startYAnimation = transitionState.start.y.node.animate(
                            [
                                {
                                    ...startCSSObject,
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    ...endCSSObject,
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-start`
                            }
                        );
                    } else if (transitionType === "fade") {
                        startXAnimation = transitionState.start.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`,
                                opacity: 1
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`,
                                opacity: 0
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-start`
                        });
                        startYAnimation = transitionState.start.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-start`
                            }
                        );

                        endXAnimation = transitionState.end.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-end`
                        });
                        endYAnimation = transitionState.end.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-end`
                            }
                        );
                    } else if (transitionType === "fade-through") {
                        startXAnimation = transitionState.start.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`,
                                opacity: 1
                            },
                            {
                                opacity: 0,
                                offset: 0.5
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`,
                                opacity: 0
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-start`
                        });
                        startYAnimation = transitionState.start.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-start`
                            }
                        );

                        endXAnimation = transitionState.end.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`,
                                opacity: 0
                            },
                            {
                                opacity: 0,
                                offset: 0.5
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`,
                                opacity: 1
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-end`
                        });
                        endYAnimation = transitionState.end.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-end`
                            }
                        );
                    } else { // cross-fade
                        startXAnimation = transitionState.start.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`,
                                opacity: 1
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`,
                                opacity: 0
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-start`
                        });
                        startYAnimation = transitionState.start.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-start`
                            }
                        );

                        endXAnimation = transitionState.end.x.node.animate([
                            {
                                transform: `translate(${transitionState.start.x.position}px, 0px)`,
                                opacity: 0
                            },
                            {
                                transform: `translate(${transitionState.end.x.position}px, 0px)`,
                                opacity: 1
                            }
                        ],
                        {
                            fill: 'both',
                            easing: transitionState.end.x.easingFunction,
                            duration: transitionState.end.x.duration,
                            delay: transitionState.end.x.delay,
                            id: `${id}-x-end`
                        });
                        endYAnimation = transitionState.end.y.node.animate(
                            [
                                {
                                    transform: `translate(0px, ${transitionState.start.y.position}px)`
                                },
                                {
                                    transform: `translate(0px, ${transitionState.end.y.position}px)`
                                }
                            ],
                            {
                                fill: 'both',
                                easing: transitionState.end.y.easingFunction,
                                duration: transitionState.end.y.duration,
                                delay: transitionState.end.y.delay,
                                id: `${id}-y-end`
                            }
                        );
                    }
                    const animations = [startXAnimation, startYAnimation, endXAnimation, endYAnimation];
                    this.animationSet.add(startXAnimation);
                    this.animationSet.add(startYAnimation);
                    endXAnimation && this.animationSet.add(endXAnimation);
                    endYAnimation && this.animationSet.add(endYAnimation);
                    
                    if (!this.state.playing) {
                        animations.forEach((animation: Animation | undefined) => {
                            if (!animation) return;
                            const defaultDuration = this.context.duration;
                            let duration = animation.effect?.getComputedTiming().duration;
                            if (typeof duration === "string") {
                                duration = parseFloat(duration);
                            }
                            duration = duration || defaultDuration;
                            
                            animation.currentTime = duration;
                            animation.pause();
                        });
                    }

                    const onEnd = async () => {
                        console.assert(id === endInstance.id, "Not sure what happened here.");
                        console.assert(id === startInstance.id, "Not sure what happened here.");
                        startNode.style.willChange = 'auto';
                        if (transitionType !== "morph")
                            endNode.style.willChange = 'auto';
                        await endInstance.hidden(false);
                        if (!currentScene.keepAlive || !this.state.playing) {
                            startInstance.keepAlive(false);
                            await startInstance.hidden(false); // if current scene is kept alive do not show start element
                        } else {
                            startInstance.keepAlive(true);
                        }
                        
                        if (!this.state.playing) return;
                        startInstance.onCloneRemove(startNode);
                        if (transitionType !== "morph") {
                            endInstance.onCloneRemove(endNode);
                            endNode.remove();
                        } else {
                            endInstance.onCloneRemove(startNode);
                        }
                        startNode.remove();
                    };
                    const onCancel = async () => {
                        startNode.style.willChange = 'auto';
                        if (transitionType !== "morph")
                            endNode.style.willChange = 'auto';
                        await startInstance.hidden(false);
                        await endInstance.hidden(false);
                    };
                    Promise.all(
                        animations.map(anim => anim?.finished)
                    ).then(onEnd).catch(onCancel);
                    // this.props.navigation.addEventListener('page-animation-end', onEnd, {once:true});
                }
            }
            
            if (this.ref) {
                Promise.all(
                    [...this.animationSet].map(anim => anim.finished)
                ).then(onEnd).catch(onCancel);
            }
        });
        this.setState({transitioning: true}, onFrame);

        this.props.navigation.addEventListener('page-animation-cancel' , onCancel, {once: true});
    }
    
    componentDidMount() {
        if (this.props.instance) {
            this.props.instance(this);
        }

        this.props.navigation.addEventListener('motion-progress-start', this.onProgressStartListener, {capture: true});

    }

    componentWillUnmount() {
        this.props.navigation.removeEventListener('motion-progress-start', this.onProgressStartListener, {capture: true});
    }

    onProgressStart() {
        this.setState({playing: false});
        this.props.navigation.addEventListener('motion-progress', this.onProgressListener, {capture: true});
        this.props.navigation.addEventListener('motion-progress-end', this.onProgressEndListener, {capture: true});
    }

    onProgress(e: MotionProgressEvent) {
        if (!this.state.playing) {
            for (const animation of this.animationSet.values()) {
                const progress = e.detail.progress;
                const defaultDuration = this.context.duration;
                let duration = animation.effect?.getComputedTiming().duration;
                duration = Number(duration || defaultDuration);

                const currentTime = interpolate(progress, [MIN_PROGRESS, MAX_PROGRESS], [0, Number(duration)]);
                animation.currentTime = currentTime;
            }
        }
    }

    onProgressEnd() {
        if (!this.state.playing) this.finish();
        this.setState({playing: true, transitioning: false});
        this.animationSet.clear();
        this.props.navigation.removeEventListener('motion-progress', this.onProgressListener, {capture: true});
        this.props.navigation.removeEventListener('motion-progress-end', this.onProgressEndListener, {capture: true});
    }

    render() {
        if (this.state.transitioning) {
            return (
                <dialog id="ghost-layer" ref={c => this.ref = c} style={{
                    position: 'absolute',
                    zIndex: MAX_Z_INDEX,
                    maxWidth: 'unset',
                    maxHeight: 'unset',
                    width: '100vw',
                    height: '100vh',
                    contain: 'strict',
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'transparent'
                }}>
                    <style dangerouslySetInnerHTML={{__html: "#ghost-layer::backdrop {display: none}"}}></style>
                </dialog>
            );
        } else {
            return <></>
        }
    }
}