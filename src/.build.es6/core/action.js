import { endBatch, fail, globalState, invariant, isSpyEnabled, spyReportEnd, spyReportStart, startBatch, untrackedEnd, untrackedStart } from "../internal";
export function createAction(actionName, fn) {
    if (process.env.NODE_ENV !== "production") {
        invariant(typeof fn === "function", "`action` can only be invoked on functions");
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`);
    }
    const res = function () {
        return executeAction(actionName, fn, this, arguments);
    };
    res.isMobxAction = true;
    return res;
}
export function executeAction(actionName, fn, scope, args) {
    const runInfo = startAction(actionName, fn, scope, args);
    try {
        return fn.apply(scope, args);
    }
    finally {
        endAction(runInfo);
    }
}
function startAction(actionName, fn, scope, args) {
    const notifySpy = isSpyEnabled() && !!actionName;
    let startTime = 0;
    if (notifySpy && process.env.NODE_ENV !== "production") {
        startTime = Date.now();
        const l = (args && args.length) || 0;
        const flattendArgs = new Array(l);
        if (l > 0)
            for (let i = 0; i < l; i++)
                flattendArgs[i] = args[i];
        spyReportStart({
            type: "action",
            name: actionName,
            object: scope,
            arguments: flattendArgs
        });
    }
    const prevDerivation = untrackedStart();
    startBatch();
    const prevAllowStateChanges = allowStateChangesStart(true);
    return {
        prevDerivation,
        prevAllowStateChanges,
        notifySpy,
        startTime
    };
}
function endAction(runInfo) {
    allowStateChangesEnd(runInfo.prevAllowStateChanges);
    endBatch();
    untrackedEnd(runInfo.prevDerivation);
    if (runInfo.notifySpy && process.env.NODE_ENV !== "production")
        spyReportEnd({ time: Date.now() - runInfo.startTime });
}
export function allowStateChanges(allowStateChanges, func) {
    const prev = allowStateChangesStart(allowStateChanges);
    let res;
    try {
        res = func();
    }
    finally {
        allowStateChangesEnd(prev);
    }
    return res;
}
export function allowStateChangesStart(allowStateChanges) {
    const prev = globalState.allowStateChanges;
    globalState.allowStateChanges = allowStateChanges;
    return prev;
}
export function allowStateChangesEnd(prev) {
    globalState.allowStateChanges = prev;
}
