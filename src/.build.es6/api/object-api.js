import { $mobx, endBatch, fail, getAdministration, invariant, isObservableArray, isObservableMap, isObservableObject, startBatch } from "../internal";
export function keys(obj) {
    if (isObservableObject(obj)) {
        return obj[$mobx].getKeys();
    }
    if (isObservableMap(obj)) {
        return Array.from(obj.keys());
    }
    if (isObservableArray(obj)) {
        return obj.map((_, index) => index);
    }
    return fail(process.env.NODE_ENV !== "production" &&
        "'keys()' can only be used on observable objects, arrays and maps");
}
export function values(obj) {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => obj[key]);
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => obj.get(key));
    }
    if (isObservableArray(obj)) {
        return obj.slice();
    }
    return fail(process.env.NODE_ENV !== "production" &&
        "'values()' can only be used on observable objects, arrays and maps");
}
export function entries(obj) {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => [key, obj[key]]);
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => [key, obj.get(key)]);
    }
    if (isObservableArray(obj)) {
        return obj.map((key, index) => [index, key]);
    }
    return fail(process.env.NODE_ENV !== "production" &&
        "'entries()' can only be used on observable objects, arrays and maps");
}
export function set(obj, key, value) {
    if (arguments.length === 2) {
        startBatch();
        const values = key;
        try {
            for (let key in values)
                set(obj, key, values[key]);
        }
        finally {
            endBatch();
        }
        return;
    }
    if (isObservableObject(obj)) {
        const adm = obj[$mobx];
        const existingObservable = adm.values.get(key);
        if (existingObservable) {
            adm.write(key, value);
        }
        else {
            adm.addObservableProp(key, value, adm.defaultEnhancer);
        }
    }
    else if (isObservableMap(obj)) {
        obj.set(key, value);
    }
    else if (isObservableArray(obj)) {
        if (typeof key !== "number")
            key = parseInt(key, 10);
        invariant(key >= 0, `Not a valid index: '${key}'`);
        startBatch();
        if (key >= obj.length)
            obj.length = key + 1;
        obj[key] = value;
        endBatch();
    }
    else {
        return fail(process.env.NODE_ENV !== "production" &&
            "'set()' can only be used on observable objects, arrays and maps");
    }
}
export function remove(obj, key) {
    if (isObservableObject(obj)) {
        ;
        obj[$mobx].remove(key);
    }
    else if (isObservableMap(obj)) {
        obj.delete(key);
    }
    else if (isObservableArray(obj)) {
        if (typeof key !== "number")
            key = parseInt(key, 10);
        invariant(key >= 0, `Not a valid index: '${key}'`);
        obj.splice(key, 1);
    }
    else {
        return fail(process.env.NODE_ENV !== "production" &&
            "'remove()' can only be used on observable objects, arrays and maps");
    }
}
export function has(obj, key) {
    if (isObservableObject(obj)) {
        // return keys(obj).indexOf(key) >= 0
        const adm = getAdministration(obj);
        return adm.has(key);
    }
    else if (isObservableMap(obj)) {
        return obj.has(key);
    }
    else if (isObservableArray(obj)) {
        return key >= 0 && key < obj.length;
    }
    else {
        return fail(process.env.NODE_ENV !== "production" &&
            "'has()' can only be used on observable objects, arrays and maps");
    }
}
export function get(obj, key) {
    if (!has(obj, key))
        return undefined;
    if (isObservableObject(obj)) {
        return obj[key];
    }
    else if (isObservableMap(obj)) {
        return obj.get(key);
    }
    else if (isObservableArray(obj)) {
        return obj[key];
    }
    else {
        return fail(process.env.NODE_ENV !== "production" &&
            "'get()' can only be used on observable objects, arrays and maps");
    }
}
