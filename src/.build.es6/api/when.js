import { $mobx, autorun, createAction, fail, getNextId } from "../internal";
export function when(predicate, arg1, arg2) {
    if (arguments.length === 1 || (arg1 && typeof arg1 === "object"))
        return whenPromise(predicate, arg1);
    return _when(predicate, arg1, arg2 || {});
}
function _when(predicate, effect, opts) {
    let timeoutHandle;
    if (typeof opts.timeout === "number") {
        timeoutHandle = setTimeout(() => {
            if (!disposer[$mobx].isDisposed) {
                disposer();
                const error = new Error("WHEN_TIMEOUT");
                if (opts.onError)
                    opts.onError(error);
                else
                    throw error;
            }
        }, opts.timeout);
    }
    opts.name = opts.name || "When@" + getNextId();
    const effectAction = createAction(opts.name + "-effect", effect);
    const disposer = autorun(r => {
        if (predicate()) {
            r.dispose();
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            effectAction();
        }
    }, opts);
    return disposer;
}
function whenPromise(predicate, opts) {
    if (process.env.NODE_ENV !== "production" && opts && opts.onError)
        return fail(`the options 'onError' and 'promise' cannot be combined`);
    let cancel;
    const res = new Promise((resolve, reject) => {
        let disposer = _when(predicate, resolve, Object.assign({}, opts, { onError: reject }));
        cancel = () => {
            disposer();
            reject("WHEN_CANCELLED");
        };
    });
    res.cancel = cancel;
    return res;
}
