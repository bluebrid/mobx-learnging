import { invariant, isPlainObject } from "../internal";
export function decorate(thing, decorators) {
    process.env.NODE_ENV !== "production" &&
        invariant(isPlainObject(decorators), "Decorators should be a key value map");
    const target = typeof thing === "function" ? thing.prototype : thing;
    for (let prop in decorators) {
        let propertyDecorators = decorators[prop];
        if (!Array.isArray(propertyDecorators)) {
            propertyDecorators = [propertyDecorators];
        }
        process.env.NODE_ENV !== "production" &&
            invariant(propertyDecorators.every(decorator => typeof decorator === "function"), `Decorate: expected a decorator function or array of decorator functions for '${prop}'`);
        const descriptor = Object.getOwnPropertyDescriptor(target, prop);
        const newDescriptor = propertyDecorators.reduce((accDescriptor, decorator) => decorator(target, prop, accDescriptor), descriptor);
        if (newDescriptor)
            Object.defineProperty(target, prop, newDescriptor);
    }
    return thing;
}
