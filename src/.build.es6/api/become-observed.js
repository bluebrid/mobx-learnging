import { fail, getAtom } from "../internal";
export function onBecomeObserved(thing, arg2, arg3) {
    return interceptHook("onBecomeObserved", thing, arg2, arg3);
}
export function onBecomeUnobserved(thing, arg2, arg3) {
    return interceptHook("onBecomeUnobserved", thing, arg2, arg3);
}
function interceptHook(hook, thing, arg2, arg3) {
    const atom = typeof arg2 === "string" ? getAtom(thing, arg2) : getAtom(thing);
    const cb = typeof arg2 === "string" ? arg3 : arg2;
    const orig = atom[hook];
    if (typeof orig !== "function")
        return fail(process.env.NODE_ENV !== "production" && "Not an atom that can be (un)observed");
    atom[hook] = function () {
        orig.call(this);
        cb.call(this);
    };
    return function () {
        atom[hook] = orig;
    };
}
