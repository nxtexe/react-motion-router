import assert from 'assert';
import React, {createContext} from 'react';
import {get_css_text, clamp} from '../common/utils';

namespace SharedElement {
    interface SharedElementNode {
        id: string;
        node: Node;
        instance: SharedElement;
    }
    
    interface SharedElementState {
    
    }
    interface SharedElementProps {
        id: string | number;
        children: React.ReactChild;
    }
    
    export interface Map {
        [key:string]: {
            node: Node;
            computed_styles: CSSStyleDeclaration;
            client_rect: DOMRect;
        };
    }

    export interface NodeMap {
        [key:string]: SharedElementNode;
    }
    export interface RegisterEvent {
        reject: (reason?: any) => void;
        resolve: (value: boolean | PromiseLike<boolean>) => void;
        elements_map: Map;
    }

    export class Scene {
        private _nodes: NodeMap = {};
        private _name: string = '';
        constructor(name: string) {
            this._name = name;
        }
        add_node(node: SharedElementNode) {
            assert(!Object.keys(this.nodes).includes(node.id), "Duplicate Shared Element ID");
            this._nodes[node.id] = node;
            // if (node.id === "saitama") {
            //     console.log(this.name, "added:", node.id);
            // }
        }

        remove_node(node: SharedElementNode) {
            delete this._nodes[node.id];
            // if (node.id === "saitama") {
            //     console.log(this.name, "removed:", node.id, "; Scene empty?:", this.is_empty());
            // }
        }

        get nodes(): NodeMap {
            return this._nodes;
        }

        get name(): string {
            return this._name;
        }
        is_empty() {
            return !Object.keys(this._nodes).length ? true : false;
        }
    }

    export const SceneContext = createContext<Scene | null>(null);

    export function end_transition(elements_map: Map) {
        return new Promise<boolean>((resolve, reject) => {
            const end_transition_event = new CustomEvent<RegisterEvent>('end-shared-elements', {
                detail: {
                    elements_map: elements_map,
                    resolve: resolve,
                    reject: reject
                }
            });

            window.dispatchEvent(end_transition_event);
        });
    }

    export function start_transition(elements_map: Map) {
        return new Promise<boolean>((resolve, reject) => {
            const start_transition_event = new CustomEvent<RegisterEvent>('start-shared-elements', {
                detail: {
                    elements_map: elements_map,
                    resolve: resolve,
                    reject: reject
                }
            });

            window.dispatchEvent(start_transition_event);
        });
    }

    function node_from_ref(
        id: string,
        ref: Element,
        instance: SharedElement.SharedElement
    ): SharedElementNode {
        const node = ref.cloneNode(true);
        const computed_style = instance.computed_style;
        const client_rect = instance.client_rect;
        (node.firstChild as HTMLElement).style.cssText = get_css_text(computed_style);
        (node.firstChild as HTMLElement).style.transform = `translate(${clamp(client_rect.x, 0)}px, ${clamp(client_rect.y, 0)}px)`;
        (node.firstChild as HTMLElement).style.willChange = 'transform';
        (node as HTMLElement).style.position = 'absolute';
        /**
         * TODO:
         * 1. If animation type is slide change translate to either translateX or translateY depending on the slide direction
         * i.e. if slide is horizontal (left|right) change to translateY or if slide is vertical (up|down) change to translateX
         * 
         * 2. Compensate for travel distance due to window scroll position
         */
        return {
            id: id,
            node: node,
            instance: instance
        };
    }
    export class SharedElement extends React.Component<SharedElementProps, SharedElementState> {
        private _id : string = this.props.id.toString();
        private ref: HTMLDivElement | null = null;
        private scene: Scene | null = null;
        private _hidden: boolean = false;
        private _is_mounted: boolean = false;
    
        get client_rect() {
            if (this.ref && this.ref.firstChild) {
                return (this.ref.firstChild as Element).getBoundingClientRect();
            }
            return new DOMRect();
        }
    
        get computed_style() {
            if (this.ref && this.ref.firstChild) {
                const computed_styles = window.getComputedStyle((this.ref.firstChild as Element));
                
                return computed_styles;
            }
            return new CSSStyleDeclaration();
        }
    
        get css_text() {
            const computed_style = this.computed_style;
            if (computed_style) return get_css_text(computed_style);
            return '';
        }
    
        get id() {
            return this._id;
        }

        get hidden() {
            return this._hidden;
        }

        set hidden(_hidden: boolean) {
            this._hidden = _hidden;
            if (this._is_mounted) {
                this.forceUpdate();
            }
        }

        private set_ref(ref: HTMLDivElement | null) {
            if (this.ref !== ref) {
                if (this.ref) {
                    this.scene?.remove_node(node_from_ref(this._id, this.ref, this));
                }
                this.ref = ref;
                
                if (ref) {
                    this.scene?.add_node(node_from_ref(this._id, ref, this));
                }
            }
    
        }

        componentDidMount() {
            this._is_mounted = true;
        }
        componentDidUpdate() {
            if (this._id !== this.props.id) {
                if (this.ref) {
                    this.scene?.remove_node(node_from_ref(this._id, this.ref, this));
                    this._id = this.props.id.toString();
                    this.scene?.add_node(node_from_ref(this._id, this.ref, this));
                }
            }
        }
        componentWillUnmount() {
            this._is_mounted = false;
        }

        render() {
            return (
                <SceneContext.Consumer>
                    {(scene) => {
                        this.scene = scene;
                        return (
                            <div ref={this.set_ref.bind(this)} id={`shared-element-${this._id}`} className={"shared-element"} style={{opacity: this._hidden ? '0': '1'}}>
                                {this.props.children}
                            </div>
                        );
                    }}
                </SceneContext.Consumer>
            );
        }
    }
}


export default SharedElement;