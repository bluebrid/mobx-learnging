import { $mobx, Atom, ComputedValue, ObservableValue, UNCHANGED, addHiddenProp, assertPropertyConfigurable, createInstanceofPredicate, deepEnhancer, endBatch, getNextId, hasInterceptors, hasListeners, initializeInstance, interceptChange, invariant, isObject, isPlainObject, isPropertyConfigurable, isSpyEnabled, notifyListeners, referenceEnhancer, registerInterceptor, registerListener, spyReportEnd, spyReportStart, startBatch } from "../internal";
export class ObservableObjectAdministration {
    constructor(target, values = new Map(), name, defaultEnhancer) {
        this.target = target;
        this.values = values;
        this.name = name;
        this.defaultEnhancer = defaultEnhancer;
        this.keysAtom = new Atom(name + ".keys");
    }
    read(key) {
        return this.values.get(key).get();
    }
    write(key, newValue) {
        const instance = this.target;
        const observable = this.values.get(key);
        if (observable instanceof ComputedValue) {
            observable.set(newValue);
            return;
        }
        // intercept
        if (hasInterceptors(this)) {
            const change = interceptChange(this, {
                type: "update",
                object: this.proxy || instance,
                name: key,
                newValue
            });
            if (!change)
                return;
            newValue = change.newValue;
        }
        newValue = observable.prepareNewValue(newValue);
        // notify spy & observers
        if (newValue !== UNCHANGED) {
            const notify = hasListeners(this);
            const notifySpy = isSpyEnabled();
            const change = notify || notifySpy
                ? {
                    type: "update",
                    object: this.proxy || instance,
                    oldValue: observable.value,
                    name: key,
                    newValue
                }
                : null;
            if (notifySpy && process.env.NODE_ENV !== "production")
                spyReportStart(Object.assign({}, change, { name: this.name, key }));
            observable.setNewValue(newValue);
            if (notify)
                notifyListeners(this, change);
            if (notifySpy && process.env.NODE_ENV !== "production")
                spyReportEnd();
        }
    }
    has(key) {
        if (this.values.get(key) instanceof ObservableValue)
            return true;
        else {
            this.waitForKey(key);
            return false;
        }
    }
    waitForKey(key) {
        const map = this.pendingKeys || (this.pendingKeys = new Map());
        let entry = map.get(key);
        if (!entry) {
            entry = new ObservableValue(false, referenceEnhancer, `${this.name}.${key.toString()}?`, false);
            map.set(key, entry);
        }
        entry.get(); // read to subscribe
    }
    addObservableProp(propName, newValue, enhancer = this.defaultEnhancer) {
        const { target } = this;
        assertPropertyConfigurable(target, propName);
        if (hasInterceptors(this)) {
            const change = interceptChange(this, {
                object: this.proxy || target,
                name: propName,
                type: "add",
                newValue
            });
            if (!change)
                return;
            newValue = change.newValue;
        }
        // 
        const observable = new ObservableValue(newValue, enhancer, `${this.name}.${propName}`, false);
        this.values.set(propName, observable);
        newValue = observable.value; // observableValue might have changed it
        Object.defineProperty(target, propName, generateObservablePropConfig(propName));
        this.notifyPropertyAddition(propName, newValue);
    }
    addComputedProp(propertyOwner, // where is the property declared?
    propName, options) {
        const { target } = this;
        options.name = options.name || `${this.name}.${propName}`;
        this.values.set(propName, new ComputedValue(options));
        if (propertyOwner === target || isPropertyConfigurable(propertyOwner, propName))
            Object.defineProperty(propertyOwner, propName, generateComputedPropConfig(propName));
    }
    remove(key) {
        if (!this.values.has(key))
            return;
        const { target } = this;
        if (hasInterceptors(this)) {
            const change = interceptChange(this, {
                object: this.proxy || target,
                name: key,
                type: "remove"
            });
            if (!change)
                return;
        }
        try {
            startBatch();
            const notify = hasListeners(this);
            const notifySpy = isSpyEnabled();
            const oldObservable = this.values.get(key);
            const oldValue = oldObservable && oldObservable.get();
            oldObservable && oldObservable.set(undefined);
            this.keysAtom.reportChanged();
            this.values.delete(key);
            delete this.target[key];
            const change = notify || notifySpy
                ? {
                    type: "remove",
                    object: this.proxy || target,
                    oldValue: oldValue,
                    name: key
                }
                : null;
            if (notifySpy && process.env.NODE_ENV !== "production")
                spyReportStart(Object.assign({}, change, { name: this.name, key }));
            if (notify)
                notifyListeners(this, change);
            if (notifySpy && process.env.NODE_ENV !== "production")
                spyReportEnd();
        }
        finally {
            endBatch();
        }
    }
    illegalAccess(owner, propName) {
        /**
         * This happens if a property is accessed through the prototype chain, but the property was
         * declared directly as own property on the prototype.
         *
         * E.g.:
         * class A {
         * }
         * extendObservable(A.prototype, { x: 1 })
         *
         * classB extens A {
         * }
         * console.log(new B().x)
         *
         * It is unclear whether the property should be considered 'static' or inherited.
         * Either use `console.log(A.x)`
         * or: decorate(A, { x: observable })
         *
         * When using decorate, the property will always be redeclared as own property on the actual instance
         */
        console.warn(`Property '${propName}' of '${owner}' was accessed through the prototype chain. Use 'decorate' instead to declare the prop or access it statically through it's owner`);
    }
    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe(callback, fireImmediately) {
        process.env.NODE_ENV !== "production" &&
            invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
        return registerListener(this, callback);
    }
    intercept(handler) {
        return registerInterceptor(this, handler);
    }
    notifyPropertyAddition(key, newValue) {
        const notify = hasListeners(this);
        const notifySpy = isSpyEnabled();
        const change = notify || notifySpy
            ? {
                type: "add",
                object: this.proxy || this.target,
                name: key,
                newValue
            }
            : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportStart(Object.assign({}, change, { name: this.name, key }));
        if (notify)
            notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportEnd();
        if (this.pendingKeys) {
            const entry = this.pendingKeys.get(key);
            if (entry)
                entry.set(true);
        }
        this.keysAtom.reportChanged();
    }
    getKeys() {
        this.keysAtom.reportObserved();
        // return Reflect.ownKeys(this.values) as any
        const res = [];
        for (const [key, value] of this.values)
            if (value instanceof ObservableValue)
                res.push(key);
        return res;
    }
}
export function asObservableObject(target, name = "", defaultEnhancer = deepEnhancer) {
    // debugger
    if (Object.prototype.hasOwnProperty.call(target, $mobx))
        return target[$mobx];
    process.env.NODE_ENV !== "production" &&
        invariant(Object.isExtensible(target), "Cannot make the designated object observable; it is not extensible");
    if (!isPlainObject(target))
        name = (target.constructor.name || "ObservableObject") + "@" + getNextId();
    if (!name)
        name = "ObservableObject@" + getNextId();
    const adm = new ObservableObjectAdministration(target, new Map(), name, defaultEnhancer);
    // 只是给target 添加一个$mobx的属性，其值是一个adm 的类型的值， 而且设置了enumerable: false, 就是不可以遍历
    addHiddenProp(target, $mobx, adm);
    return adm;
}
const observablePropertyConfigs = {};
const computedPropertyConfigs = {};
export function generateObservablePropConfig(propName) {
    return (observablePropertyConfigs[propName] ||
        (observablePropertyConfigs[propName] = {
            configurable: true,
            enumerable: true,
            get() {
                return this[$mobx].read(propName);
            },
            set(v) {
                this[$mobx].write(propName, v);
            }
        }));
}
function getAdministrationForComputedPropOwner(owner) {
    const adm = owner[$mobx];
    if (!adm) {
        // because computed props are declared on proty,
        // the current instance might not have been initialized yet
        initializeInstance(owner);
        return owner[$mobx];
    }
    return adm;
}
export function generateComputedPropConfig(propName) {
    return (computedPropertyConfigs[propName] ||
        (computedPropertyConfigs[propName] = {
            configurable: true,
            enumerable: false,
            get() {
                return getAdministrationForComputedPropOwner(this).read(propName);
            },
            set(v) {
                getAdministrationForComputedPropOwner(this).write(propName, v);
            }
        }));
}
const isObservableObjectAdministration = createInstanceofPredicate("ObservableObjectAdministration", ObservableObjectAdministration);
export function isObservableObject(thing) {
    if (isObject(thing)) {
        // Initializers run lazily when transpiling to babel, so make sure they are run...
        initializeInstance(thing);
        return isObservableObjectAdministration(thing[$mobx]);
    }
    return false;
}
