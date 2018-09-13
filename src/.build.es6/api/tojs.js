import { isObservable, isObservableArray, isObservableMap, isObservableObject, isObservableValue, keys } from "../internal";
const defaultOptions = {
    detectCycles: true,
    exportMapsAsObjects: true
};
function cache(map, key, value, options) {
    if (options.detectCycles)
        map.set(key, value);
    return value;
}
function toJSHelper(source, options, __alreadySeen) {
    if (!isObservable(source))
        return source;
    const detectCycles = options.detectCycles === true;
    if (detectCycles &&
        source !== null &&
        typeof source === "object" &&
        __alreadySeen.has(source)) {
        return __alreadySeen.get(source);
    }
    if (isObservableArray(source)) {
        const res = cache(__alreadySeen, source, [], options);
        const toAdd = source.map(value => toJSHelper(value, options, __alreadySeen));
        res.length = toAdd.length;
        for (let i = 0, l = toAdd.length; i < l; i++)
            res[i] = toAdd[i];
        return res;
    }
    if (isObservableObject(source)) {
        const res = cache(__alreadySeen, source, {}, options);
        keys(source); // make sure we track the keys of the object
        for (let key in source) {
            res[key] = toJSHelper(source[key], options, __alreadySeen);
        }
        return res;
    }
    if (isObservableMap(source)) {
        if (options.exportMapsAsObjects === false) {
            const res = cache(__alreadySeen, source, new Map(), options);
            source.forEach((value, key) => {
                res.set(key, toJSHelper(value, options, __alreadySeen));
            });
            return res;
        }
        else {
            const res = cache(__alreadySeen, source, {}, options);
            source.forEach((value, key) => {
                res[key] = toJSHelper(value, options, __alreadySeen);
            });
            return res;
        }
    }
    if (isObservableValue(source))
        return toJSHelper(source.get(), options, __alreadySeen);
    return source;
}
export function toJS(source, options) {
    if (!isObservable(source))
        return source;
    // backward compatibility
    if (typeof options === "boolean")
        options = { detectCycles: options };
    if (!options)
        options = defaultOptions;
    const detectCycles = options.detectCycles === true;
    let __alreadySeen;
    if (detectCycles)
        __alreadySeen = new Map();
    return toJSHelper(source, options, __alreadySeen);
}
