import { IDerivationState, createInstanceofPredicate, endBatch, getNextId, noop, onBecomeObserved, onBecomeUnobserved, propagateChanged, reportObserved, startBatch } from "../internal";
export const $mobx = Symbol("mobx administration");
export class Atom {
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(name = "Atom@" + getNextId()) {
        this.name = name;
        this.isPendingUnobservation = false; // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
        this.isBeingObserved = false;
        this.observers = new Set();
        this.diffValue = 0;
        this.lastAccessedBy = 0;
        this.lowestObserverState = IDerivationState.NOT_TRACKING;
    }
    onBecomeUnobserved() {
        // noop
    }
    onBecomeObserved() {
        /* noop */
    }
    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     */
    reportObserved() {
        return reportObserved(this);
    }
    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
    reportChanged() {
        startBatch();
        propagateChanged(this);
        endBatch();
    }
    toString() {
        return this.name;
    }
}
export const isAtom = createInstanceofPredicate("Atom", Atom);
export function createAtom(name, onBecomeObservedHandler = noop, onBecomeUnobservedHandler = noop) {
    const atom = new Atom(name);
    onBecomeObserved(atom, onBecomeObservedHandler);
    onBecomeUnobserved(atom, onBecomeUnobservedHandler);
    return atom;
}
