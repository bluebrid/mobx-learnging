import { $mobx, Atom, EMPTY_ARRAY, addHiddenFinalProp, checkIfStateModificationsAreAllowed, createInstanceofPredicate, fail, getNextId, hasInterceptors, hasListeners, interceptChange, isObject, isSpyEnabled, notifyListeners, registerInterceptor, registerListener, spyReportEnd, spyReportStart, allowStateChangesStart, allowStateChangesEnd } from "../internal";
const MAX_SPLICE_SIZE = 10000; // See e.g. https://github.com/mobxjs/mobx/issues/859
const arrayTraps = {
    get(target, name) {
        if (name === $mobx)
            return target[$mobx];
        if (name === "length")
            return target[$mobx].getArrayLength();
        if (typeof name === "number") {
            return arrayExtensions.get.call(target, name);
        }
        if (typeof name === "string" && !isNaN(name)) {
            return arrayExtensions.get.call(target, parseInt(name));
        }
        if (arrayExtensions.hasOwnProperty(name)) {
            return arrayExtensions[name];
        }
        return target[name];
    },
    set(target, name, value) {
        if (name === "length") {
            target[$mobx].setArrayLength(value);
            return true;
        }
        if (typeof name === "number") {
            arrayExtensions.set.call(target, name, value);
            return true;
        }
        if (!isNaN(name)) {
            arrayExtensions.set.call(target, parseInt(name), value);
            return true;
        }
        return false;
    },
    preventExtensions(target) {
        fail(`Observable arrays cannot be frozen`);
        return false;
    }
};
export function createObservableArray(initialValues, enhancer, name = "ObservableArray@" + getNextId(), owned = false) {
    const adm = new ObservableArrayAdministration(name, enhancer, owned);
    addHiddenFinalProp(adm.values, $mobx, adm);
    const proxy = new Proxy(adm.values, arrayTraps);
    adm.proxy = proxy;
    if (initialValues && initialValues.length) {
        const prev = allowStateChangesStart(true);
        adm.spliceWithArray(0, 0, initialValues);
        allowStateChangesEnd(prev);
    }
    return proxy;
}
class ObservableArrayAdministration {
    constructor(name, enhancer, owned) {
        this.owned = owned;
        this.values = [];
        this.proxy = undefined;
        this.lastKnownLength = 0;
        this.atom = new Atom(name || "ObservableArray@" + getNextId());
        this.enhancer = (newV, oldV) => enhancer(newV, oldV, name + "[..]");
    }
    dehanceValue(value) {
        if (this.dehancer !== undefined)
            return this.dehancer(value);
        return value;
    }
    dehanceValues(values) {
        if (this.dehancer !== undefined && this.values.length > 0)
            return values.map(this.dehancer);
        return values;
    }
    intercept(handler) {
        return registerInterceptor(this, handler);
    }
    observe(listener, fireImmediately = false) {
        if (fireImmediately) {
            listener({
                object: this.proxy,
                type: "splice",
                index: 0,
                added: this.values.slice(),
                addedCount: this.values.length,
                removed: [],
                removedCount: 0
            });
        }
        return registerListener(this, listener);
    }
    getArrayLength() {
        this.atom.reportObserved();
        return this.values.length;
    }
    setArrayLength(newLength) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobx.array] Out of range: " + newLength);
        let currentLength = this.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength) {
            const newItems = new Array(newLength - currentLength);
            for (let i = 0; i < newLength - currentLength; i++)
                newItems[i] = undefined; // No Array.fill everywhere...
            this.spliceWithArray(currentLength, 0, newItems);
        }
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    }
    updateArrayLength(oldLength, delta) {
        if (oldLength !== this.lastKnownLength)
            throw new Error("[mobx] Modification exception: the internal structure of an observable array was changed.");
        this.lastKnownLength += delta;
    }
    spliceWithArray(index, deleteCount, newItems) {
        checkIfStateModificationsAreAllowed(this.atom);
        const length = this.values.length;
        if (index === undefined)
            index = 0;
        else if (index > length)
            index = length;
        else if (index < 0)
            index = Math.max(0, length + index);
        if (arguments.length === 1)
            deleteCount = length - index;
        else if (deleteCount === undefined || deleteCount === null)
            deleteCount = 0;
        else
            deleteCount = Math.max(0, Math.min(deleteCount, length - index));
        if (newItems === undefined)
            newItems = EMPTY_ARRAY;
        if (hasInterceptors(this)) {
            const change = interceptChange(this, {
                object: this.proxy,
                type: "splice",
                index,
                removedCount: deleteCount,
                added: newItems
            });
            if (!change)
                return EMPTY_ARRAY;
            deleteCount = change.removedCount;
            newItems = change.added;
        }
        newItems = newItems.length === 0 ? newItems : newItems.map(v => this.enhancer(v, undefined));
        if (process.env.NODE_ENV !== "production") {
            const lengthDelta = newItems.length - deleteCount;
            this.updateArrayLength(length, lengthDelta); // checks if internal array wasn't modified
        }
        const res = this.spliceItemsIntoValues(index, deleteCount, newItems);
        if (deleteCount !== 0 || newItems.length !== 0)
            this.notifyArraySplice(index, newItems, res);
        return this.dehanceValues(res);
    }
    spliceItemsIntoValues(index, deleteCount, newItems) {
        if (newItems.length < MAX_SPLICE_SIZE) {
            return this.values.splice(index, deleteCount, ...newItems);
        }
        else {
            const res = this.values.slice(index, index + deleteCount);
            this.values = this.values
                .slice(0, index)
                .concat(newItems, this.values.slice(index + deleteCount));
            return res;
        }
    }
    notifyArrayChildUpdate(index, newValue, oldValue) {
        const notifySpy = !this.owned && isSpyEnabled();
        const notify = hasListeners(this);
        const change = notify || notifySpy
            ? {
                object: this.proxy,
                type: "update",
                index,
                newValue,
                oldValue
            }
            : null;
        // The reason why this is on right hand side here (and not above), is this way the uglifier will drop it, but it won't
        // cause any runtime overhead in development mode without NODE_ENV set, unless spying is enabled
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportStart(Object.assign({}, change, { name: this.atom.name }));
        this.atom.reportChanged();
        if (notify)
            notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportEnd();
    }
    notifyArraySplice(index, added, removed) {
        const notifySpy = !this.owned && isSpyEnabled();
        const notify = hasListeners(this);
        const change = notify || notifySpy
            ? {
                object: this.proxy,
                type: "splice",
                index,
                removed,
                added,
                removedCount: removed.length,
                addedCount: added.length
            }
            : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportStart(Object.assign({}, change, { name: this.atom.name }));
        this.atom.reportChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (notify)
            notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
            spyReportEnd();
    }
}
const arrayExtensions = {
    intercept(handler) {
        return this[$mobx].intercept(handler);
    },
    observe(listener, fireImmediately = false) {
        const adm = this[$mobx];
        return adm.observe(listener, fireImmediately);
    },
    clear() {
        return this.splice(0);
    },
    replace(newItems) {
        const adm = this[$mobx];
        return adm.spliceWithArray(0, adm.values.length, newItems);
    },
    /**
     * Converts this array back to a (shallow) javascript structure.
     * For a deep clone use mobx.toJS
     */
    toJS() {
        return this.slice();
    },
    toJSON() {
        // Used by JSON.stringify
        return this.toJS();
    },
    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index, deleteCount, ...newItems) {
        const adm = this[$mobx];
        switch (arguments.length) {
            case 0:
                return [];
            case 1:
                return adm.spliceWithArray(index);
            case 2:
                return adm.spliceWithArray(index, deleteCount);
        }
        return adm.spliceWithArray(index, deleteCount, newItems);
    },
    spliceWithArray(index, deleteCount, newItems) {
        const adm = this[$mobx];
        return adm.spliceWithArray(index, deleteCount, newItems);
    },
    push(...items) {
        const adm = this[$mobx];
        adm.spliceWithArray(adm.values.length, 0, items);
        return adm.values.length;
    },
    pop() {
        return this.splice(Math.max(this[$mobx].values.length - 1, 0), 1)[0];
    },
    shift() {
        return this.splice(0, 1)[0];
    },
    unshift(...items) {
        const adm = this[$mobx];
        adm.spliceWithArray(0, 0, items);
        return adm.values.length;
    },
    reverse() {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        // so we deviate from the default and just make it an dervitation
        if (process.env.NODE_ENV !== "production") {
            console.warn("[mobx] `observableArray.reverse()` will not update the array in place. Use `observableArray.slice().reverse()` to supress this warning and perform the operation on a copy, or `observableArray.replace(observableArray.slice().reverse())` to reverse & update in place");
        }
        const clone = this.slice();
        return clone.reverse.apply(clone, arguments);
    },
    sort(compareFn) {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        if (process.env.NODE_ENV !== "production") {
            console.warn("[mobx] `observableArray.sort()` will not update the array in place. Use `observableArray.slice().sort()` to supress this warning and perform the operation on a copy, or `observableArray.replace(observableArray.slice().sort())` to sort & update in place");
        }
        const clone = this.slice();
        return clone.sort.apply(clone, arguments);
    },
    remove(value) {
        const adm = this[$mobx];
        const idx = adm.dehanceValues(adm.values).indexOf(value);
        if (idx > -1) {
            this.splice(idx, 1);
            return true;
        }
        return false;
    },
    get(index) {
        const adm = this[$mobx];
        if (adm) {
            if (index < adm.values.length) {
                adm.atom.reportObserved();
                return adm.dehanceValue(adm.values[index]);
            }
            console.warn(`[mobx.array] Attempt to read an array index (${index}) that is out of bounds (${adm.values.length}). Please check length first. Out of bound indices will not be tracked by MobX`);
        }
        return undefined;
    },
    set(index, newValue) {
        const adm = this[$mobx];
        const values = adm.values;
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(adm.atom);
            const oldValue = values[index];
            if (hasInterceptors(adm)) {
                const change = interceptChange(adm, {
                    type: "update",
                    object: this,
                    index,
                    newValue
                });
                if (!change)
                    return;
                newValue = change.newValue;
            }
            newValue = adm.enhancer(newValue, oldValue);
            const changed = newValue !== oldValue;
            if (changed) {
                values[index] = newValue;
                adm.notifyArrayChildUpdate(index, newValue, oldValue);
            }
        }
        else if (index === values.length) {
            // add a new item
            adm.spliceWithArray(index, 0, [newValue]);
        }
        else {
            // out of bounds
            throw new Error(`[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`);
        }
    }
};
[
    "concat",
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
    "toString",
    "toLocaleString"
].forEach(funcName => {
    arrayExtensions[funcName] = function () {
        const adm = this[$mobx];
        adm.atom.reportObserved();
        const res = adm.dehanceValues(adm.values);
        return res[funcName].apply(res, arguments);
    };
});
const isObservableArrayAdministration = createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);
export function isObservableArray(thing) {
    return isObject(thing) && isObservableArrayAdministration(thing[$mobx]);
}
