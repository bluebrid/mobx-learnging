import { deepEqual } from "../internal";
function identityComparer(a, b) {
    return a === b;
}
function structuralComparer(a, b) {
    return deepEqual(a, b);
}
function defaultComparer(a, b) {
    return Object.is(a, b);
}
export const comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer
};
