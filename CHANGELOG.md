# [V3.5.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v350-alpha)
## Features
- The Stack.Screen config prop now takes parameters to control gesture behaviour. These options were already available on the `Router` but now they can be configured on a per screen basis for example:
  - `minFlingVelocity`
  - `disableDiscovery`
  - `hysteresis`
  - `swipeAreaWidth`

With the addition of a new config property available on both the `Router` and `Stack.Screen` components `swipeDirection`. This option allows you to define a direction of either `left`, `right`, `up` or `down` in which the user can swipe to trigger a gesture navigation. The default is `right`.

- It is now possible to offer custom animation keyframes and options to both `Stack.Screen` and `Router` components. These are just normal WAAPI keyframes and options but allow for more novel approaches to transitions and layouts with react-motion-router.
- `Stack.Screen` config also comes with a new option `keepAlive`. This keeps the screen attached to the DOM tree after navigating to another screen. In other words when this screen is the previous in the stack it will still be attached to the DOM tree. It will be removed if it is back navigated as the current screen or the other screen navigates forward.
- It is now possible to use the `Anchor` component as a back navigator. Simply pass the `goBack` boolean prop.


## Enhancements
- Previously screens were animated and the computed styles were applied using fill modes. This has been removed in favour of the `animation.commitStyles()` API. This has allowed from much smoother animations overall. I have no idea why I can only say fill modes are really weird.
- More gesture directions have been added as outlined in features section.

## Bug Fixes
- Before screen transitions were interrupted if the user gestured between them. This has been fixed by disabling gestures during screen transitions.
- The rubberbanding bug that would occur when you did a really fast cancel gesture near the opposite edge has been patched. This bug would cause the animation to run from 0 instead of where the user released.

# [V3.4.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v340-alpha)
## Features
- New `GestureRegion` component for wrapping gesture sensitive components. React Motion Router will ignore navigation gestures that overlap these regions.

## Enhancements
- Added React Motion Router events to the global event listeners interface. Meaning now you get code completion when writing any of these event handlers:
  - `page-animation-start`
  - `page-animation-end`
  - `motion-progress-start`
  - `motion-progress`
  - `motion-progress-end`
- Fallback components now have access to route parameters just like the actual component.

## Bug Fixes
- Fixed a bug that made navigation impossible after a gesture navigation when browser routing is enabled.


# [V3.3.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v330-alpha)
## Features
- new `useNavigation` hook for accessing the navigation object anywhere in your component tree.

## Enhancements
- Changed the location property on the navigation object to better reflect the capabilities of the navigation object rather than the window. This means you can still use methods like `'assign'`, `'replace'` etc. but under the hood they will now use the navigation primitives provided by the navigation object itself. For you this will mean you get smooth transitions even when using methods like replace on `navigation.location`.
- The search part of `navigation.location` will now mirror the current screen's params.
- The `Anchor` component has been changed to more cloesly mirror the HTML `a` tag. You can pass route name strings or fully qualified URLs to its href prop. In the latter case it will behave as a normal link if and only if the origin that it points to is not the same as the app's origin. You can also pass route params directly to the component as an object to the optional params prop. These params will be automatically serialised and appended as the search part of the URL.

# [V3.0.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v300-alpha)
# Breaking Changes
#### We've upgraded to React 18! ????
I haven't taken full advantage of the new features available in the latest version of React. I was primarily focused on migrating the existing library to the new version of React. This included some breaking changes of course.

If you find any bugs you think may be related to migration feel free to open an issue.

## Features
- `Stack.Screen` now supports components imported using `React.lazy()`. You can pass a fallback component similar to how you pass a fallback component to `React.Suspense`. What happens is screens now use `React.Suspense` under the hood. The fallback component will animate while the lazy component loads over the network. Essentially you can now split your projects up on a page by page basis. Once each page has been routed to once however they typically stay in memory just as if they were all downloaded on page load. What is downloaded on the client on page load is essentially only what is absolutely necessary (using this pattern).

- You can now pass a `paramsSerialiser` and `paramsDeserialiser` function to the `Router` config prop. This is useful for when you want to have your screen parameters in a specific format when they are parsed from the search part of the page url on page load. 

## Enhancements

- When animation was set to none the progress was `NaN`. This has been rectified in version 3.0.0.
- SharedElement updates are now cancelable ensuring only the latest updates are processed.
- The library has been bundled using webpack such that packaging is a little tighter. There is still a long way to go here so be sure to look out for the latest version.

# [V2.3.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v230-alpha)
## Features
- Added RegExp as possible path prop to ```Stack.Screen```. Now you can create a route that matches multiple pathnames for example:
```
  <Stack.Screen component={EmailPage} path={/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/} />
```
Will match any pathname that resembles an email. Unlike React Router V6 the order of components inside the Router component matters. Smart route matching should be in a future release.
- Path prop to ```Stack.Screen``` is now also optional meaning if you omit defining a valid path prop the component is only rendered when all other possible pathname matches fail. This would be useful for defining 404 pages for example.

# [V2.2.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v220-alpha)
## Features
- Added AnimationConfigFactory to ```Stack.Screen``` animation config prop. This is a function that returns an AnimationConfig object whose parameters are the pathname for the now outgoing element and the pathname for the now incoming element. Now you can dyanically create animations based on the outgoing pathname and the incoming pathname. E.g.
```
        <Stack.Screen
          path={"/tiles"}
          component={Tiles}
          config={{
            animation: (currentPath, nextPath) => {
              if (currentPath === "/tiles" && nextPath === "/slides") {
                return {
                    type: 'fade',
                    duration: 350
                };
              }
              return { // Also in and out animations can be set independently
                  in: {
                        type: 'slide',
                        direction: 'right',
                        duration: 350
                  },
                  out: {
                      type: 'fade',
                      duration: 200
                  }
              };
            }
          }}
        />
```

# [V2.1.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v210-alpha)
## Features
- Option to enable memory routing meaning instead of relying on the ```popstate``` event and the browser ```window.location``` routing is done completely in memory. One thing to note is that ```window.location.pathname``` will always be ```'/'``` so it is better to just check location on the navigator prop passed to your screen. Essentially it's just ```window.location``` with pathname being filled in from memory.


# [V2.0.0-alpha](https://github.com/nxtexe/react-motion-router/blob/main/CHANGELOG.md#v200-alpha)

## Features

- Gesture Navigation is the new feature on the block. It is enabled by default but there is a config option to disable it; you may want to do this for platforms such as iOS since there is no way to disable the native gesture navigation. You could alternatively change the swipe area width config option to capture gesture navigations before the system does but this depends on what the user is used to so be careful. For now gesturing only works from the leftmost part of the screen for back navigation.
- Tranisition Linked Animations have also been added. Use the new ```Motion``` context to subscribe to changes in page transition progress (0-100). Shared Element Transitions are also linked to the page transition and the page transition is also linked to the user gesture progress meaning you can now hold transitions.

## Enhancements

-  Snake case has been removed and refactored in favour of camel case. After consulting [Javascript Standard Style](https://standardjs.com/rules.html) I made sure to change that mistake. Coming from python it was just a force of habit :). This does break code using the older versions of the library hence the major version changing.
- The official logo has been added to the repo ????.
- Added fade, fade-through, cross-fade transition types to SharedElement.
- Switched from CSSTransitionGroup to WAAPI