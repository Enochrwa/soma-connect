export function cn(...classes) {
    return classes
        .flatMap((c) => {
        if (!c)
            return [];
        if (typeof c === "string")
            return [c];
        return Object.entries(c)
            .filter(([, v]) => v)
            .map(([k]) => k);
    })
        .join(" ");
}
