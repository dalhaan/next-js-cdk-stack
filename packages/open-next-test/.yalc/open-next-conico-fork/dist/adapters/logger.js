export function debug(...args) {
    if (process.env.OPEN_NEXT_DEBUG) {
        console.log(...args);
    }
}
