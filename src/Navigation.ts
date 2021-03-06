import { ParamsDeserialiser, ParamsSerialiser } from "./common/types";
import History from "./History";

export type BackEvent = CustomEvent<{replaceState:boolean}>;
interface NavigateEventDetail {
    route: string;
    routeParams?: any;
}

export type NavigateEvent = CustomEvent<NavigateEventDetail>;

export default class Navigation {
    private _history;
    private _disableBrowserRouting: boolean;
    private _currentParams: {[key:string]: any} = {};
    private _paramsSerialiser?: ParamsSerialiser;
    private _paramsDeserialiser?: ParamsDeserialiser;

    constructor(_disableBrowserRouting: boolean, _defaultRoute?: string | null) {
        this._disableBrowserRouting = _disableBrowserRouting;
        this._history = new History(_defaultRoute || null);
    }

    navigate(route: string, routeParams?: {[key:string]: any}, replace?: boolean) {
        if (this._disableBrowserRouting) {
            this._history.implicitPush(route, Boolean(replace));
        } else {
            this._history.push(route, Boolean(replace));
        }

        const event = new CustomEvent<NavigateEventDetail>('navigate', {
            detail: {
                route: route,
                routeParams: routeParams
            }
        });

        window.dispatchEvent(event);
        this._currentParams = routeParams || {};
    }

    implicitNavigate(route: string, routeParams?: {[key:string]: any}) {
        this._history.implicitPush(route);
        
        const event = new CustomEvent<NavigateEventDetail>('navigate', {
            detail: {
                route: route,
                routeParams: routeParams
            }
        });

        window.dispatchEvent(event);
        this._currentParams = routeParams || {};
    }

    implicitBack() {
        this._history.implicitBack();
        let event = new CustomEvent<{replaceState:boolean}>('go-back', {
            detail: {
                replaceState: false
            }
        });
        window.dispatchEvent(event);
    }

    goBack() {
        let event = new CustomEvent<{replaceState:boolean}>('go-back', {
            detail: {
                replaceState: false
            }
        });
        if (this._history.defaultRoute && this._history.length === 1) {
            this._history.back(true);
            event = new CustomEvent<{replaceState:boolean}>('go-back', {
                detail: {
                    replaceState: true
                }
            });
        } else {
            if (this._disableBrowserRouting) {
                this._history.implicitBack();
            } else {
                this._history.back();
            }
        } 

        window.dispatchEvent(event);
    }

    searchParamsToObject(searchPart: string) {
        const deserialiser = this._paramsDeserialiser || this._history.searchParamsToObject;
        this._currentParams = deserialiser(searchPart) || {};
        return this._currentParams;
    }

    searchParamsFromObject(params: {[key: string]: any}) {
        try {
            const serialiser = this._paramsSerialiser || function(paramsObj) {
                return new URLSearchParams(paramsObj).toString();
            }
            return serialiser(params);
        } catch (e) {
            console.error(e);
            console.warn("Non JSON serialisable value was passed as route param to Anchor.");
        }
        return '';
    }

    private assign(url: string | URL) {
        url = new URL(url, window.location.origin);
        if (url.origin === location.origin) {
            this.navigate(url.pathname);
        } else {
            location.assign(url);
        }
    }

    private replace(url: string | URL) {
        url = new URL(url, window.location.origin);
        if (url.origin === location.origin) {
            this.navigate(url.pathname, {}, true);
        } else {
            location.replace(url);
        }
    }

    set paramsDeserialiser(_paramsDeserialiser: ParamsDeserialiser | undefined) {
        this._paramsDeserialiser = _paramsDeserialiser;
    }

    set paramsSerialiser(_paramsSerialiser: ParamsSerialiser | undefined) {
        this._paramsSerialiser = _paramsSerialiser;
    }

    get paramsDeserialiser(): ParamsDeserialiser | undefined {
        return this._paramsDeserialiser;
    }

    get paramsSerialiser(): ParamsSerialiser | undefined {
        return this._paramsSerialiser;
    }

    get history() {
        return this._history;
    }

    get location(): Location {
        const {location} = window;
        
        return {
            ancestorOrigins: location.ancestorOrigins,
            assign: this.assign.bind(this),
            hash: location.hash,
            host: location.host,
            hostname: location.hostname,
            href: new URL(this._history.current, location.origin).href,
            origin: location.origin,
            pathname: this._history.current,
            port: location.port,
            protocol: location.protocol,
            reload() {
                location.reload();
            },
            replace: this.replace.bind(this),
            search: this.searchParamsFromObject(this._currentParams)
        }
    }
}