import React from 'react';
import {Navigation, SharedElement} from 'react-motion-router';

interface DetailsProps {
    navigation: Navigation;
    route: {
        params: {
            [key:string]:any;
        }
    };
}

export default function Details(props: DetailsProps) {
    if (props.route.params.profile) {
        return (
            <div className="details" style={{width: "100%", height: "100%"}}>
                <button style={{position: "absolute"}} onClick={() => {props.navigation.go_back()}}>Back</button>
                <div className="profile-info">
                    <SharedElement config={{
                        transform_origin: 'bottom bottom',
                        x: {
                            duration: 300,
                            easing_function: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        },
                        y: {
                            duration: 200,
                            easing_function: 'ease-out'
                        }
                    }} id={props.route.params.profile.id}>
                        <img src={props.route.params.profile.photo} alt="profile-details" />
                    </SharedElement>
                    <SharedElement id={`title-${props.route.params.profile.id}`}>
                        <h1>{props.route.params.profile.name}</h1>
                    </SharedElement>
                    <p>{props.route.params.profile.description}</p>
                </div>
            </div>
        )
    } else {
        return (
            <div className="details">
                <h1>Return Home</h1>
                <button onClick={() => {props.navigation.go_back()}}>Back</button>
            </div>
        );
    }
}