import React from 'react';
import { Navigation, SharedElement } from 'react-motion-router';
import BoredSaitama from '../assets/bored-saitama.gif';
import Button from '@mui/material/Button';
import '../css/NotFound.css';
import Navbar from '../Components/Navbar';

interface NotFoundProps {
    navigation: Navigation
}

export default function NotFound(props: NotFoundProps) {
    const imgWidth = window.screen.width > 400 ? 400 : window.screen.width;
    return (
        <div className="not-found">
            <SharedElement id="navbar" config={{
                type: 'fade'
            }}>
                <Navbar title="Not Found" backButton />
            </SharedElement>
            <div className="page-content">
                <h1>404 Not Found</h1>
                <img src={BoredSaitama} alt="gif" style={{width: imgWidth, height: imgWidth / 1.16}} />
                <Button variant="contained" onClick={() => props.navigation.navigate('/')}>Home</Button>
            </div>
        </div>
    );
}