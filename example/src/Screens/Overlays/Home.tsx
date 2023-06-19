import { Button } from '@mui/material';
import React, { useRef } from 'react';
import { Anchor, SharedElement } from '@react-motion-router/core';
import { Navigation } from '@react-motion-router/stack';
import King from "../../assets/king.webp";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import '../../css/Overlays.css';

interface OverlaysProps {
    navigation: Navigation;
}

export default function Overlays({navigation}: OverlaysProps) {
    const playerRef = useRef<HTMLDivElement | null>(null);

    const openSheet = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        let top = 0.9 * window.innerHeight;
        if (playerRef.current) top = playerRef.current.getBoundingClientRect().top + (0.05 * window.innerHeight);
        
        navigation.navigate('/player', {
            top: (top / window.innerHeight) * 100 // vh units
        }).catch((e) => console.log(e));
    }

    return (
        <>
            <div className="modal-example" style={{marginBlockStart: "100px"}}>
                <Anchor href="/sheet">
                    <Button>Open Modal</Button>
                </Anchor>
            </div>
            <div className="player" onClick={openSheet} ref={playerRef}>
                <div className="info">
                    <div className="cover-art">
                        <SharedElement id="cover-art" config={{
                            easingFunction: 'ease-out'
                        }}>
                            <img src={King} alt="" />
                        </SharedElement>
                    </div>
                    <div className="title">
                        <SharedElement id="title" config={{
                            type: 'fade-through'
                        }}>
                            <h6>Modal Sheet Example</h6>
                        </SharedElement>
                    </div>
                </div>
                <div className="play-controls">
                    <div className="play">
                        <SharedElement id="play" config={{
                            easingFunction: 'ease-out'
                        }}>
                            <PlayArrowIcon />
                        </SharedElement>
                    </div>
                    <div className="next">
                        <SharedElement id="next">
                            <SkipNextIcon />
                        </SharedElement>
                    </div>
                </div>
            </div>
        </>
    );
}