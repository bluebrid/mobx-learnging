import { $mobx, Atom, fail, mobxDidRunLazyInitializersSymbol, set } from "../internal";
function getAdm(target) {
    return target[$mobx];
}
// Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
// and skip either the internal values map, or the base object with its property descriptors!
const objectProxyTraps = {
    has(target, name) {
        if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
            return true;
        const adm = getAdm(target);
        if (adm.values.get(name))
            return true;
        if (typeof name === "string")
            return adm.has(name);
        return name in target;
    },
    get(target, name) {
        if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
            return target[name];
        const adm = getAdm(target);
        const observable = adm.values.get(name);
        if (observable instanceof Atom) {
            return observable.get();
        }
        if (typeof name === "string")
            adm.has(name);
        return target[name];
    },
    set(target, name, value) {
        if (typeof name !== "string")
            return false;
        set(target, name, value);
        return true;
    },
    deleteProperty(target, name) {
        if (typeof name !== "string")
            return false;
        const adm = getAdm(target);
        adm.remove(name);
        return true;
    },
    ownKeys(target) {
        const adm = getAdm(target);
        adm.keysAtom.reportObserved();
        return Reflect.ownKeys(target);
    },
    preventExtensions(target) {
        fail(`Dynamic observable objects cannot be frozen`);
        return false;
    }
};
export function createDynamicObservableObject(base) {
    const proxy = new Proxy(base, objectProxyTraps);
    base[$mobx].proxy = proxy;
    return proxy;
}
