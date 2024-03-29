import { useContext, useEffect, useState } from "react";
import { Motion, NavigationBase, PlainObject, RouteProp, ScreenBaseProps } from "..";
import { MotionProgressEvent } from "../MotionEvents";
import { RouterDataContext } from "../RouterData";
import { RouteDataContext } from "../RouteData";

export function useReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const [prefersReducedMotion, setPreference] = useState(mediaQuery.matches);

    const onPreferenceChange = () => {
        setPreference(mediaQuery.matches);
    };

    mediaQuery.onchange = onPreferenceChange;

    return prefersReducedMotion;
}

export function useNavigation<T extends NavigationBase = NavigationBase>() {
    const routerData = useContext(RouterDataContext);
    if (routerData) {
        return routerData.navigation as NavigationBase;
    } else {
        throw new Error("RouterData is null. You may be trying to call useNavigation outside a Router.");
    }
}

export function useMotion() {
    const [motion, setMotion] = useState(useContext(Motion));
    const navigation = useNavigation();
    
    useEffect(() => {
        const onProgress = ({detail}: MotionProgressEvent) => {
            setMotion(detail.progress);
        }
        navigation.addEventListener('motion-progress', onProgress);

        return () => navigation.removeEventListener('motion-progress', onProgress);
    }, []);
    
    return motion;
}

export function useRoute<P extends ScreenBaseProps, T extends PlainObject>(): RouteProp<P, T> {
    const routeData = useContext(RouteDataContext);
    if (routeData) {
        return routeData as RouteProp<P, T>;
    } else {
        throw new Error("RouterData is null. You may be trying to call useRoute outside a Router.");
    }
}