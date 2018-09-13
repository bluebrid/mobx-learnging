import { EMPTY_OBJECT, Reaction, action, comparer, getNextId, invariant, isAction } from "../internal";
/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(view, opts = EMPTY_OBJECT) {
    if (process.env.NODE_ENV !== "production") {
        invariant(typeof view === "function", "Autorun expects a function as first argument");
        invariant(isAction(view) === false, "Autorun does not accept actions since actions are untrackable");
    }
    const name = (opts && opts.name) || view.name || "Autorun@" + getNextId();
    const runSync = !opts.scheduler && !opts.delay;
    let reaction;
    if (runSync) {
        // normal autorun
        reaction = new Reaction(name, function () {
            this.track(reactionRunner);
        }, opts.onError);
    }
    else {
        const scheduler = createSchedulerFromOptions(opts);
        // debounced autorun
        let isScheduled = false;
        reaction = new Reaction(name, () => {
            if (!isScheduled) {
                isScheduled = true;
                scheduler(() => {
                    isScheduled = false;
                    if (!reaction.isDisposed)
                        reaction.track(reactionRunner);
                });
            }
        }, opts.onError);
    }
    function reactionRunner() {
        view(reaction);
    }
    reaction.schedule();
    return reaction.getDisposer();
}
const run = (f) => f();
function createSchedulerFromOptions(opts) {
    return opts.scheduler
        ? opts.scheduler
        : opts.delay
            ? (f) => setTimeout(f, opts.delay)
            : run;
}
export function reaction(expression, effect, opts = EMPTY_OBJECT) {
    if (process.env.NODE_ENV !== "production") {
        invariant(typeof expression === "function", "First argument to reaction should be a function");
        invariant(typeof opts === "object", "Third argument of reactions should be an object");
    }
    const name = opts.name || "Reaction@" + getNextId();
    const effectAction = action(name, opts.onError ? wrapErrorHandler(opts.onError, effect) : effect);
    const runSync = !opts.scheduler && !opts.delay;
    const scheduler = createSchedulerFromOptions(opts);
    let firstTime = true;
    let isScheduled = false;
    let value;
    const equals = opts.compareStructural
        ? comparer.structural
        : opts.equals || comparer.default;
    const r = new Reaction(name, () => {
        if (firstTime || runSync) {
            reactionRunner();
        }
        else if (!isScheduled) {
            isScheduled = true;
            scheduler(reactionRunner);
        }
    }, opts.onError);
    function reactionRunner() {
        isScheduled = false; // Q: move into reaction runner?
        if (r.isDisposed)
            return;
        let changed = false;
        r.track(() => {
            const nextValue = expression(r);
            changed = firstTime || !equals(value, nextValue);
            value = nextValue;
        });
        if (firstTime && opts.fireImmediately)
            effectAction(value, r);
        if (!firstTime && changed === true)
            effectAction(value, r);
        if (firstTime)
            firstTime = false;
    }
    r.schedule();
    return r.getDisposer();
}
function wrapErrorHandler(errorHandler, baseFn) {
    return function () {
        try {
            return baseFn.apply(this, arguments);
        }
        catch (e) {
            errorHandler.call(this, e);
        }
    };
}
