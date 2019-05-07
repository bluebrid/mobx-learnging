import { ComputedValue, IDerivationState, TraceMode, getDependencyTree, globalState, runReactions } from "../internal";
export function hasObservers(observable) {
    return observable.observers && observable.observers.size > 0;
}
export function getObservers(observable) {
    return observable.observers;
}

export function addObserver(observable, node) {
    observable.observers.add(node);
    if (observable.lowestObserverState > node.dependenciesState)
        observable.lowestObserverState = node.dependenciesState;
}
export function removeObserver(observable, node) {
    observable.observers.delete(node);
    if (observable.observers.size === 0) {
        queueForUnobservation(observable);
    }
}
export function queueForUnobservation(observable) {
    if (observable.isPendingUnobservation === false) {
        observable.isPendingUnobservation = true;
        globalState.pendingUnobservations.push(observable);
    }
}
export function startBatch() {
    globalState.inBatch++;
}
export function endBatch() {
    if (--globalState.inBatch === 0) {
        // debugger
        // console.log(globalState)
        runReactions();
        // the batch is actually about to finish, all unobserving should happen here.
        const list = globalState.pendingUnobservations;
        for (let i = 0; i < list.length; i++) {
            const observable = list[i];
            observable.isPendingUnobservation = false;
            if (observable.observers.size === 0) {
                if (observable.isBeingObserved) {
                    // if this observable had reactive observers, trigger the hooks
                    observable.isBeingObserved = false;
                    observable.onBecomeUnobserved();
                }
                if (observable instanceof ComputedValue) {
                    observable.suspend();
                }
            }
        }
        globalState.pendingUnobservations = [];
    }
}
export function reportObserved(observable) {
    // observable 是一个ObservableValue 实例对象， 是在调用observable 方法时，将每个原始对象的属性装饰生成的一个对象
    // 是调用被观察对象的某个属性时会调用这个方法
    const derivation = globalState.trackingDerivation;
    debugger
    // console.log(globalState)
    if (derivation !== null) {
        if (derivation.runId !== observable.lastAccessedBy) {
            observable.lastAccessedBy = derivation.runId;
            // derivation 是一个Reaction(反应)实例对象，是在autorun 方法运行是创建的一个对象
            // 将observable 赋值给derivation.newObserving，因为Javascript 中对象是一个引用对象，
            // 所以其实derivation.newObserving 就是引用observable的地址
            // 这样就将observable 加工的对象和autorun 方法关联起来了
            derivation.newObserving[derivation.unboundDepsCount++] = observable;
            if (!observable.isBeingObserved) {
                observable.isBeingObserved = true;
                observable.onBecomeObserved();
            }
        }
        return true;
    }
    else if (observable.observers.size === 0 && globalState.inBatch > 0) {
        queueForUnobservation(observable);
    }
    return false;
}
export function propagateChanged(observable) {
    if (observable.lowestObserverState === IDerivationState.STALE)
        return;
    observable.lowestObserverState = IDerivationState.STALE;
    observable.observers.forEach(d => {
        if (d.dependenciesState === IDerivationState.UP_TO_DATE) {
            if (d.isTracing !== TraceMode.NONE) {
                logTraceInfo(d, observable);
            }
            d.onBecomeStale();
        }
        d.dependenciesState = IDerivationState.STALE;
    });
}
export function propagateChangeConfirmed(observable) {
    if (observable.lowestObserverState === IDerivationState.STALE)
        return;
    observable.lowestObserverState = IDerivationState.STALE;
    observable.observers.forEach(d => {
        if (d.dependenciesState === IDerivationState.POSSIBLY_STALE)
            d.dependenciesState = IDerivationState.STALE;
        else if (d.dependenciesState === IDerivationState.UP_TO_DATE // this happens during computing of `d`, just keep lowestObserverState up to date.
        )
            observable.lowestObserverState = IDerivationState.UP_TO_DATE;
    });
}
export function propagateMaybeChanged(observable) {
    if (observable.lowestObserverState !== IDerivationState.UP_TO_DATE)
        return;
    observable.lowestObserverState = IDerivationState.POSSIBLY_STALE;
    observable.observers.forEach(d => {
        if (d.dependenciesState === IDerivationState.UP_TO_DATE) {
            d.dependenciesState = IDerivationState.POSSIBLY_STALE;
            if (d.isTracing !== TraceMode.NONE) {
                logTraceInfo(d, observable);
            }
            d.onBecomeStale();
        }
    });
}
function logTraceInfo(derivation, observable) {
    console.log(`[mobx.trace] '${derivation.name}' is invalidated due to a change in: '${observable.name}'`);
    if (derivation.isTracing === TraceMode.BREAK) {
        const lines = [];
        printDepTree(getDependencyTree(derivation), lines, 1);
        // prettier-ignore
        new Function(`debugger;
/*
Tracing '${derivation.name}'

You are entering this break point because derivation '${derivation.name}' is being traced and '${observable.name}' is now forcing it to update.
Just follow the stacktrace you should now see in the devtools to see precisely what piece of your code is causing this update
The stackframe you are looking for is at least ~6-8 stack-frames up.

${derivation instanceof ComputedValue ? derivation.derivation.toString() : ""}

The dependencies for this derivation are:

${lines.join("\n")}
*/
    `)();
    }
}
function printDepTree(tree, lines, depth) {
    if (lines.length >= 1000) {
        lines.push("(and many more)");
        return;
    }
    lines.push(`${new Array(depth).join("\t")}${tree.name}`); // MWE: not the fastest, but the easiest way :)
    if (tree.dependencies)
        tree.dependencies.forEach(child => printDepTree(child, lines, depth + 1));
}
