import { ObservableMap, ObservableValue, createDecoratorForEnhancer, createDynamicObservableObject, createObservableArray, deepEnhancer, extendObservable, fail, isES6Map, isObservable, isPlainObject, refStructEnhancer, referenceEnhancer, shallowEnhancer, getDefaultDecoratorFromObjectOptions, extendObservableObjectWithProperties } from "../internal";
// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
export const defaultCreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined,
    proxy: true
};
Object.freeze(defaultCreateObservableOptions);
function assertValidOption(key) {
    if (!/^(deep|name|defaultDecorator|proxy)$/.test(key))
        fail(`invalid option for (extend)observable: ${key}`);
}
export function asCreateObservableOptions(thing) {
    if (thing === null || thing === undefined)
        return defaultCreateObservableOptions;
    if (typeof thing === "string")
        return { name: thing, deep: true, proxy: true };
    if (process.env.NODE_ENV !== "production") {
        if (typeof thing !== "object")
            return fail("expected options object");
        Object.keys(thing).forEach(assertValidOption);
    }
    return thing;
}
export const deepDecorator = createDecoratorForEnhancer(deepEnhancer);
const shallowDecorator = createDecoratorForEnhancer(shallowEnhancer);
export const refDecorator = createDecoratorForEnhancer(referenceEnhancer);
const refStructDecorator = createDecoratorForEnhancer(refStructEnhancer);
function getEnhancerFromOptions(options) {
    return options.defaultDecorator
        ? options.defaultDecorator.enhancer
        : options.deep === false
            ? referenceEnhancer
            : deepEnhancer;
}
/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v, arg2, arg3) {
    // @observable someProp;
    if (typeof arguments[1] === "string") {
        return deepDecorator.apply(null, arguments);
    }
    // it is an observable already, done
    if (isObservable(v))
        return v;
    // something that can be converted and mutated?
    const res = isPlainObject(v)
        ? observable.object(v, arg2, arg3)
        : Array.isArray(v)
            ? observable.array(v, arg2)
            : isES6Map(v)
                ? observable.map(v, arg2)
                : v;
    // this value could be converted to a new observable data structure, return it
    if (res !== v)
        return res;
    // otherwise, just box it
    fail(process.env.NODE_ENV !== "production" &&
        `The provided value could not be converted into an observable. If you want just create an observable reference to the object use 'observable.box(value)'`);
}
const observableFactories = {
    box(value, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("box");
        const o = asCreateObservableOptions(options);
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name);
    },
    array(initialValues, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("array");
        const o = asCreateObservableOptions(options);
        return createObservableArray(initialValues, getEnhancerFromOptions(o), o.name);
    },
    map(initialValues, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("map");
        const o = asCreateObservableOptions(options);
        return new ObservableMap(initialValues, getEnhancerFromOptions(o), o.name);
    },
    object(props, decorators, options) {
        if (typeof arguments[1] === "string")
            incorrectlyUsedAsDecorator("object");
        const o = asCreateObservableOptions(options);
        if (o.proxy === false) {
            return extendObservable({}, props, decorators, o);
        }
        else {
            const defaultDecorator = getDefaultDecoratorFromObjectOptions(o);
            // base 添加了Atom 类型属性
            /**
             * 1.base对象，就是添加了一个Symbol("mobx administration"); 的属性， 类型是一个：ObservableObjectAdministration 对象
             * 2.
             */
            const base = extendObservable({}, undefined, undefined, o);
            const proxy = createDynamicObservableObject(base);
            extendObservableObjectWithProperties(proxy, props, decorators, defaultDecorator);
            return proxy;
        }
    },
    ref: refDecorator,
    shallow: shallowDecorator,
    deep: deepDecorator,
    struct: refStructDecorator
};
export const observable = createObservable;
// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(observableFactories).forEach(name => (observable[name] = observableFactories[name]));
function incorrectlyUsedAsDecorator(methodName) {
    fail(
    // process.env.NODE_ENV !== "production" &&
    `Expected one or two arguments to observable.${methodName}. Did you accidentally try to use observable.${methodName} as decorator?`);
}
