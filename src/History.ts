export default class History {
    private _stack: string[] = [];
    private _next: string | null = null;
    private _defaultRoute: string = '/';
    constructor(_defaultRoute: string | null) {
        const pathname = window.location.pathname;
        const searchPart = window.location.search;
        if (_defaultRoute) {
            this._defaultRoute = _defaultRoute;
            if (this._defaultRoute !== window.location.pathname) {
                this._stack.push(this._defaultRoute);
                window.history.replaceState({}, "", this._defaultRoute);
                window.history.pushState({}, "", pathname + searchPart);
            }
        }
        this._stack.push(pathname);
    }

    set defaultRoute(_defaultRoute: string | null) {
        this._defaultRoute = _defaultRoute || '/';
    }

    get current() {
        return this._stack[this._stack.length - 1];
    }
    get length() {
        return this._stack.length;
    }

    get defaultRoute(): string {
        return this._defaultRoute || '/';
    }
    get next() {
        return this._next;
    }
    get previous() {
        if (this._stack.length > 1) {
            return this._stack[this._stack.length - 2];
        }
        return null;
    }
    get isEmpty() {
        return !this._stack.length ? true : false;
    }
    
    push(route: string, replace: boolean = false) {
        this._next = null;
        
        if (replace) {
            window.history.replaceState({}, "", route);
            this._stack.pop();
            this._stack.push(route);
        } else {
            window.history.pushState({}, "", route);
            this._stack.push(route);
        }
    }

    implicitPush(route: string, replace: boolean = false) {
        this._next = null; 
        if (replace) {
            this._stack.pop();
            this._stack.push(route);
        } else {
            this._stack.push(route);
        }
    }

    back(replaceState: boolean): string; // used so the default route will be at the top of the browser stack
    back(): string;
    back(replaceState?: boolean) {
        this._next = this._stack.pop() || null;
        
        if (replaceState && this._defaultRoute) {
            this._stack.push(this._defaultRoute);
            window.history.replaceState({}, "", this._defaultRoute);
        } else {
            window.history.back();
        }

        return this.previous;
    }

    implicitBack() {
        this._next = this._stack.pop() || null;

        return this.previous;
    }

    searchParamsToObject(searchPart: string) {
        const entries = new URLSearchParams(decodeURI(searchPart)).entries();
        const result: {[key:string]: string} = {};
        
        for(const [key, value] of entries) { // each 'entry' is a [key, value] tupple
            let parsedValue = '';
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                console.warn("Non JSON serialisable value was passed as URL route param.");
                parsedValue = value;
            }
            result[key] = parsedValue;
        }
        return Object.keys(result).length ? result : undefined;
    }
}