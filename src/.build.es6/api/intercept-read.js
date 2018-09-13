import { fail, getAdministration, isObservableArray, isObservableMap, isObservableObject, isObservableValue } from "../internal";
export function interceptReads(thing, propOrHandler, handler) {
    let target;
    if (isObservableMap(thing) || isObservableArray(thing) || isObservableValue(thing)) {
        target = getAdministration(thing);
    }
    else if (isObservableObject(thing)) {
        if (typeof propOrHandler !== "string")
            return fail(process.env.NODE_ENV !== "production" &&
                `InterceptReads can only be used with a specific property, not with an object in general`);
        target = getAdministration(thing, propOrHandler);
    }
    else {
        return fail(process.env.NODE_ENV !== "production" &&
            `Expected observable map, object or array as first array`);
    }
    if (target.dehancer !== undefined)
        return fail(process.env.NODE_ENV !== "production" && `An intercept reader was already established`);
    target.dehancer = typeof propOrHandler === "function" ? propOrHandler : handler;
    return () => {
        target.dehancer = undefined;
    };
}
