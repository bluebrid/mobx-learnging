import { globalState, isObservableArray, isObservableMap } from "../internal";
export const OBFUSCATED_ERROR = "An invariant failed, however the error is obfuscated because this is an production build.";
export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
export const EMPTY_OBJECT = {};
Object.freeze(EMPTY_OBJECT);
export function getNextId() {
    return ++globalState.mobxGuid;
}
export function fail(message) {
    invariant(false, message);
    throw "X"; // unreachable
}
export function invariant(check, message) {
    if (!check)
        throw new Error("[mobx] " + (message || OBFUSCATED_ERROR));
}
/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
const deprecatedMessages = [];
export function deprecated(msg, thing) {
    if (process.env.NODE_ENV === "production")
        return false;
    if (thing) {
        return deprecated(`'${msg}', use '${thing}' instead.`);
    }
    if (deprecatedMessages.indexOf(msg) !== -1)
        return false;
    deprecatedMessages.push(msg);
    console.error("[mobx] Deprecated: " + msg);
    return true;
}
/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func) {
    let invoked = false;
    return function () {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    };
}
export const noop = () => { };
export function unique(list) {
    const res = [];
    list.forEach(item => {
        if (res.indexOf(item) === -1)
            res.push(item);
    });
    return res;
}
export function isObject(value) {
    return value !== null && typeof value === "object";
}
export function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
export function makeNonEnumerable(object, propNames) {
    for (let i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]]);
    }
}
export function addHiddenProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    });
}
export function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value
    });
}
export function isPropertyConfigurable(object, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(object, prop);
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false);
}
export function assertPropertyConfigurable(object, prop) {
    if (process.env.NODE_ENV !== "production" && !isPropertyConfigurable(object, prop))
        fail(`Cannot make property '${prop.toString()}' observable, it is not configurable and writable in the target object`);
}
export function createInstanceofPredicate(name, clazz) {
    const propName = "isMobX" + name;
    clazz.prototype[propName] = true;
    return function (x) {
        return isObject(x) && x[propName] === true;
    };
}
/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x) {
    return Array.isArray(x) || isObservableArray(x);
}
export function isES6Map(thing) {
    return thing instanceof Map;
}
export function getMapLikeKeys(map) {
    if (isPlainObject(map))
        return Object.keys(map);
    if (Array.isArray(map))
        return map.map(([key]) => key);
    if (isES6Map(map) || isObservableMap(map))
        return Array.from(map.keys());
    return fail(`Cannot get keys from '${map}'`);
}
export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value;
}
