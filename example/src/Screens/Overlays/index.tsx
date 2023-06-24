
import { Router, Stack } from "@react-motion-router/stack";
import Home from "./Home";
import Player from "./Modals/Player";
import Sheet from "./Modals/Sheet";
import { useEffect } from "react";
import { ModalAnimation } from "./Animations";
import '../../css/Modal.css';
import { iOS, isPWA } from "../..//common/utils";

interface OverlaysProps extends Stack.ScreenComponentProps {}
let isFirstLoad = false;
export default function Overlays(props: OverlaysProps) {
    useEffect(() => {
        props.navigation.addEventListener('navigate', (e) => {
            e.detail.signal.addEventListener('abort', () => {
                console.log("Aborted");
            });
        }, {once: true, capture: true});
        
        props.navigation.addEventListener('page-animation-end', () => isFirstLoad = true, {once: true});
        document.body.style.backgroundColor = 'rgba(254, 226, 85)';

        return () => {
            document.body.style.backgroundColor = 'unset';
        }
    }, []);

    const onProgress = (progress: number) => {
        // console.log(progress);
    }
    const modalConfig = {
        swipeDirection: 'down',
        swipeAreaWidth: window.innerHeight / 1.5,
        animation: ModalAnimation,
        disableDiscovery: false,
        hysteresis: 15
    } as const;
    return (
        <div className={`overlays ${isFirstLoad ? 'loaded' : 'suspense'}`}>
            <div style={{position: "absolute", width: "100vw", height: "100vh"}}>
                <Router config={{
                    disableBrowserRouting: isPWA() && iOS(),
                }}>
                    <Stack.Screen component={Home} path="/" config={{keepAlive: true}} />
                    <Stack.Screen component={Player} path="/player" config={modalConfig} defaultParams={{onProgress}} />
                    <Stack.Screen component={Sheet} path="/sheet" config={modalConfig} defaultParams={{onProgress}} />
                </Router>
            </div>
        </div>
    );
}