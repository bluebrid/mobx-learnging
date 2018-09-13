import { asObservableObject, createPropDecorator, fail, invariant } from "../internal";
export function createDecoratorForEnhancer(enhancer) {
    invariant(enhancer);
    const decorator = createPropDecorator(true, (target, propertyName, descriptor, _decoratorTarget, decoratorArgs) => {
        if (process.env.NODE_ENV !== "production") {
            invariant(!descriptor || !descriptor.get, `@observable cannot be used on getter (property "${propertyName}"), use @computed instead.`);
        }
        const initialValue = descriptor
            ? descriptor.initializer
                ? descriptor.initializer.call(target)
                : descriptor.value
            : undefined;
        asObservableObject(target).addObservableProp(propertyName, initialValue, enhancer);
    });
    const res = 
    // Extra process checks, as this happens during module initialization
    typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production"
        ? function observableDecorator() {
            // This wrapper function is just to detect illegal decorator invocations, deprecate in a next version
            // and simply return the created prop decorator
            if (arguments.length < 2)
                return fail("Incorrect decorator invocation. @observable decorator doesn't expect any arguments");
            return decorator.apply(null, arguments);
        }
        : decorator;
    res.enhancer = enhancer;
    return res;
}
